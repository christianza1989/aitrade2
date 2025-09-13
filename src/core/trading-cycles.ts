// src/core/trading-cycles.ts

import { AgentService } from './agent-service';
import {
    TechnicalAnalyst,
    RiskManager,
    PortfolioAllocator,
    PositionManager,
    OnChainAnalyst,
    SocialMediaAnalyst,
    MacroAnalysisResult,
    SentimentAnalysisResult,
    TechnicalAnalysisResult,
    StrategyOptimizer,
    MasterAgent,
    ScalperAgent
} from './agents';
import { OpportunityScanner } from './opportunity-scanner';
import { BinanceService } from './binance';
import { PortfolioService } from './portfolio';
import { DecisionLogger } from './decision-logger';
import { OpportunityLogger } from './opportunity-logger';
import { MemoryService } from './memory';
import { SharedContext } from './context';
import { RiskAdapter } from './risk-adapter';
import { CategorizationService } from './categorization-service';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Redis } from 'ioredis';
import { AgentActivityLogger } from './services/AgentActivityLogger';
import { randomUUID } from 'crypto';
import { PaperExecutionService, LiveExecutionService, IExecutionService } from './services/ExecutionService';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Apibrėžiame konfigūracijos tipą lankstumui
type CombinedConfig = Record<string, any>;

/**
 * Vykdo visą 'main_ai' strategijos prekybos ciklą vienam vartotojui.
 * Ši funkcija orkestruoja visus agentus nuo rinkos analizės iki prekybos įvykdymo.
 */
