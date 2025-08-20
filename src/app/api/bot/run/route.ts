// src/app/api/bot/run/route.ts

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService, Ticker } from '@/core/binance';
import { NewsService } from '@/core/news';
import { CoinMarketCapService } from '@/core/coinmarketcap';
import { PortfolioService } from '@/core/portfolio';
import { AgentService } from '@/core/agent-service';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, PortfolioAllocator, PositionManager, DEX_ScoutAgent, MasterAgent, StrategyOptimizer } from '@/core/agents';
import { SharedContext, ISharedContext } from '@/core/context';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const statusFilePath = path.join(process.cwd(), 'bot-status.json');
const mainConfigPath = path.join(process.cwd(), 'config.json');

async function getBotStatus() {
    try {
        const data = await fs.readFile(statusFilePath, 'utf-8');
        return JSON.parse(data).status;
    } catch {
        return 'inactive';
    }
}

async function findCategoryId(cmcService: CoinMarketCapService, narrativeName: string): Promise<string | null> {
    if (!narrativeName) return null;
    const categories = await cmcService.getCategories();
    if (!categories) return null;
    const searchTerm = narrativeName.toLowerCase().split(' ')[0];
    const found = categories.find(cat => cat.name.toLowerCase().includes(searchTerm));
    return found ? found.id : null;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return new Response(null, { status: 401 });
    }
    const username = session.user.name;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

            const agentService = new AgentService();
            const binance = new BinanceService();
            const newsService = new NewsService();
            const coinMarketCapService = new CoinMarketCapService();
            
            agentService.register(new MacroAnalyst(agentService));
            agentService.register(new SentimentAnalyst(agentService));
            agentService.register(new TechnicalAnalyst(agentService));
            agentService.register(new RiskManager(agentService));
            agentService.register(new PortfolioAllocator(agentService));
            agentService.register(new PositionManager(agentService));
            agentService.register(new DEX_ScoutAgent(agentService));
            agentService.register(new StrategyOptimizer(agentService));
            agentService.register(new MasterAgent(agentService));

            const executeTradeCycle = async (config: any, portfolioService: PortfolioService, mode: 'main' | 'shadow') => {
                const prefix = `[${mode.toUpperCase()}]`;
                sendEvent({ type: 'log', message: `${prefix} Starting trade cycle...` });

                const sharedContext = new SharedContext();
                let portfolio = await portfolioService.getPortfolio();
                
                const macroAnalyst = agentService.getAgent('MacroAnalyst') as MacroAnalyst;
                const sentimentAnalyst = agentService.getAgent('SentimentAnalyst') as SentimentAnalyst;
                const techAnalyst = agentService.getAgent('TechnicalAnalyst') as TechnicalAnalyst;
                const riskManager = agentService.getAgent('RiskManager') as RiskManager;
                const portfolioAllocator = agentService.getAgent('PortfolioAllocator') as PortfolioAllocator;
                const positionManager = agentService.getAgent('PositionManager') as PositionManager;
                const dexScout = agentService.getAgent('DEX_ScoutAgent') as DEX_ScoutAgent;

                if (mode === 'main') {
                    for (const position of portfolio.positions) {
                        const currentPrice = await binance.getCurrentPrice(position.symbol);
                        if (!currentPrice) continue;

                        const pnlPercent = (currentPrice - position.entryPrice) * position.amount === 0 ? 0 : ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
                        const takeProfit = position.takeProfitPercent || config.takeProfitPercent;
                        const stopLoss = config.stopLossPercent;

                        if (pnlPercent <= stopLoss) {
                            await portfolioService.sell(position.symbol, position.amount, currentPrice, 'Automatic Stop Loss', sharedContext.getContext());
                            sendEvent({ type: 'log', message: `${prefix} SOLD ${position.symbol} due to Stop Loss.` });
                        } else if (pnlPercent >= takeProfit) {
                            sendEvent({ type: 'log', message: `${prefix} Position ${position.symbol} hit TAKE PROFIT. Invoking PositionManager...` });
                            const btcData = await binance.getHistoricalData('BTCUSDT', '4h', 1);
                            const newsArticles = await newsService.getCryptoNews();
                            const fearAndGreedIndex = await coinMarketCapService.getFearAndGreedIndex();
                            const globalMetrics = await coinMarketCapService.getGlobalMetrics();
                            const trendingTokens = await coinMarketCapService.getTrendingTokens();
                            
                            const tempMacroContext = new SharedContext();
                            const macroResult = await macroAnalyst.analyze(btcData[0] || {}, newsArticles.map(a => a.title), fearAndGreedIndex, globalMetrics, tempMacroContext);
                            const sentimentResult = await sentimentAnalyst.analyze(newsArticles, trendingTokens, tempMacroContext);
                    
                            const decisionResult = await positionManager.decide(position, currentPrice, macroResult?.response, sentimentResult?.response, config, []);
                            const decisionData = decisionResult?.response as { decision?: string; new_take_profit_percent?: number; justification?: string };

                            if (decisionData?.decision === 'SELL_NOW') {
                                await portfolioService.sell(position.symbol, position.amount, currentPrice, decisionData.justification || 'PositionManager decision', tempMacroContext.getContext());
                                sendEvent({ type: 'log', message: `${prefix} SOLD ${position.symbol} based on PositionManager decision.` });
                            } else if (decisionData?.decision === 'HOLD_AND_INCREASE_TP') {
                                await portfolioService.updatePosition(position.symbol, { takeProfitPercent: decisionData.new_take_profit_percent });
                                sendEvent({ type: 'log', message: `${prefix} HOLDING ${position.symbol}, new take-profit is ${decisionData.new_take_profit_percent}%.` });
                            }
                        }
                    }
                    portfolio = await portfolioService.getPortfolio();
                }

                if (portfolio.balance < (config.minimumBalance || 1000)) {
                    sendEvent({ type: 'log', message: `${prefix} Balance below minimum. Skipping new trades.` });
                    return;
                }

                if (config.enableDexHunting) {
                    sendEvent({ type: 'log', message: `${prefix} DEX Scout is hunting...`});
                    const latestDexPairs = await coinMarketCapService.getLatestDexPairs();
                    await dexScout.analyze(latestDexPairs || [], sharedContext);
                }

                let analysisCandidates: Partial<Ticker>[] = await binance.getTopSymbols();
                const uniqueSymbols = new Set(analysisCandidates.map(s => s.symbol));
                const addCandidate = (symbol: string) => {
                    const fullSymbol = symbol.endsWith('USDT') ? symbol : symbol + 'USDT';
                    if (!uniqueSymbols.has(fullSymbol)) {
                        analysisCandidates.push({ symbol: fullSymbol, quoteVolume: '0' });
                        uniqueSymbols.add(fullSymbol);
                    }
                };
                const gainersData = await coinMarketCapService.getTrendingGainersAndLosers();
                if (gainersData?.gainers) gainersData.gainers.forEach((g: any) => addCandidate(g.symbol));

                const btcData = await binance.getHistoricalData('BTCUSDT', '4h', 1);
                const newsArticles = await newsService.getCryptoNews();
                const fearAndGreedIndex = await coinMarketCapService.getFearAndGreedIndex();
                const globalMetrics = await coinMarketCapService.getGlobalMetrics();
                const trendingTokens = await coinMarketCapService.getTrendingTokens();
                
                const macroAnalysisResult = await macroAnalyst.analyze(btcData?.[0] || {}, newsArticles.map(a => a.title), fearAndGreedIndex, globalMetrics, sharedContext);
                const sentimentAnalysisResult = await sentimentAnalyst.analyze(newsArticles, trendingTokens, sharedContext);
                const macroAnalysis = macroAnalysisResult?.response;
                const sentimentAnalysis = sentimentAnalysisResult?.response;

                let narrativeContext;
                const currentContext = sharedContext.getContext();
                // @ts-ignore
                const dominantNarrative = currentContext.dominantNarrative;

                if (dominantNarrative && config.enableNarrativeTrading) {
                    const categoryId = await findCategoryId(coinMarketCapService, dominantNarrative);
                    if (categoryId) {
                        const categoryDetails = await coinMarketCapService.getCategoryById(categoryId);
                        const narrativeAssets = categoryDetails?.coins?.map((c: any) => c.symbol) || [];
                        if (narrativeAssets.length > 0) {
                            narrativeContext = { narrative: dominantNarrative, assets: narrativeAssets };
                            narrativeAssets.forEach((symbol: string) => addCandidate(symbol));
                        }
                    }
                }

                const macroScore = (macroAnalysis?.regime_score as number) || 0;
                if (macroScore < config.macroScoreThreshold) {
                    sendEvent({ type: 'log', message: `${prefix} Market is 'Risk-Off' (Score: ${macroScore}). Holding off.` });
                    return;
                }

                const symbolsToAnalyze = Array.from(uniqueSymbols).map(s => ({ symbol: s as string })).slice(0, config.symbolsToAnalyze);
                const BATCH_SIZE = config.batchSize;
                const batches = [];
                for (let i = 0; i < symbolsToAnalyze.length; i += BATCH_SIZE) {
                    batches.push(symbolsToAnalyze.slice(i, i + BATCH_SIZE));
                }

                const allBuySignals = (await Promise.all(batches.map(async (batch) => {
                    const batchData = (await Promise.all(batch.map(t => binance.getHistoricalData(t.symbol!, '5m', 100).then(c => ({ symbol: t.symbol!, candles: c }))))).filter(d => d.candles.length > 0);
                    if (batchData.length === 0) return [];
                    const techAnalyses = (await techAnalyst.analyzeBatch(batchData, config))?.response || {};
                    const infoSymbols = Object.keys(techAnalyses).map(s => s.replace('USDT', ''));
                    const fundamentalData = await coinMarketCapService.getCryptocurrencyInfo(infoSymbols) || {};
                    const finalDecisions = (await riskManager.decideBatch(techAnalyses, macroAnalysis, sentimentAnalysis, fundamentalData))?.response || {};
                    return Object.entries(finalDecisions).filter(([, d]) => (d as any).decision === 'BUY').map(([s, d]) => ({ symbol: s, ...(d as object) }));
                }))).flat();
                
                if (allBuySignals.length > 0) {
                    sendEvent({ type: 'log', message: `${prefix} Found ${allBuySignals.length} BUY signals. Allocating portfolio...` });
                    const allocationResult = await portfolioAllocator.allocate(allBuySignals, portfolio, macroAnalysis, sentimentAnalysis, sharedContext, narrativeContext, currentContext.dexOpportunities);
                    const allocations = allocationResult?.response || {};
                    for (const symbol in allocations) {
                        const alloc = allocations[symbol] as { decision?: string; amount_to_buy_usd?: number };
                        if (alloc.decision === 'EXECUTE_BUY' && (alloc.amount_to_buy_usd || 0) > 0) {
                            const price = await binance.getCurrentPrice(symbol);
                            if (price) {
                                const amount = alloc.amount_to_buy_usd! / price;
                                await portfolioService.buy(symbol, amount, price);
                                sendEvent({ type: 'log', message: `${prefix} BOUGHT ${amount.toFixed(5)} ${symbol}` });
                            }
                        }
                    }
                } else {
                    sendEvent({ type: 'log', message: `${prefix} No strong BUY signals found.` });
                }
                sendEvent({ type: 'log', message: `${prefix} Trade cycle finished.` });
            };

            // Main Execution Block
            try {
                sendEvent({ type: 'log', message: 'Cycle starting...' });
                const status = await getBotStatus();
                if (status !== 'active') {
                    sendEvent({ type: 'log', message: 'Bot is not active. Halting.' });
                    controller.close(); return;
                }

                const mainConfigData = await fs.readFile(mainConfigPath, 'utf-8');
                const mainConfig = JSON.parse(mainConfigData);
                const mainPortfolioService = new PortfolioService(username, 'main');
                await executeTradeCycle(mainConfig, mainPortfolioService, 'main');
                
                let shadowPortfolio = null;
                const shadowConfigPath = path.join(process.cwd(), `shadow_config_${username}.json`);
                try {
                    const shadowConfigData = await fs.readFile(shadowConfigPath, 'utf-8');
                    const shadowConfig = JSON.parse(shadowConfigData);
                    if (mainConfig.enableAutoImprovement) {
                        sendEvent({ type: 'log', message: '--- Running Shadow Mode Cycle ---' });
                        const shadowPortfolioService = new PortfolioService(username, 'shadow');
                        await executeTradeCycle(shadowConfig, shadowPortfolioService, 'shadow');
                        shadowPortfolio = await shadowPortfolioService.getPortfolio();
                    }
                } catch (e) {
                    sendEvent({ type: 'log', message: 'No active shadow config. MasterAgent will check if a new one should be generated.' });
                }

                if (mainConfig.enableAutoImprovement) {
                    sendEvent({ type: 'log', message: '--- Master Agent is reviewing performance ---' });
                    const masterAgent = agentService.getAgent('MasterAgent') as MasterAgent;
                    const finalMainPortfolio = await mainPortfolioService.getPortfolio();
                    await masterAgent.manageOptimizationCycle(finalMainPortfolio, shadowPortfolio, mainConfig, username);
                }

                sendEvent({ type: 'log', message: 'Full cycle finished.' });
                controller.close();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                sendEvent({ type: 'error', message: errorMessage });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}