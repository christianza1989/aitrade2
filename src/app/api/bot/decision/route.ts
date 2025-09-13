import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { NewsService } from '@/core/news'; // Import NewsService
import { CoinMarketCapService } from '@/core/coinmarketcap'; // Import CoinMarketCapService
import { AgentService } from '@/core/agent-service';
import { MacroAnalyst, SentimentAnalyst, TechnicalAnalyst, RiskManager, Analysis, PositionManager } from '@/core/agents'; // Import MacroAnalyst, SentimentAnalyst, PositionManager
import { SharedContext } from '@/core/context';
import { globalSharedContext } from '@/core/global-context'; // Import globalSharedContext
import { OpportunityScanner } from '@/core/opportunity-scanner';
import { PortfolioService } from '@/core/portfolio'; // Import PortfolioService
import { PaperExecutionService } from '@/core/services/ExecutionService';
import { DecisionLogger } from '@/core/decision-logger'; // Import DecisionLogger
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const opportunityScanner = OpportunityScanner.getInstance();
        await opportunityScanner.updateOpportunityStatus(symbol, 'analyzing');

        // Initialize services and agents
        const binance = new BinanceService();
        const newsService = new NewsService(); // Initialize NewsService
        const coinMarketCapService = new CoinMarketCapService(); // Initialize CoinMarketCapService
        const agentService = new AgentService(); // Initialize AgentService
        const macroAnalyst = new MacroAnalyst(agentService); // Initialize MacroAnalyst
        const sentimentAnalyst = new SentimentAnalyst(agentService); // Initialize SentimentAnalyst
        const techAnalyst = new TechnicalAnalyst(agentService);
        const riskManager = new RiskManager(agentService, session.user.name);
        const positionManager = new PositionManager(agentService); // Initialize PositionManager
        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(session.user.name, 'MAIN', executionService); // Initialize PortfolioService
        const decisionLogger = new DecisionLogger(session.user.name); // Initialize DecisionLogger
        // Use the global shared context
        const sharedContext = globalSharedContext;

        // Load user-specific configuration from database
        const userConfig = await prisma.userConfiguration.findUnique({
            where: { userId: session.user.name },
        });

        if (!userConfig || !userConfig.strategyConfig) {
            return NextResponse.json({ error: `Configuration not found for user ${session.user.name}.` }, { status: 500 });
        }

        // Use Record<string, unknown> for flexible config object
        const config = userConfig.strategyConfig as Record<string, unknown>;

        // Fetch necessary data for AI decision
        const candles = await binance.getHistoricalData(symbol, '5m', 100);
        if (candles.length === 0) {
            throw new Error(`Could not fetch historical data for ${symbol}`);
        }

        const btcData = await binance.getHistoricalData('BTCUSDT', '4h', 1);
        const newsArticles = await newsService.getCryptoNews();
        // Get Fear and Greed Index from global context
        const fearAndGreedIndex = sharedContext.getContext().fearAndGreedIndex;

        // Perform real macro and sentiment analysis
        const macroAnalysisResult = await macroAnalyst.analyze(
            btcData[0] || {},
            newsArticles.map(a => a.title),
            fearAndGreedIndex, // Pass directly from shared context
            null, // globalMetrics should be null if not fetched here
            sharedContext
        );
        const sentimentAnalysisResult = await sentimentAnalyst.analyze(newsArticles, [], sharedContext); // Added empty array for trendingTokens

        const macroAnalysis = macroAnalysisResult?.response;
        const sentimentAnalysis = sentimentAnalysisResult?.response;

        // Get current position details
        const portfolio = await portfolioService.getPortfolio();
        if (!portfolio) {
            throw new Error(`Portfolio not found for user.`);
        }
        const position = portfolio.positions.find(p => p.symbol === symbol);

        if (!position) {
            throw new Error(`Position for ${symbol} not found in portfolio.`);
        }

        const currentPrice = await binance.getCurrentPrice(symbol);
        if (!currentPrice) {
            throw new Error(`Could not fetch current price for ${symbol}`);
        }

        // Invoke PositionManager for decision
        const decisionResult = await positionManager.decide(position, currentPrice, macroAnalysis || {}, sentimentAnalysis || {}, config, []);
        const decisionData = decisionResult?.response as { decision?: string; new_take_profit_percent?: number; reason?: string };

        if (decisionData?.decision) {
            await decisionLogger.log({
                symbol: position.symbol,
                decision: decisionData.decision === 'SELL_NOW' ? 'SELL' : 'HOLD', // Map to correct DecisionLogEntry types
                pnlPercent: (currentPrice - position.entryPrice) / position.entryPrice * 100,
                price: currentPrice,
                newTakeProfitPercent: decisionData.new_take_profit_percent,
                reason: decisionData.reason || 'N/A',
            });

            if (decisionData.decision === 'SELL_NOW') {
                await portfolioService.sell(position.symbol, position.amount, currentPrice, `PositionManager Decision: ${decisionData.reason}`);
                await opportunityScanner.updateOpportunityStatus(symbol, 'sold'); // Update status if sold
                return NextResponse.json({ symbol, decision: 'SELL', reason: decisionData.reason });
            } else if (decisionData.decision === 'HOLD_AND_INCREASE_TP' && decisionData.new_take_profit_percent) {
                await portfolioService.updatePosition(position.symbol, { takeProfitPercent: decisionData.new_take_profit_percent });
                await opportunityScanner.updateOpportunityStatus(symbol, 'held'); // Update status if held
                return NextResponse.json({ symbol, decision: 'HOLD', new_tp: decisionData.new_take_profit_percent, reason: decisionData.reason });
            }
        }

        // Fallback if no decision or unexpected decision
        await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
        return NextResponse.json({ symbol, decision: 'AVOID', reason: 'AI decision inconclusive or unexpected.' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Decision API] Error analyzing ${symbol}:`, errorMessage);
        // If analysis fails, mark as ignored to prevent retries
        const opportunityScanner = OpportunityScanner.getInstance();
        await opportunityScanner.updateOpportunityStatus(symbol, 'ignored');
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
