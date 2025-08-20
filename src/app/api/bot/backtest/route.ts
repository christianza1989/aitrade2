// src/app/api/bot/backtest/route.ts

import { BinanceService } from '@/core/binance';
import { AgentService } from '@/core/agent-service';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, Analysis } from '@/core/agents';
import { SharedContext } from '@/core/context';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'config.json');

export async function POST(request: Request) {
    const { symbol, interval } = await request.json();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'log', message: 'Backtest started...' });

            try {
                const binance = new BinanceService();
                
                // PATAISYMAS YRA ČIA: Sukuriame AgentService ir perduodame jį visiems agentams
                const agentService = new AgentService();
                const macroAnalyst = new MacroAnalyst(agentService);
                const sentimentAnalyst = new SentimentAnalyst(agentService);
                const techAnalyst = new TechnicalAnalyst(agentService);
                const riskManager = new RiskManager(agentService);

                agentService.register(macroAnalyst);
                agentService.register(sentimentAnalyst);
                agentService.register(techAnalyst);
                agentService.register(riskManager);

                const configData = await fs.readFile(configFilePath, 'utf-8');
                const config = JSON.parse(configData);

                const historicalData = await binance.getHistoricalData(symbol, interval, 200); 

                if (historicalData.length === 0) {
                    sendEvent({ type: 'error', message: `Could not fetch historical data for ${symbol}.` });
                    controller.close();
                    return;
                }

                let positionOpen = false;

                for (let i = 20; i < historicalData.length; i++) { // Pradedame su pakankamai duomenų indikatoriams
                    const currentCandle = historicalData[i];
                    const dataSlice = historicalData.slice(0, i + 1);
                    sendEvent({ type: 'log', message: `Analyzing data for ${new Date(currentCandle.time * 1000).toISOString()}` });

                    const dummyContext = new SharedContext();
                    const mockNews = ["Market is stable", "Bitcoin price holds steady"];
                    const mockFearAndGreed = { value: "50", classification: "Neutral" };
                    const mockGlobalMetrics = { btc_dominance: 50, quote: { USD: { total_market_cap: 2.5e12 } } };
                    const mockTrending = [{ name: "Bitcoin", symbol: "BTC" }];

                    const macroAnalysisResult = await macroAnalyst.analyze(currentCandle, mockNews, mockFearAndGreed, mockGlobalMetrics, dummyContext);
                    const sentimentAnalysisResult = await sentimentAnalyst.analyze(mockNews.map(title => ({title})), mockTrending, dummyContext);
                    const techAnalysisResult = await techAnalyst.analyzeBatch([{ symbol, candles: dataSlice }], config);

                    const macroAnalysis = macroAnalysisResult?.response;
                    const sentimentAnalysis = sentimentAnalysisResult?.response;
                    const techAnalyses = techAnalysisResult?.response || {};
                    const symbolTechAnalysis = (techAnalyses as any)[symbol];

                    const fullAnalysis: Analysis = {
                        [symbol]: symbolTechAnalysis,
                        MacroAnalyst: macroAnalysis,
                        SentimentAnalyst: sentimentAnalysis
                    };
                    
                    sendEvent({ type: 'analysis', data: fullAnalysis });
                    
                    const mockFundamentalData: Record<string, any> = { [symbol.replace('USDT', '')]: { tags: ['test'], description: 'Backtesting asset', urls: {} } };

                    const finalDecisionResult = await riskManager.decideBatch(techAnalyses, macroAnalysis, sentimentAnalysis, mockFundamentalData);
                    const finalDecisions = finalDecisionResult?.response as any;
                    const finalDecision = finalDecisions ? finalDecisions[symbol] : null;

                    sendEvent({ type: 'aiChat', data: { agent: 'RiskManager', ...finalDecisionResult } });

                    if (finalDecision?.decision === 'BUY' && !positionOpen) {
                        sendEvent({ type: 'trade', data: { date: new Date(currentCandle.time * 1000).toISOString(), action: 'BUY', price: currentCandle.close } });
                        positionOpen = true;
                    } else if (finalDecision?.decision === 'AVOID' && positionOpen) {
                        sendEvent({ type: 'trade', data: { date: new Date(currentCandle.time * 1000).toISOString(), action: 'SELL', price: currentCandle.close } });
                        positionOpen = false;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                sendEvent({ type: 'log', message: 'Backtest finished.' });
                controller.close();

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                sendEvent({ type: 'error', message: errorMessage });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}