export async function runMainAiCycle(
    username: string,
    strategyConfig: CombinedConfig, // Pavadinimas pakeistas aiškumui
    agentService: AgentService,
    macroAnalysis: MacroAnalysisResult,
    sentimentAnalysis: SentimentAnalysisResult
) {
    console.log(`[${username}] Starting 'main_ai' trading cycle...`);

    // --- Execution Service Injection ---
    let executionService: IExecutionService;
    const tradingMode = strategyConfig.global_settings?.trading_mode || 'paper';

    if (tradingMode === 'paper') {
        executionService = new PaperExecutionService();
    } else {
        // ATEITYJE ČIA BUS RAKTŲ GAVIMAS IŠ DB
        const isTestnet = tradingMode === 'testnet';
        const apiKey = (isTestnet ? process.env.BINANCE_TESTNET_API_KEY : process.env.BINANCE_API_KEY) || '';
        const apiSecret = (isTestnet ? process.env.BINANCE_TESTNET_API_SECRET : process.env.BINANCE_API_SECRET) || '';

        // Svarbu: Šioje vietoje perduodame apiKey ir apiSecret į konstruktorių
        executionService = new LiveExecutionService(apiKey, apiSecret, isTestnet);
    }
    // --- End of Injection ---

    const cycleId = randomUUID(); // Unikalus ID kiekvienam ciklui
    const activityLogger = new AgentActivityLogger();

    // --- NAUJAS BLOKAS: Cycle History Tracking ---
    try {
        const historyKey = `cycle_history:${username}`;
        await redis.lpush(historyKey, cycleId);
        await redis.ltrim(historyKey, 0, 49); // Laikome tik paskutinių 50 ciklų istoriją
        await redis.expire(historyKey, 60 * 60 * 24 * 7); // Istorija galioja 7 dienas
    } catch (error) {
        console.error(`[TradingCycle] Failed to update cycle history for user ${username}:`, error);
    }
    // --- BLOKO PABAIGA ---

    // --- NAUJAS BLOKAS: Rizikos Apetito Pritaikymas ---
    const riskAppetite = strategyConfig.global_settings?.risk_appetite || 'Balanced';
    const riskProfile = strategyConfig.risk_appetite_profiles?.[riskAppetite];

    // Sukuriame dinaminę konfigūraciją šiam ciklui
    const dynamicConfig = JSON.parse(JSON.stringify(strategyConfig)); // Deep copy
    if (riskProfile) {
        // Perrašome pagrindinės strategijos rizikos parametrus
        dynamicConfig.strategies.main_ai.risk_management.capital_per_trade_percent = riskProfile.capital_per_trade_percent;
        // Perrašome diversifikacijos nustatymus
        dynamicConfig.diversification_settings.category_concentration_limits = riskProfile.category_concentration_limits;
    }
    // --- BLOKO PABAIGA ---

    // --- Servisų Inicializacija ---
    const portfolioService = new PortfolioService(username, 'MAIN', executionService);
    const decisionLogger = new DecisionLogger(username);
    const opportunityLogger = new OpportunityLogger(username);
    const memoryService = new MemoryService(username);
    const binanceService = new BinanceService();

    try {
        const portfolio = await portfolioService.getPortfolio();
        if (!portfolio) {
            console.error(`[${username}] Could not retrieve portfolio. Ending cycle.`);
            return;
        }

        // --- ŽINGSNIS 0: Atvirų Pozicijų Peržiūra (Pre-flight Check) ---
        const positionManager = agentService.getAgent('PositionManager') as PositionManager;
        for (const position of portfolio.positions) {
            const currentPrice = await binanceService.getCurrentPrice(position.symbol);
            if (currentPrice) {
                const decisionResult = await positionManager.review_open_position(position, currentPrice, macroAnalysis, sentimentAnalysis, strategyConfig);
                if (decisionResult?.response?.decision === 'SELL_NOW') {
                    await portfolioService.sell(position.symbol, position.amount, currentPrice, `PositionManager Decision: ${decisionResult.response.reason}`);
                    console.log(`[${username}] PositionManager closed position for ${position.symbol}. Reason: ${decisionResult.response.reason}`);
                    // Čia galima pridėti log'inimą į atmintį
                }
            }
        }

        const updatedPortfolio = await portfolioService.getPortfolio();
        if (!updatedPortfolio) {
            console.error(`[${username}] Could not retrieve updated portfolio. Ending cycle.`);
            return;
        }
        if (updatedPortfolio.positions.length >= dynamicConfig.strategies.main_ai.general.max_concurrent_trades) {
            console.log(`[${username}] Max concurrent trades limit reached. Skipping new opportunity scan.`);
            return;
        }

        // --- ŽINGSNIS 2.5: Portfelio Konteksto Paruošimas ---
        const categorizationService = CategorizationService.getInstance();
        const exceptions = new Set(dynamicConfig.diversification_settings?.exception_list || []);
        const openPositionsWithCategories = await Promise.all(
            updatedPortfolio.positions
                .filter(p => !exceptions.has(p.symbol.replace('USDT', '')))
                .map(async (p) => ({
                    symbol: p.symbol,
                    categories: await categorizationService.getCategory(p.symbol)
                }))
        );

        const portfolioContext = {
            open_positions: openPositionsWithCategories
        };

        // --- ŽINGSNIS 1: Rinkos Skenavimas ir Techninė Analizė ---
        const techAnalyst = agentService.getAgent('TechnicalAnalyst') as TechnicalAnalyst;
        const topSymbols = await binanceService.getTopSymbols(dynamicConfig.strategies.main_ai.market_scanning.symbols_to_analyze);
        const batchData = await Promise.all(
            topSymbols.slice(0, dynamicConfig.strategies.main_ai.market_scanning.top_candidates_for_analysis).map(async (s) => ({
                symbol: s.symbol,
                candles: await binanceService.getHistoricalData(s.symbol, '1h', 200)
            }))
        );

        await activityLogger.log({ cycleId, username, agentName: 'TechnicalAnalyst', status: 'ANALYZING' });
        const techAnalysisResult = await techAnalyst.analyzeBatch(batchData.filter(d => d.candles.length > 0), dynamicConfig);
        if (!techAnalysisResult?.response) {
            console.error(`[${username}] TechnicalAnalyst returned no response. Ending cycle.`);
            return;
        }
        const batchTechAnalyses = techAnalysisResult.response as Record<string, TechnicalAnalysisResult>;
        await activityLogger.log({ cycleId, username, agentName: 'TechnicalAnalyst', status: 'SUCCESS', payload: techAnalysisResult?.response });

        // --- ŽINGSNIS 2: Išplėstinė Analizė (On-chain, Social) ---
        const onChainAnalyst = agentService.getAgent('OnChainAnalyst') as OnChainAnalyst;
        const socialAnalyst = agentService.getAgent('SocialMediaAnalyst') as SocialMediaAnalyst;
        const symbolsForDeepAnalysis = Object.keys(batchTechAnalyses);

        if (dynamicConfig.strategies.main_ai.advanced_strategies.enable_onchain_analysis) {
            await activityLogger.log({ cycleId, username, agentName: 'OnChainAnalyst', status: 'ANALYZING' });
        }
        if (dynamicConfig.strategies.main_ai.advanced_strategies.enable_social_analysis) {
            await activityLogger.log({ cycleId, username, agentName: 'SocialMediaAnalyst', status: 'ANALYZING' });
        }

        const [onChainResult, socialResult] = await Promise.all([
            dynamicConfig.strategies.main_ai.advanced_strategies.enable_onchain_analysis ? onChainAnalyst.analyzeBatch(symbolsForDeepAnalysis) : Promise.resolve(null),
            dynamicConfig.strategies.main_ai.advanced_strategies.enable_social_analysis ? socialAnalyst.analyzeBatch(symbolsForDeepAnalysis) : Promise.resolve(null)
        ]);

        if (onChainResult?.response) {
            await activityLogger.log({ cycleId, username, agentName: 'OnChainAnalyst', status: 'SUCCESS', payload: onChainResult.response });
        }
        if (socialResult?.response) {
            await activityLogger.log({ cycleId, username, agentName: 'SocialMediaAnalyst', status: 'SUCCESS', payload: socialResult.response });
        }

        // --- ŽINGSNIS 3: Rizikos Vertinimas (Sprendimų Priėmimas) ---
        const riskManager = agentService.getAgent('RiskManager') as RiskManager;
        await activityLogger.log({ cycleId, username, agentName: 'RiskManager', status: 'ANALYZING' });
        const decisionsResult = await riskManager.decideBatch(
            batchTechAnalyses, macroAnalysis, sentimentAnalysis,
            (onChainResult?.response as Record<string, any>) || {}, (socialResult?.response as Record<string, any>) || {},
            dynamicConfig, // Perduodame visą config
            portfolioContext // <--- PERDUODAME NAUJĄ KONTEKSTĄ
        );

        if (!decisionsResult?.response) {
            console.warn(`[${username}] RiskManager returned no decisions. Ending cycle.`);
            return;
        }
        const allDecisions = decisionsResult.response as Record<string, any>;
        await activityLogger.log({ cycleId, username, agentName: 'RiskManager', status: 'DATA_FLOW', payload: decisionsResult?.response, flowTo: 'PortfolioAllocator' });

        // --- ŽINGSNIS 4: Kapitalo Paskirstymas ---
        const portfolioAllocator = agentService.getAgent('PortfolioAllocator') as PortfolioAllocator;
        const buySignals = Object.entries(allDecisions)
            .filter(([, dec]) => dec.decision === 'BUY' || dec.decision === 'SELL_SHORT')
            .map(([symbol, dec]) => ({ symbol, ...dec }));

        if (buySignals.length === 0) {
            console.log(`[${username}] No new BUY/SELL_SHORT signals from RiskManager.`);
            // TODO: Log AVOID decisions to missed opportunities
            return;
        }

        const adaptedConfig = RiskAdapter.adaptConfig(strategyConfig as any, macroAnalysis.regime_score);
        const sharedContext = new SharedContext();

        await activityLogger.log({ cycleId, username, agentName: 'PortfolioAllocator', status: 'ANALYZING' });
        const allocationResult = await portfolioAllocator.allocate(buySignals, updatedPortfolio, macroAnalysis, sentimentAnalysis, sharedContext, undefined, undefined, adaptedConfig);
        if (!allocationResult?.response) {
            console.error(`[${username}] PortfolioAllocator failed. Aborting trades.`);
            return;
        }
        const allocations = allocationResult.response as Record<string, any>;
        await activityLogger.log({ cycleId, username, agentName: 'PortfolioAllocator', status: 'SUCCESS', payload: allocationResult?.response });

        // --- ŽINGSNIS 5: Prekybos Vykdymas ir Log'inimas ---
        for (const symbol in allocations) {
            try {
                const allocation = allocations[symbol];
                const decision = allDecisions[symbol];
                const currentPrice = await binanceService.getCurrentPrice(symbol);

                if (!currentPrice) {
                    console.warn(`[${username}] Could not fetch price for ${symbol}. Skipping trade.`);
                    continue;
                }

                const amount = allocation.amount_to_buy_usd / currentPrice;
                const riskParams = {
                    capitalPerTradePercent: dynamicConfig.strategies.main_ai.risk_management.capital_per_trade_percent,
                    stopLossPercentage: decision.stop_loss_percentage,
                    takeProfitPercentage: decision.take_profit_percent
                };

                // --- NAUJAS BLOKAS: Pilno Konteksto Surinkimas ---
                const fullDecisionContext = {
                    decision: decision,
                    analysis: {
                        macro: macroAnalysis,
                        sentiment: sentimentAnalysis,
                        technical: batchTechAnalyses[symbol],
                        onchain: (onChainResult?.response as any)?.[symbol],
                        social: (socialResult?.response as any)?.[symbol],
                    },
                    pastLessons: await memoryService.recallMemories(`Trade for ${symbol}`, 5),
                    timestamp: new Date().toISOString()
                };
                // --- BLOKO PABAIGA ---

                if (decision.decision === 'BUY') {
                    await portfolioService.buy(symbol, amount, currentPrice, riskParams, fullDecisionContext);
                    await activityLogger.log({ cycleId, username, agentName: 'Execution', status: 'SUCCESS', payload: { action: 'BUY', symbol, amount } });
                    console.log(`[${username}] EXECUTED BUY: ${amount.toFixed(5)} of ${symbol} for $${allocation.amount_to_buy_usd.toFixed(2)}`);
                } else if (decision.decision === 'SELL_SHORT') {
                    await portfolioService.openShort(symbol, amount, currentPrice, riskParams, fullDecisionContext);
                    await activityLogger.log({ cycleId, username, agentName: 'Execution', status: 'SUCCESS', payload: { action: 'SELL_SHORT', symbol, amount } });
                    console.log(`[${username}] EXECUTED SELL_SHORT: ${amount.toFixed(5)} of ${symbol} for $${allocation.amount_to_buy_usd.toFixed(2)}`);
                }

                // Log decision and save to memory
                await decisionLogger.log({ symbol, decision: decision.decision, reason: decision.final_summary, price: currentPrice });
                await memoryService.addMemory({
                    symbol,
                    outcome: 'profit', // Placeholder, outcome is unknown at this point
                    pnl_percent: 0, // Placeholder
                    timestamp: new Date().toISOString(),
                    narrative: `Decision: ${decision.decision}. Reason: ${decision.final_summary}. Macro: ${macroAnalysis.market_regime} (${macroAnalysis.regime_score.toFixed(1)}). Sentiment: ${sentimentAnalysis.sentiment} (${sentimentAnalysis.sentiment_score.toFixed(2)}).`
                });

            } catch (error) {
                console.error(`[${username}] FAILED to execute trade for ${symbol}:`, error);
            }
        }

    } catch (error) {
        console.error(`[${username}] CRITICAL ERROR in trading cycle:`, error);
        await activityLogger.log({ cycleId, username, agentName: 'System', status: 'ERROR', payload: { error: (error as Error).message } });
    }
}

