import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { NewsService } from '@/core/news';
import { PortfolioService } from '@/core/portfolio';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, PortfolioAllocator, PositionManager, Analysis } from '@/core/agents';
import { SharedContext } from '@/core/context';
import { OpportunityLogger } from '@/core/opportunity-logger';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const statusFilePath = path.join(process.cwd(), 'bot-status.json');
const configFilePath = path.join(process.cwd(), 'config.json');

async function getBotStatus() {
    try {
        const data = await fs.readFile(statusFilePath, 'utf-8');
        return JSON.parse(data).status;
    } catch {
        return 'inactive';
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        // Although this is a stream, we can't easily return a 401 here.
        // The client will simply see the stream end prematurely.
        // Proper handling would involve sending an error event through the stream.
        return new Response(null, { status: 401 });
    }
    const username = session.user.name;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'log', message: 'Bot cycle initiated on the server.' });
            sendEvent({ type: 'aiChat', data: { agent: 'System', response: { summary: 'Hello! AI analysis cycle starting now...' } } });

            try {
                const sharedContext = new SharedContext();
                
                const status = await getBotStatus();
                if (status !== 'active') {
                    sendEvent({ type: 'log', message: 'Bot is not active. Skipping cycle.' });
                    controller.close();
                    return;
                }

                sendEvent({ type: 'log', message: 'Initializing services...' });
                const binance = new BinanceService();
                sendEvent({ type: 'log', message: 'BinanceService OK.' });
                const newsService = new NewsService();
                sendEvent({ type: 'log', message: 'NewsService OK.' });
                const portfolioService = new PortfolioService(username);
                sendEvent({ type: 'log', message: 'PortfolioService OK.' });
                const macroAnalyst = new MacroAnalyst();
                sendEvent({ type: 'log', message: 'MacroAnalyst OK.' });
                const sentimentAnalyst = new SentimentAnalyst();
                sendEvent({ type: 'log', message: 'SentimentAnalyst OK.' });
                const techAnalyst = new TechnicalAnalyst();
                sendEvent({ type: 'log', message: 'TechnicalAnalyst OK.' });
                const riskManager = new RiskManager();
                sendEvent({ type: 'log', message: 'RiskManager OK.' });
                const portfolioAllocator = new PortfolioAllocator();
                sendEvent({ type: 'log', message: 'PortfolioAllocator OK.' });
                const opportunityLogger = new OpportunityLogger();
                sendEvent({ type: 'log', message: 'OpportunityLogger OK.' });
                sendEvent({ type: 'log', message: 'All services initialized successfully.' });

                // 1. Load config
                const configData = await fs.readFile(configFilePath, 'utf-8');
                const config = JSON.parse(configData);
                let portfolio = await portfolioService.getPortfolio();

                // Position management is now handled by the client-side trigger calling the /api/bot/decision endpoint.
                // This server-side loop is now only for finding new assets to buy.

                // 2. Analyze new potential trades
                if (portfolio.balance < config.minimumBalance) {
                    sendEvent({ type: 'log', message: `Balance is below ${config.minimumBalance}. Skipping new trade analysis.` });
                    controller.close();
                    return;
                }

                sendEvent({ type: 'log', message: 'Fetching market data for new trades...' });
                
                sendEvent({ type: 'log', message: '--> Fetching top symbols from Binance...' });
                const topSymbols = await binance.getTopSymbols();
                sendEvent({ type: 'log', message: `<-- Found ${topSymbols.length} symbols.` });

                sendEvent({ type: 'log', message: '--> Fetching BTC historical data...' });
                const btcData = await binance.getHistoricalData('BTCUSDT', '4h', 1);
                sendEvent({ type: 'log', message: '<-- BTC data fetched.' });

                sendEvent({ type: 'log', message: '--> Fetching crypto news...' });
                const newsArticles = await newsService.getCryptoNews();
                sendEvent({ type: 'log', message: `<-- Found ${newsArticles.length} news articles.` });

                sendEvent({ type: 'log', message: 'Running macro and sentiment analysis...' });
                const btcLastCandle = btcData && btcData.length > 0 ? btcData[0] : {};
                const macroAnalysisResult = await macroAnalyst.analyze(btcLastCandle, newsArticles.map(a => a.title), sharedContext);
                sendEvent({ type: 'context', data: sharedContext.getContext() });
                const sentimentAnalysisResult = await sentimentAnalyst.analyze(newsArticles, sharedContext);
                sendEvent({ type: 'context', data: sharedContext.getContext() });

                const macroAnalysis = macroAnalysisResult?.response;
                const sentimentAnalysis = sentimentAnalysisResult?.response;

                // Phase 3: Dynamic Risk Management
                const adjustedConfig = riskManager.determineRiskParameters(config, sharedContext);
                if (JSON.stringify(config) !== JSON.stringify(adjustedConfig)) {
                    sendEvent({ type: 'log', message: `Risk parameters dynamically adjusted based on market context.` });
                    sendEvent({ type: 'adjusted_config', data: adjustedConfig });
                }

                sendEvent({ type: 'aiChat', data: { agent: 'MacroAnalyst', ...macroAnalysisResult } });
                sendEvent({ type: 'aiChat', data: { agent: 'SentimentAnalyst', ...sentimentAnalysisResult } });

                const macroScore = (macroAnalysis?.regime_score as number) || 0;
                if (macroScore < config.macroScoreThreshold) {
                    sendEvent({ type: 'log', message: `Market regime is 'Risk-Off' (Score: ${macroScore}). Holding off.` });
                    controller.close();
                    return;
                }

                sendEvent({ type: 'log', message: `Market is 'Risk-On' (Score: ${macroScore}). Analyzing top ${config.symbolsToAnalyze} symbols...` });

                const symbolsToAnalyze = topSymbols.slice(0, config.symbolsToAnalyze);
                const BATCH_SIZE = config.batchSize;
                
                const batches = [];
                for (let i = 0; i < symbolsToAnalyze.length; i += BATCH_SIZE) {
                    batches.push(symbolsToAnalyze.slice(i, i + BATCH_SIZE));
                }

                sendEvent({ type: 'log', message: `Analyzing ${symbolsToAnalyze.length} symbols in ${batches.length} parallel batches...` });

                const batchPromises = batches.map(async (batch, index) => {
                    sendEvent({ type: 'log', message: `Starting analysis for batch #${index + 1}...` });
                    
                    const batchDataPromises = batch.map(ticker => 
                        binance.getHistoricalData(ticker.symbol, '5m', 100).then(candles => ({
                            symbol: ticker.symbol,
                            candles
                        }))
                    );
                    const batchData = await Promise.all(batchDataPromises);
                    const validBatchData = batchData.filter(d => d.candles.length > 0);

                    const techAnalysisResult = await techAnalyst.analyzeBatch(validBatchData, adjustedConfig);
                    sendEvent({ type: 'aiChat', data: { agent: `TechnicalAnalyst-Batch-${index + 1}`, ...techAnalysisResult } });
                    const techAnalyses = techAnalysisResult?.response || {};

                    const riskManagerResult = await riskManager.decideBatch(Object.values(techAnalyses) as Analysis[], macroAnalysis, sentimentAnalysis);
                    sendEvent({ type: 'aiChat', data: { agent: `RiskManager-Batch-${index + 1}`, ...riskManagerResult } });
                    const finalDecisions = riskManagerResult?.response || {};

                    const buySignals = [];
                    for (const symbol in finalDecisions) {
                        const decision = finalDecisions[symbol] as { decision?: string, confidence_score?: number, final_summary?: string };
                        if (decision.decision === 'BUY') {
                            buySignals.push({ symbol, ...decision });
                        } else if (decision.decision === 'AVOID') {
                            await opportunityLogger.log({
                                symbol,
                                reason: 'AVOID decision by RiskManager',
                                confidenceScore: decision.confidence_score,
                                finalSummary: decision.final_summary,
                            });
                        }
                    }
                    sendEvent({ type: 'log', message: `Batch #${index + 1} analysis complete. Found ${buySignals.length} BUY signals.` });
                    return buySignals;
                });

                const results = await Promise.all(batchPromises);
                const allBuySignals = results.flat();

                if (allBuySignals.length > 0) {
                    sendEvent({ type: 'log', message: `Found ${allBuySignals.length} total BUY signals. Allocating portfolio...` });
                    const allocationResult = await portfolioAllocator.allocate(allBuySignals, portfolio, macroAnalysis, sentimentAnalysis, sharedContext);
                    sendEvent({ type: 'context', data: sharedContext.getContext() });
                    sendEvent({ type: 'aiChat', data: { agent: 'PortfolioAllocator', ...allocationResult } });
                    const allocations = allocationResult?.response || {};

                    console.log('[RUN ROUTE] Allocations received:', JSON.stringify(allocations, null, 2));

                    for (const symbol in allocations) {
                        const allocation = allocations[symbol] as { decision?: string; amount_to_buy_usd?: number };
                        if (allocation.decision === 'EXECUTE_BUY' && typeof allocation.amount_to_buy_usd === 'number') {
                            try {
                                const price = await binance.getCurrentPrice(symbol);
                                if (price) {
                                    const amountToBuy = allocation.amount_to_buy_usd / price;
                                    await portfolioService.buy(symbol, amountToBuy, price);
                                    sendEvent({ type: 'log', message: `BOUGHT ${amountToBuy.toFixed(5)} of ${symbol} for ${allocation.amount_to_buy_usd.toFixed(2)} USD` });
                                    portfolio = await portfolioService.getPortfolio(); // Refresh portfolio state for the next iteration
                                }
                            } catch (e) {
                                const errorMessage = e instanceof Error ? e.message : String(e);
                                sendEvent({ type: 'log', message: `Failed to buy ${symbol}: ${errorMessage}` });
                            }
                        }
                    }
                } else {
                    sendEvent({ type: 'log', message: 'No strong BUY signals found in this cycle.' });
                }

                sendEvent({ type: 'log', message: 'Bot cycle finished.' });
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
