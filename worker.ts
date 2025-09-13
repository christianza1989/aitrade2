// worker.ts

import { PrismaClient } from '@prisma/client';
import { AgentService } from './src/core/agent-service';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, PortfolioAllocator, PositionManager, OnChainAnalyst, SocialMediaAnalyst, MacroAnalysisResult, SentimentAnalysisResult, MarketRegimeAgent } from './src/core/agents';
import { runMainAiCycle, runSelfImprovementCycle, runScalperCycle } from './src/core/trading-cycles';
import { BinanceService } from './src/core/binance';
import { NewsService } from './src/core/news';
import { CoinMarketCapService } from './src/core/coinmarketcap';
import { SharedContext } from './src/core/context';
import { tradingCycleQueue, initializeTradingWorker, initializeOnDemandWorker, initializeChatWorker, memoryAnalysisQueue, initializeMemoryAnalysisWorker } from './src/core/job-queue';
import { checkProfitAtRisk } from './src/core/triggers/profitAtRisk';
import { PortfolioService } from './src/core/portfolio';
import { PaperExecutionService } from './src/core/services/ExecutionService';
import { getRedisClient } from './src/lib/redis';

const prisma = new PrismaClient();
const redis = getRedisClient();

// --- Globalūs, ilgaamžiai objektai ---
export const globalAgentService = new AgentService();
globalAgentService.register(new MacroAnalyst(globalAgentService));
globalAgentService.register(new SentimentAnalyst(globalAgentService));
globalAgentService.register(new TechnicalAnalyst(globalAgentService));
globalAgentService.register(new PortfolioAllocator(globalAgentService));
globalAgentService.register(new PositionManager(globalAgentService));
globalAgentService.register(new OnChainAnalyst(globalAgentService));
globalAgentService.register(new SocialMediaAnalyst(globalAgentService));

/**
 * Tikriname, ar klaida yra laikina (pvz., tinklo sutrikimas), ar nuolatinė.
 * @param error Klaidos objektas.
 * @returns true, jei klaidą verta bandyti vykdyti iš naujo.
 */
function isRetryableError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        const status = (error.response as { status: number }).status;
        // Laikinos klaidos: per didelė apkrova, serverio klaida, vartų klaida
        return [429, 500, 502, 503, 504].includes(status);
    }
    // Tinklo klaidos
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ECONNRESET' || (error as { code: string }).code === 'ETIMEDOUT') {
        return true;
    }
    return false;
}

/**
 * Ši funkcija yra apdorojimo logika, kurią kvies BullMQ darbininkas.
 */