/**
 * Vykdo savęs tobulinimo ciklą: generuoja naują "shadow" strategiją arba
 * palygina esamos rezultatus su pagrindine strategija.
 */
export async function runSelfImprovementCycle(username: string, agentService: AgentService) {
    console.log(`[${username}] Starting self-improvement cycle...`);

    const user = await prisma.user.findUnique({
        where: { username },
        include: { configuration: true }
    });
    if (!user?.configuration) return;
    const userConfig = user.configuration;

    const hasShadowConfig = userConfig.shadowConfig && Object.keys(userConfig.shadowConfig).length > 0;

    if (hasShadowConfig) {
        // --- ŽINGSNIS 3: Rezultatų Palyginimas (MasterAgent) ---
        // Ši dalis yra supaprastinta demonstracijai. Realiame pasaulyje čia būtų
        // sudėtingi Sharpe, Calmar ir kt. skaičiavimai.
        const masterAgent = new MasterAgent(agentService);
        const executionService = new PaperExecutionService();
        const mainPortfolioService = new PortfolioService(username, 'MAIN', executionService);
        const shadowPortfolioService = new PortfolioService(username, 'SHADOW', executionService);

        const mainPortfolio = await mainPortfolioService.getPortfolio();
        const shadowPortfolio = await shadowPortfolioService.getPortfolio();

        if (!mainPortfolio || !shadowPortfolio) return;

        console.log(`[${username}] MasterAgent is comparing portfolios. Main: $${mainPortfolio.balance.toFixed(2)}, Shadow: $${shadowPortfolio.balance.toFixed(2)}`);

        // Supaprastintas "paaukštinimo" kriterijus: shadow portfelis turi būti 10% pelningesnis
        if (shadowPortfolio.balance > mainPortfolio.balance * 1.10) {
            console.log(`[${username}] MASTER AGENT PROMOTED SHADOW STRATEGY!`);
            await prisma.userConfiguration.update({
                where: { userId: username },
                data: {
                    strategyConfig: userConfig.shadowConfig as Prisma.InputJsonValue,
                    shadowConfig: Prisma.JsonNull,
                }
            });
            await prisma.portfolio.deleteMany({ where: { userId: username, type: 'SHADOW' }});
        } else {
             console.log(`[${username}] Master Agent rejected shadow strategy due to insufficient performance.`);
             await prisma.userConfiguration.update({
                where: { userId: username },
                data: { shadowConfig: Prisma.JsonNull }
             });
             await prisma.portfolio.deleteMany({ where: { userId: username, type: 'SHADOW' }});
        }

    } else {
        // --- ŽINGSNIS 2: Naujos Strategijos Generavimas (StrategyOptimizer) ---
        const optimizer = new StrategyOptimizer(agentService);
        const portfolioService = new PortfolioService(username, 'MAIN', new PaperExecutionService());
        const tradeLogs = await portfolioService.getTradeLogs();

        if (tradeLogs.length < 10) { // Reikalavimas: bent 10 sandorių
            console.log(`[${username}] Not enough trade data (${tradeLogs.length}) to generate a shadow strategy.`);
            return;
        }

        const analysisResult = await optimizer.analyze(tradeLogs, [], []);
        if (analysisResult?.response?.suggested_settings) {
            console.log(`[${username}] StrategyOptimizer generated a new shadow strategy.`);
            const newShadowConfig = analysisResult.response.suggested_settings as any;

            await prisma.$transaction([
                prisma.userConfiguration.update({
                    where: { userId: username },
                    data: { shadowConfig: newShadowConfig }
                }),
                prisma.portfolio.create({
                    data: {
                        userId: username,
                        balance: 100000, // Pradinis balansas
                        type: 'SHADOW'
                    }
                })
            ]);
        }
    }
}

