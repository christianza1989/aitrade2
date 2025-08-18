import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { PortfolioService } from '@/core/portfolio';
import { MacroAnalyst, SentimentAnalyst, PositionManager } from '@/core/agents';
import { SharedContext } from '@/core/context';
import { calculateRSI, calculateMACD, calculateSMAExported } from '@/core/indicators';
import fs from 'fs/promises';
import path from 'path';

// Define interfaces for better type safety
interface DecisionLog {
    [symbol: string]: {
        timestamp: string;
        decision: string;
        justification: string;
        pnlPercent: number;
        currentPrice: number;
    }[];
}

// This should ideally be imported from where it's defined, e.g., '@/core/portfolio'
interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
    holdCount?: number;
    takeProfitPercent?: number;
    stopLossPrice?: number;
    technicals?: {
        rsi: string;
        macdHistogram: string;
        smaShort: string;
        smaLong: string;
    };
}

export const dynamic = 'force-dynamic';

const configFilePath = path.join(process.cwd(), 'config.json');
const decisionLogPath = path.join(process.cwd(), 'decision_log.json');

async function getDecisionLog(): Promise<DecisionLog> {
    try {
        const data = await fs.readFile(decisionLogPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveDecisionLog(log: DecisionLog): Promise<void> {
    await fs.writeFile(decisionLogPath, JSON.stringify(log, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.name) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const username = session.user.name;

        const { symbol } = await request.json();
        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        console.log(`Decision trigger received for symbol: ${symbol} for user: ${username}`);

        // Initialize services and agents
        const binance = new BinanceService();
        const portfolioService = new PortfolioService(username);
        const macroAnalyst = new MacroAnalyst();
        const sentimentAnalyst = new SentimentAnalyst();
        const positionManager = new PositionManager();

        // Load config and portfolio
        const configData = await fs.readFile(configFilePath, 'utf-8');
        const config = JSON.parse(configData);
        const portfolio = await portfolioService.getPortfolio();
        const position: Position | undefined = portfolio.positions.find((p: { symbol: string; }) => p.symbol === symbol);

        if (!position) {
            return NextResponse.json({ error: 'Position not found' }, { status: 404 });
        }

        // Get current data
        const currentPrice = await binance.getCurrentPrice(symbol);
        if (!currentPrice) {
            return NextResponse.json({ error: 'Could not fetch current price' }, { status: 500 });
        }

        // These are simplified for the decision trigger, as a full analysis is not needed
        const dummyContext = new SharedContext();
        const macroAnalysisResult = await macroAnalyst.analyze({}, [], dummyContext);
        const sentimentAnalysisResult = await sentimentAnalyst.analyze([], dummyContext);
        const macroAnalysis = macroAnalysisResult?.response;
        const sentimentAnalysis = sentimentAnalysisResult?.response;

        // Get decision history for the symbol
        const decisionLog = await getDecisionLog();
        const decisionHistory = decisionLog[symbol] || [];

        // Get technical data for the specific asset, ensuring resilience
        const candles = await binance.getHistoricalData(symbol, '5m', 100);
        if (candles && candles.length > 0) {
            position.technicals = {
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

        const decisionResponse = decisionResult?.response;

        // Type guard for the decision response
        const isDecisionResponse = (response: unknown): response is { decision: string; justification: string; new_take_profit_percent?: number } => {
            const res = response as { decision?: unknown; justification?: unknown };
            return (
                typeof response === 'object' &&
                response !== null &&
                'decision' in response &&
                'justification' in response &&
                typeof res.decision === 'string' &&
                typeof res.justification === 'string'
            );
        };

        // Log the new decision
        if (isDecisionResponse(decisionResponse)) {
            const newLogEntry = {
                timestamp: new Date().toISOString(),
                decision: decisionResponse.decision,
                justification: decisionResponse.justification,
                pnlPercent: (currentPrice - position.entryPrice) / position.entryPrice * 100,
                currentPrice: currentPrice,
            };
            decisionLog[symbol] = [...decisionHistory, newLogEntry];
            await saveDecisionLog(decisionLog);
        
            if (decisionResponse.decision === 'SELL_NOW') {
                const pnlPercent = (currentPrice - position.entryPrice) / position.entryPrice * 100;
                const reason = pnlPercent <= config.stopLossPercent ? 'Stop Loss' : 'Take Profit';
                await portfolioService.sell(position.symbol, position.amount, currentPrice, { reason });
                console.log(`SOLD ${position.amount} of ${position.symbol} at ${currentPrice} (${reason})`);
                return NextResponse.json({ success: true, decision: 'SOLD', reason });
            } else if (decisionResponse.decision === 'HOLD_AND_INCREASE_TP' && typeof decisionResponse.new_take_profit_percent === 'number') {
                const updates = {
                    takeProfitPercent: decisionResponse.new_take_profit_percent,
                    holdCount: (position.holdCount || 0) + 1,
                    stopLossPrice: position.entryPrice // Move SL to entry price
                };
                await portfolioService.updatePosition(position.symbol, updates);
                console.log(`HOLDING ${position.symbol}. New TP set to ${decisionResponse.new_take_profit_percent}%.`);
                return NextResponse.json({ success: true, decision: 'HELD', new_tp: decisionResponse.new_take_profit_percent });
            }
        }

        return NextResponse.json({ success: true, decision: 'NO_ACTION' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in decision API: ${errorMessage}`);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