export async function processUserForQueue(
    username: string,
    macroAnalysis: MacroAnalysisResult,
    sentimentAnalysis: SentimentAnalysisResult,
    marketRegime: string, // NAUJA
    regimeTimestamp: string // NAUJA
) {
    try {
        // Šviežumo patikrinimas
        const MAX_STALE_MS = 5 * 60 * 1000; // 5 minutės
        if (new Date().getTime() - new Date(regimeTimestamp).getTime() > MAX_STALE_MS) {
            console.warn(`[WORKER] Stale market regime data for user ${username}. Falling back to default strategy.`);
            marketRegime = 'default';
        }

        const cacheKey = `config:${username}`;
        const cachedConfig = await redis.get(cacheKey);
        let userConfigData;

        if (cachedConfig) {
            userConfigData = JSON.parse(cachedConfig);
        } else {
            userConfigData = await prisma.userConfiguration.findUnique({ where: { userId: username } });
            if (userConfigData) {
                await redis.set(cacheKey, JSON.stringify(userConfigData), 'EX', 3600); // Cache for 1 hour
            }
        }

        if (!userConfigData) {
            console.warn(`[WORKER] No config for user ${username}.`);
            return;
        }

        const { strategyConfig, shadowConfig } = userConfigData;

        // --- NAUJA STRATEGIJOS PARINKIMO LOGIKA ---
        const getActiveStrategyConfig = (config: { strategy_mapping: { [x: string]: any; }; strategies: { [x: string]: any; }; }) => {
            if (!config || !config.strategy_mapping || !config.strategies) return null;
            const strategyName = config.strategy_mapping[marketRegime] || config.strategy_mapping['default'];
            return config.strategies[strategyName] || null;
        };

        const mainStrategy = getActiveStrategyConfig(strategyConfig);
        const shadowStrategy = getActiveStrategyConfig(shadowConfig);
        // --- PABAIGA ---

        const riskManager = new RiskManager(globalAgentService, username);
        globalAgentService.register(riskManager);

        const cyclePromises: Promise<void>[] = [];

        if (mainStrategy) {
            console.log(`[WORKER] User ${username} (Main): Running strategy '${mainStrategy.strategy_name}' for market regime '${marketRegime}'.`);
            cyclePromises.push(runMainAiCycle(username, mainStrategy, globalAgentService, macroAnalysis, sentimentAnalysis));
        }
        if (shadowStrategy) {
             console.log(`[WORKER] User ${username} (Shadow): Running strategy '${shadowStrategy.strategy_name}' for market regime '${marketRegime}'.`);
            cyclePromises.push(runMainAiCycle(username, shadowStrategy, globalAgentService, macroAnalysis, sentimentAnalysis));
        }

        await Promise.all(cyclePromises);
    } catch (error) {
        console.error(`[WORKER] ERROR processing job for user ${username}:`, error);
        if (isRetryableError(error)) {
            throw error; // Metame klaidą atgal, kad BullMQ galėtų bandyti iš naujo
        }
        // Jei klaida nelaikina, nieko nedarome, ir BullMQ jos nebekartos.
    }
}

/**
 * Pagrindinis ciklas, kuris dabar veikia kaip UŽDUOČIŲ GAMINTOJAS (Producer).
 */
async function mainLoopProducer() {
    console.log(`[PRODUCER @ ${new Date().toLocaleTimeString()}] --- Starting new global cycle to queue jobs ---`);
    try {
        const macroAnalyst = globalAgentService.getAgent('MacroAnalyst') as MacroAnalyst;
        const sentimentAnalyst = globalAgentService.getAgent('SentimentAnalyst') as SentimentAnalyst;
        const marketRegimeAgent = new MarketRegimeAgent(globalAgentService);
        const binanceService = new BinanceService();
        const newsService = new NewsService();
        const cmcService = new CoinMarketCapService();
        const sharedContext = new SharedContext();

        const [btc4hCandles, btcData, news, fng, globalMetrics] = await Promise.all([
            binanceService.getHistoricalData('BTCUSDT', '4h', 100), // Gaukime daugiau duomenų režimui nustatyti
            binanceService.getHistoricalData('BTCUSDT', '4h', 1),
            newsService.getCryptoNews(),
            cmcService.getFearAndGreedIndex(),
            cmcService.getGlobalMetrics()
        ]);

        const macroResult = await macroAnalyst.analyze(btcData[0] || {}, news.map(a => a.title), fng, globalMetrics, sharedContext);
        const sentimentResult = await sentimentAnalyst.analyze(news, [], sharedContext);
        const marketRegimeResult = await marketRegimeAgent.analyze(btc4hCandles);

        // --- PRIDĖTI ŠĮ BLOKĄ ---
        try {
            if (marketRegimeResult?.response?.regime) {
                await redis.set('global_market_regime', marketRegimeResult.response.regime as string, 'EX', 60 * 20); // Galioja 20 minučių
            }
        } catch (e) {
            console.error('[PRODUCER] Failed to set global_market_regime in Redis:', e);
        }
        // --- BLOKO PABAIGA ---

        if (!macroResult?.response || !sentimentResult?.response || !marketRegimeResult?.response) {
            console.error('[PRODUCER] Failed to get global market analysis or regime. Skipping this cycle.');
            return;
        }

        const allUsers = await prisma.user.findMany({ select: { username: true } });
        for (const user of allUsers) {
            await tradingCycleQueue.add('process-user', {
                username: user.username,
                macroAnalysis: macroResult.response,
                sentimentAnalysis: sentimentResult.response,
                marketRegime: marketRegimeResult.response.regime, // NAUJA
                regimeTimestamp: new Date().toISOString() // NAUJA
            });
        }
        console.log(`[PRODUCER] Successfully queued ${allUsers.length} jobs.`);

        // Vykdome savęs tobulinimo ciklą po to, kai visos užduotys suplanuotos
        for (const user of allUsers) {
            // Vykdome nuosekliai, kad išvengtume "race conditions" su DB
            await runSelfImprovementCycle(user.username, globalAgentService);
        }

    } catch (error) {
        console.error('[PRODUCER] Failed to queue jobs:', error);
    }
}