export async function runOnDemandAnalysis(jobId: string, username: string, symbol: string, agentService: AgentService) {
    const resultKey = `on-demand-result:${jobId}`;
    try {
        await redis.set(resultKey, JSON.stringify({ status: 'PROCESSING' }), 'EX', 300); // Rezultatas galios 5 minutes

        const binance = new BinanceService();
        const techAnalyst = agentService.getAgent('TechnicalAnalyst') as TechnicalAnalyst;
        const riskManager = agentService.getAgent('RiskManager') as RiskManager;

        // Supaprastinta analizės seka
        const candles = await binance.getHistoricalData(symbol, '1h', 200);
        if (candles.length < 50) throw new Error('Not enough historical data.');

        const techAnalysisResult = (await techAnalyst.analyzeBatch([{ symbol, candles }], {}))?.response?.[symbol];

        // Naudojame supaprastintą globalų kontekstą (ateityje galima patobulinti)
        const macroAnalysis = (await (agentService.getAgent('MacroAnalyst') as any).analyze({}, [], null, null, new SharedContext()))?.response;
        const sentimentAnalysis = (await (agentService.getAgent('SentimentAnalyst') as any).analyze([], [], new SharedContext()))?.response;

        const advisoryResult = await riskManager.provideAdvisory(symbol, techAnalysisResult, macroAnalysis, sentimentAnalysis);

        if (!advisoryResult) throw new Error('RiskManager failed to provide advisory.');

        await redis.set(resultKey, JSON.stringify({ status: 'COMPLETED', data: advisoryResult.response }), 'EX', 300);

    } catch (error) {
        console.error(`[ON-DEMAND WORKER] Failed job #${jobId} for ${symbol}:`, error);
        await redis.set(resultKey, JSON.stringify({ status: 'FAILED', error: (error as Error).message }), 'EX', 300);
    }
}

