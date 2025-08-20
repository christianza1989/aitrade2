// src/app/api/market-stream/route.ts

import WebSocket from 'ws';
import { OpportunityScanner } from '@/core/opportunity-scanner';
import { BinanceService } from '@/core/binance';
import { TechnicalAnalyst, RiskManager, PortfolioAllocator, Analysis } from '@/core/agents'; // Import 'Analysis'
import { SharedContext } from '@/core/context';
import { OpportunityLogger } from '@/core/opportunity-logger';
import { DecisionLogger } from '@/core/decision-logger';
import { PortfolioService } from '@/core/portfolio';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_USERNAME = 'admin'; // Assume a default username for now

let ws: WebSocket | null = null;
const trackedSymbols: { [symbol: string]: { price: number; time: number } } = {};

const configFilePath = path.join(process.cwd(), 'config.json');
// *** PATAISYMAS: Pridėtas kelias į talpyklos failą ***
const contextCachePath = path.join(process.cwd(), 'market_context_cache.json');

async function getConfig() {
    try {
        const data = await fs.readFile(configFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to read config.json:", error);
        return {
            fastMoverTimeMinutes: 5,
            fastMoverPriceChangePercent: 5.0
        };
    }
}

async function connectAndStream(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('[MarketStream] WebSocket is already connected.');
        return;
    }

    const config = await getConfig();
    const FAST_MOVER_TIME_MS = (config.fastMoverTimeMinutes || 5) * 60 * 1000;
    const FAST_MOVER_PRICE_CHANGE_PERCENT = config.fastMoverPriceChangePercent || 5.0;

    console.log('[MarketStream] Connecting to Binance WebSocket for client stream...');
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    const encoder = new TextEncoder();

    ws.on('open', () => {
        console.log('[MarketStream] Client stream connection established.');
    });

    ws.on('message', async (data: WebSocket.Data) => {
        const tickers = JSON.parse(data.toString());
        const opportunityScanner = OpportunityScanner.getInstance();
        const opportunityLogger = new OpportunityLogger(DEFAULT_USERNAME);
        
        if (controller.desiredSize !== null && controller.desiredSize > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(tickers)}\n\n`));
        } else {
            console.warn('[MarketStream] Controller is closed or full, cannot enqueue data.');
        }

        for (const ticker of tickers) {
            const symbol = ticker.s;
            const price = parseFloat(ticker.c);
            const now = Date.now();

            if (!trackedSymbols[symbol]) {
                trackedSymbols[symbol] = { price, time: now };
                continue;
            }

            const initialData = trackedSymbols[symbol];
            if (now - initialData.time > FAST_MOVER_TIME_MS) {
                trackedSymbols[symbol] = { price, time: now };
            } else {
                const priceChangePercent = ((price - initialData.price) / initialData.price) * 100;
                if (priceChangePercent > FAST_MOVER_PRICE_CHANGE_PERCENT) {
                    console.log(`[MarketStream] OPPORTUNITY DETECTED: ${symbol} increased by ${priceChangePercent.toFixed(2)}%`);
                    await opportunityScanner.addOpportunity({ symbol, priceChangePercent });
                    trackedSymbols[symbol] = { price, time: now };

                    console.log(`[MarketStream] Triggering AI analysis for fast mover: ${symbol}`);
                    try {
                        const binanceService = new BinanceService();
                        const technicalAnalyst = new TechnicalAnalyst();
                        const riskManager = new RiskManager();
                        const portfolioAllocator = new PortfolioAllocator();
                        const decisionLogger = new DecisionLogger(DEFAULT_USERNAME);
                        const portfolioService = new PortfolioService(DEFAULT_USERNAME);
                        const sharedContext = new SharedContext();

                        const candles = await binanceService.getHistoricalData(symbol, '1m', 100);
                        if (candles.length === 0) {
                            console.warn(`[MarketStream] No historical data for ${symbol}, skipping AI analysis.`);
                            await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                            continue;
                        }

                        const techAnalysisResult = await technicalAnalyst.analyze(symbol, candles, config);
                        if (!techAnalysisResult?.response) {
                            console.warn(`[MarketStream] Technical analysis failed for ${symbol}, skipping AI analysis.`);
                            await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                            continue;
                        }

                        // *** PATAISYMAS: Įkeliame tikrus makro ir sentimento duomenis iš talpyklos ***
                        let macroAnalysis, sentimentAnalysis;
                        try {
                            const cacheData = await fs.readFile(contextCachePath, 'utf-8');
                            const cachedContext = JSON.parse(cacheData);
                            macroAnalysis = cachedContext.macroAnalysis;
                            sentimentAnalysis = cachedContext.sentimentAnalysis;
                            console.log(`[MarketStream] Successfully loaded cached market context for ${symbol}.`);
                        } catch (error) {
                            console.warn(`[MarketStream] Could not load cached market context for ${symbol}. Falling back to neutral defaults.`);
                            macroAnalysis = { market_regime: 'Neutral', regime_score: 5.0, summary: 'Cache not available' };
                            sentimentAnalysis = { sentiment: 'Neutral', sentiment_score: 0.0, dominant_narrative: 'Cache not available' };
                        }
                        // *** PATAISYMO PABAIGA ***
                        
                        // Sudarome analizės objektą su tikrais (arba numatytais) duomenimis
                        const analysisForRiskManager: Analysis = {
                            MacroAnalyst: macroAnalysis,
                            SentimentAnalyst: sentimentAnalysis,
                            [symbol]: {
                                technicalAnalysis: techAnalysisResult.response,
                            }
                        };
                        
                        // Perduodame tikrus duomenis
                        const decisionResult = await riskManager.decideBatch(
                            [analysisForRiskManager],
                            macroAnalysis,
                            sentimentAnalysis
                        );
                        
                        // Tolesnė logika lieka tokia pati...
                        if (decisionResult && decisionResult.response && typeof decisionResult.response === 'object') {
                            const decisionForSymbol = (decisionResult.response as Record<string, unknown>)[symbol];
                            if (decisionForSymbol && typeof decisionForSymbol === 'object') {
                                const decision = (decisionForSymbol as { decision: string }).decision;
                                console.log(`[MarketStream] AI Decision for ${symbol}:`, decisionForSymbol);

                                if (decision === 'BUY') {
                                    const buySignals = [{ symbol, price, analysis: techAnalysisResult.response }];
                                    const allocationResult = await portfolioAllocator.allocate(buySignals, await portfolioService.getPortfolio(), macroAnalysis, sentimentAnalysis, sharedContext);

                                    const allocationResponse = allocationResult?.response as Record<string, { decision?: string, amount_to_buy_usd?: number, justification?: string }>;

                                    if (allocationResponse && allocationResponse[symbol]?.decision === 'EXECUTE_BUY' && allocationResponse[symbol].amount_to_buy_usd! > 0) {
                                        const amountToBuyUsd = allocationResponse[symbol].amount_to_buy_usd!;
                                        const amountToBuy = amountToBuyUsd / price;
                                        await portfolioService.buy(symbol, amountToBuy, price);
                                        await opportunityScanner.updateOpportunityStatus(symbol, 'bought');
                                        await decisionLogger.log({
                                            symbol,
                                            decision: 'BUY',
                                            currentPrice: price,
                                            amount: amountToBuy,
                                            reason: allocationResponse[symbol].justification || 'Fast Mover Buy'
                                        });
                                        console.log(`[MarketStream] Successfully bought ${amountToBuy} of ${symbol}`);
                                    } else {
                                        await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                                        await opportunityLogger.log({
                                            symbol,
                                            priceChangePercent,
                                            reason: 'AI decided to BUY but allocation failed or was zero.'
                                        });
                                        console.warn(`[MarketStream] AI decided to BUY ${symbol}, but allocation was zero or failed.`);
                                    }
                                } else {
                                    await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                                    await opportunityLogger.log({
                                        symbol,
                                        priceChangePercent,
                                        reason: (decisionForSymbol as { final_summary?: string; reason?: string }).final_summary || (decisionForSymbol as { final_summary?: string; reason?: string }).reason || `AI decided to ${decision}`
                                    });
                                    console.log(`[MarketStream] AI decided to ${decision} ${symbol}.`);
                                }
                            } else {
                                await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                                await opportunityLogger.log({
                                    symbol,
                                    priceChangePercent,
                                    reason: 'AI decision for symbol not found in batch response.'
                                });
                                console.warn(`[MarketStream] AI decision for ${symbol} not found in batch response.`);
                            }
                        } else {
                            await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                            await opportunityLogger.log({
                                symbol,
                                priceChangePercent,
                                reason: 'AI decision process failed or returned no decision.'
                            });
                            console.warn(`[MarketStream] AI decision process failed for ${symbol}.`);
                        }

                    } catch (aiError) {
                        console.error(`[MarketStream] Error during AI analysis for ${symbol}:`, aiError);
                        await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
                        await opportunityLogger.log({
                            symbol,
                            priceChangePercent,
                            reason: `Error during AI analysis: ${(aiError as Error).message}`
                        });
                    }
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('[MarketStream] Client stream closed.');
        ws = null;
        try {
            controller.close();
        } catch (e) {
            // Controller might already be closed
        }
    });

    ws.on('error', (error: unknown) => {
        console.error('[MarketStream] Client stream error:', error);
        try {
            controller.error(error);
            ws?.close();
        } catch (e) {
            // Controller might already be closed
        }
    });
}

export async function GET(req: Request) {
    const stream = new ReadableStream({
        start(controller) {
            connectAndStream(controller);
        },
        cancel() {
            console.log('[MarketStream] Client disconnected, closing WebSocket.');
            ws?.close();
            ws = null;
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