async function runObserverCycle() {
    console.log(`[OBSERVER @ ${new Date().toLocaleTimeString()}] --- Starting new global observer cycle ---`);
    try {
        const marketRegime = await redis.get('global_market_regime') as string | null;
        if (!marketRegime) {
            console.log('[OBSERVER] Market regime not set yet, skipping cycle.');
            return;
        }

        const activeUsers = await prisma.user.findMany({
            where: {
                // TODO: Ateityje čia bus filtras pagal vartotojo nustatymus
            },
            select: { username: true }
        });

        await Promise.all(activeUsers.map(async (user) => {
            try {
                const portfolioService = new PortfolioService(user.username, 'MAIN', new PaperExecutionService());
                const portfolio = await portfolioService.getPortfolio();
                if (!portfolio) return;

                // --- Kiekvienam trigeriui ---
                const profitAtRiskInsight = await checkProfitAtRisk(user.username, portfolio, marketRegime);
                if (profitAtRiskInsight) {
                    const channel = `user-notifications:${user.username}`;
                    const payload = JSON.stringify({
                        type: 'proactive_insight',
                        message: profitAtRiskInsight
                    });
                    await redis.publish(channel, payload);
                }
                // --- Čia bus galima pridėti kitus trigerius ---

            } catch (e) {
                console.error(`[OBSERVER] Failed to process user ${user.username}:`, e);
            }
        }));

    } catch (error) {
        console.error('[OBSERVER] Critical error in observer cycle:', error);
    }
}

async function startWorker() {
    console.log('--- AI Trading Bot Multi-User Worker Started ---');
    const mainCycleIntervalMinutes = 15;
    const scalperCycleIntervalMinutes = 1;
    const observerCycleIntervalMinutes = 5;

    // Paleidžiame darbininkus
    initializeTradingWorker();
    initializeOnDemandWorker();
    initializeChatWorker();
    initializeMemoryAnalysisWorker();

    // Paleidžiame "gamintoją" pagrindiniam ciklui
    setInterval(mainLoopProducer, mainCycleIntervalMinutes * 60 * 1000);
    mainLoopProducer();

    // --- NAUJAS BLOKAS: Paleidžiame "Scalper" variklį ---
    setInterval(() => runScalperCycle(globalAgentService), scalperCycleIntervalMinutes * 60 * 1000);
    runScalperCycle(globalAgentService);
    // --- BLOKO PABAIGA ---

    // Paleidžiame Observer ciklą
    setInterval(() => runObserverCycle(), observerCycleIntervalMinutes * 60 * 1000);
    runObserverCycle();

    // ... (po esamų setInterval)
    const memoryAnalysisIntervalHours = 6;
    setInterval(async () => {
        console.log(`[PRODUCER] Queuing memory analysis jobs for all users...`);
        const allUsers = await prisma.user.findMany({ select: { username: true } });
        for (const user of allUsers) {
            // Unikalus job ID, kad išvengtume dublikatų
            await memoryAnalysisQueue.add('analyze-memory', { username: user.username }, { jobId: `mem-analysis-${user.username}` });
        }
    }, memoryAnalysisIntervalHours * 60 * 60 * 1000);
}

startWorker();