export async function runScalperCycle(agentService: AgentService) {
    console.log(`[SCALPER ENGINE] Starting new global scalper cycle...`);
    const opportunityScanner = OpportunityScanner.getInstance();
    const binanceService = new BinanceService();

    // 1. Surenkame duomenis
    const opportunities = await opportunityScanner.getOpportunities();
    const newOpportunities = opportunities.filter(o => o.status === 'detected');

    const activeScalperUsers = await prisma.user.findMany({
        where: {
            configuration: {
                strategyConfig: {
                    path: ['active_strategy'],
                    equals: 'scalper'
                }
            }
        },
        include: { configuration: true }
    });

    if (newOpportunities.length === 0 || activeScalperUsers.length === 0) {
        // TODO: Pridėti atidarytų scalper pozicijų valdymo logiką čia
        return;
    }

    // 2. Grupinė analizė
    const techAnalyst = agentService.getAgent('TechnicalAnalyst') as TechnicalAnalyst;
    for (const opp of newOpportunities) {
        const candles = await binanceService.getHistoricalData(opp.symbol, '1m', 100);
        if (candles.length < 50) continue;

        const analysisResult = await techAnalyst.analyzeForScalping(opp.symbol, candles);

        if (analysisResult?.response?.is_strong_impulse) {
            console.log(`[SCALPER ENGINE] Strong impulse confirmed for ${opp.symbol}. Opening scout positions.`);
            // 3. Vykdome prekybą atitinkamiems vartotojams
            for (const user of activeScalperUsers) {
                try {
                    const executionService = new PaperExecutionService();
                    const portfolioService = new PortfolioService(user.username, 'MAIN', executionService);
                    const config = user.configuration!.strategyConfig as any;
                    const profile = config.strategies.scalper.profiles[config.strategies.scalper.active_profile];

                    // Atidarome "scout" poziciją su 10% standartinio dydžio
                    const capitalForTrade = (await portfolioService.getPortfolio())!.balance * (profile.capital_per_trade_percent / 100);
                    const scoutAmountUSD = capitalForTrade * 0.1;

                    // Svarbu: `buy` metodui reikia daugiau parametrų, čia supaprastinta
                    // Realiame kode reikėtų sukurti riskParameters ir decisionContext objektus
                    const riskParams = {
                        capitalPerTradePercent: profile.capital_per_trade_percent,
                        stopLossPercentage: 0.02,
                        takeProfitPercentage: 0.04
                    };
                    await portfolioService.buy(opp.symbol, scoutAmountUSD / candles[candles.length - 1].close, candles[candles.length - 1].close, riskParams, {}, 'scout', 'scalper');

                    await opportunityScanner.updateOpportunityStatus(opp.symbol, 'bought'); // Pažymime kaip apdorotą
                } catch (error) {
                    console.error(`[SCALPER ENGINE] Failed to open scout position for ${user.username} on ${opp.symbol}:`, error);
                }
            }
        } else {
             await opportunityScanner.updateOpportunityStatus(opp.symbol, 'ignored');
        }
    }
}
