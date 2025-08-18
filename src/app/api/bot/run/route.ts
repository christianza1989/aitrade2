import { BinanceService } from '@/core/binance';
import { NewsService } from '@/core/news';
import { PortfolioService } from '@/core/portfolio';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, PortfolioAllocator, PositionManager, Analysis } from '@/core/agents';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const statusFilePath = path.join(process.cwd(), 'bot-status.json');
const configFilePath = path.join(process.cwd(), 'config.json');

async function getBotStatus() {
    try {
        const data = await fs.readFile(statusFilePath, 'utf-8');
        return JSON.parse(data).status;
    } catch (error) {
        return 'inactive';
    }
}

export async function GET(request: Request) {
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'log', message: 'Bot cycle initiated on the server.' });
            sendEvent({ type: 'aiChat', data: { agent: 'System', response: { summary: 'Hello! AI analysis cycle starting now...' } } });

            try {
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
                const portfolioService = new PortfolioService();
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
                const positionManager = new PositionManager();
                sendEvent({ type: 'log', message: 'PositionManager OK.' });
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
                const macroAnalysisResult = await macroAnalyst.analyze(btcLastCandle, newsArticles.map(a => a.title));
                const sentimentAnalysisResult = await sentimentAnalyst.analyze(newsArticles);

                const macroAnalysis = macroAnalysisResult?.response;
                const sentimentAnalysis = sentimentAnalysisResult?.response;

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

                    const techAnalysisResult = await techAnalyst.analyzeBatch(validBatchData, config);
                    sendEvent({ type: 'aiChat', data: { agent: `TechnicalAnalyst-Batch-${index + 1}`, ...techAnalysisResult } });
                    const techAnalyses = techAnalysisResult?.response || {};

                    const riskManagerResult = await riskManager.decideBatch(Object.values(techAnalyses) as Analysis[], macroAnalysis, sentimentAnalysis);
                    sendEvent({ type: 'aiChat', data: { agent: `RiskManager-Batch-${index + 1}`, ...riskManagerResult } });
                    const finalDecisions = riskManagerResult?.response || {};

                    const buySignals = [];
                    for (const symbol in finalDecisions) {
                        const decision = finalDecisions[symbol] as { decision?: string };
                        if (decision.decision === 'BUY') {
                            buySignals.push({ symbol, ...decision });
                        }
                    }
                    sendEvent({ type: 'log', message: `Batch #${index + 1} analysis complete. Found ${buySignals.length} BUY signals.` });
                    return buySignals;
                });

                const results = await Promise.all(batchPromises);
                const allBuySignals = results.flat();

                if (allBuySignals.length > 0) {
                    sendEvent({ type: 'log', message: `Found ${allBuySignals.length} total BUY signals. Allocating portfolio...` });
                    const allocationResult = await portfolioAllocator.allocate(allBuySignals, portfolio, macroAnalysis, sentimentAnalysis);
                    sendEvent({ type: 'aiChat', data: { agent: 'PortfolioAllocator', ...allocationResult } });
                    const allocations = allocationResult?.response || {};

                    for (const symbol in allocations) {
                        const allocation = allocations[symbol] as { decision?: string; amount_to_buy_usd?: number };
                        if (allocation.decision === 'EXECUTE_BUY' && typeof allocation.amount_to_buy_usd === 'number') {
                            const price = await binance.getCurrentPrice(symbol);
                            if (price) {
                                const amountToBuy = allocation.amount_to_buy_usd / price;
                                const currentPortfolio = await portfolioService.getPortfolio();
                                if (currentPortfolio.balance >= allocation.amount_to_buy_usd) {
                                    await portfolioService.buy(symbol, amountToBuy, price);
                                    sendEvent({ type: 'log', message: `BOUGHT ${amountToBuy.toFixed(5)} of ${symbol} for ${allocation.amount_to_buy_usd.toFixed(2)} USD` });
                                    portfolio = await portfolioService.getPortfolio(); // Refresh portfolio after buy
                                } else {
                                    sendEvent({ type: 'log', message: `Insufficient balance to execute allocated buy for ${symbol}.` });
                                }
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
