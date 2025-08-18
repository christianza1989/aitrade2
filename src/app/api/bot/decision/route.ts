import { NextRequest, NextResponse } from 'next/server';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';
import { MacroAnalyst, SentimentAnalyst, PositionManager } from '@/core/agents';
import { calculateRSI, calculateMACD, calculateSMAExported } from '@/core/indicators';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const configFilePath = path.join(process.cwd(), 'config.json');
const decisionLogPath = path.join(process.cwd(), 'decision_log.json');

async function getDecisionLog(): Promise<any> {
    try {
        const data = await fs.readFile(decisionLogPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveDecisionLog(log: any): Promise<void> {
    await fs.writeFile(decisionLogPath, JSON.stringify(log, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        const { symbol } = await request.json();
        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        console.log(`Decision trigger received for symbol: ${symbol}`);

        // Initialize services and agents
        const binance = new BinanceService();
        const portfolioService = new PortfolioService();
        const macroAnalyst = new MacroAnalyst();
        const sentimentAnalyst = new SentimentAnalyst();
        const positionManager = new PositionManager();

        // Load config and portfolio
        const configData = await fs.readFile(configFilePath, 'utf-8');
        const config = JSON.parse(configData);
        const portfolio = await portfolioService.getPortfolio();
        const position = portfolio.positions.find(p => p.symbol === symbol);

        if (!position) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }

        // Get current data
        const currentPrice = await binance.getCurrentPrice(symbol);
        if (!currentPrice) {
            return NextResponse.json({ error: 'Could not fetch current price' }, { status: 500 });
        }

        // These are simplified for the decision trigger, as a full analysis is not needed
        const macroAnalysis = await macroAnalyst.analyze({}, []);
        const sentimentAnalysis = await sentimentAnalyst.analyze([]);

        // Get decision history for the symbol
        const decisionLog = await getDecisionLog();
        const decisionHistory = decisionLog[symbol] || [];

        // Get technical data for the specific asset, ensuring resilience
        (position as any).technicals = {}; // Initialize as empty object
        const candles = await binance.getHistoricalData(symbol, '5m', 100);
        if (candles && candles.length > 0) {
            (position as any).technicals = {
                rsi: calculateRSI(candles, config.rsiPeriod)?.toFixed(2) || 'N/A',
                macdHistogram: calculateMACD(candles, config.macdShortPeriod, config.macdLongPeriod, config.macdSignalPeriod)?.histogram?.toFixed(4) || 'N/A',
                smaShort: calculateSMAExported(candles, config.smaShortPeriod)?.toFixed(2) || 'N/A',
                smaLong: calculateSMAExported(candles, config.smaLongPeriod)?.toFixed(2) || 'N/A',
            };
        }

        // Consult the Position Manager AI, now with memory and technicals
        const decisionResult = await positionManager.decide(
            position,
            currentPrice,
            macroAnalysis?.response,
            sentimentAnalysis?.response,
            config,
            decisionHistory
        );

        const decision = decisionResult?.response;

        // Log the new decision
        if (decision) {
            const newLogEntry = {
                timestamp: new Date().toISOString(),
                decision: decision.decision,
                justification: decision.justification,
                pnlPercent: (currentPrice - position.entryPrice) / position.entryPrice * 100,
                currentPrice: currentPrice,
            };
            decisionLog[symbol] = [...decisionHistory, newLogEntry];
            await saveDecisionLog(decisionLog);
        }
        if (decision?.decision === 'SELL_NOW') {
            const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
            const reason = pnlPercent <= config.stopLossPercent ? 'Stop Loss' : 'Take Profit';
            await portfolioService.sell(position.symbol, position.amount, currentPrice, { reason });
            console.log(`SOLD ${position.amount} of ${position.symbol} at ${currentPrice} (${reason})`);
            return NextResponse.json({ success: true, decision: 'SOLD', reason });
        } else if (decision?.decision === 'HOLD_AND_INCREASE_TP') {
            const updates = {
                takeProfitPercent: decision.new_take_profit_percent as number,
                holdCount: (position.holdCount || 0) + 1,
                stopLossPrice: position.entryPrice // Move SL to entry price
            };
            await portfolioService.updatePosition(position.symbol, updates);
            console.log(`HOLDING ${position.symbol}. New TP set to ${decision.new_take_profit_percent}%.`);
            return NextResponse.json({ success: true, decision: 'HELD', new_tp: decision.new_take_profit_percent });
        }

        return NextResponse.json({ success: true, decision: 'NO_ACTION' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in decision API: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
