// src/app/api/portfolio/close-short/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PortfolioService } from '@/core/portfolio';
import { BinanceService } from '@/core/binance';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { AgentService } from '@/core/agent-service';
import { PositionManager, MacroAnalyst, SentimentAnalyst } from '@/core/agents';
import { globalSharedContext } from '@/core/global-context';
import { NewsService } from '@/core/news';
import { CoinMarketCapService } from '@/core/coinmarketcap';
import { PaperExecutionService } from '@/core/services/ExecutionService';

const closeShortSchema = z.object({
    symbol: z.string().min(1, "Symbol is required"),
    amount: z.number().positive("Amount must be a positive number"),
    reason: z.string().optional(), // Vartotojo priežastis
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const username = session.user.name;

    try {
        const body = await req.json();
        const { symbol, amount, reason } = closeShortSchema.parse(body);

        const executionService = new PaperExecutionService();
        const portfolioService = new PortfolioService(username, 'MAIN', executionService);
        const binanceService = new BinanceService();

        const currentPrice = await binanceService.getCurrentPrice(symbol);
        if (!currentPrice) {
            return NextResponse.json({ success: false, error: 'Could not fetch current price' }, { status: 500 });
        }

        let feedbackPayload = undefined;

        // "Konflikto Naratyvo" logika vykdoma tik jei vartotojas pateikė priežastį
        if (reason) {
            try {
                // 1. Surinkti rinkos kontekstą
                const agentService = new AgentService(); // Laikina instancija
                const newsService = new NewsService();
                const cmcService = new CoinMarketCapService();

                const [btcData, news, fng, globalMetrics] = await Promise.all([
                    binanceService.getHistoricalData('BTCUSDT', '4h', 1),
                    newsService.getCryptoNews(),
                    cmcService.getFearAndGreedIndex(),
                    cmcService.getGlobalMetrics()
                ]);

                const macroAnalyst = new MacroAnalyst(agentService);
                const sentimentAnalyst = new SentimentAnalyst(agentService);

                const macroResult = await macroAnalyst.analyze(btcData[0] || {}, news.map(a => a.title), fng, globalMetrics, globalSharedContext);
                const sentimentResult = await sentimentAnalyst.analyze(news, [], globalSharedContext);
                const marketSnapshot = { ...macroResult?.response, ...sentimentResult?.response };

                // 2. Gauti AI nuomonę
                const portfolio = await portfolioService.getPortfolio();
                const position = portfolio?.positions.find(p => p.symbol === symbol);
                let aiDecision = { action: "N/A", reason: "Position not found or AI failed." };

                if (position) {
                    const positionManager = new PositionManager(agentService);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const aiOpinionResult = await positionManager.review_open_position(position, currentPrice, macroResult?.response as any, sentimentResult?.response as any, {});
                    if (aiOpinionResult?.response) {
                        aiDecision = {
                            action: aiOpinionResult.response.decision as string,
                            reason: aiOpinionResult.response.reason as string,
                        };
                    }
                }

                // 3. Suformuoti naratyvą ir kontekstą
                const pnl = (position?.entryPrice || 0) - currentPrice * amount;
                const pnlPercent = ((position?.entryPrice || 0) > 0) ? (pnl / (position!.entryPrice * amount)) * 100 : 0;

                const narrative = `Human-AI Conflict on ${symbol}: Teacher closed short with ${pnlPercent.toFixed(2)}% P/L. AI decision was to '${aiDecision.action}'.`;

                const context = {
                    humanDecision: { action: "CLOSE_SHORT", reason },
                    aiDecision: aiDecision,
                    marketSnapshot,
                };

                feedbackPayload = { narrative, context };

            } catch (e) {
                console.error("[Conflict Narrative Error] Failed to generate AI conflict data, but proceeding with close short:", e);
                // Klaidos atveju vis tiek leidžiame parduoti, bet be "konflikto" įrašo
            }
        }

        await portfolioService.closeShort(symbol, amount, currentPrice, 'Manual Close Short', undefined, feedbackPayload);

        const updatedPortfolio = await portfolioService.getPortfolio();
        return NextResponse.json({ success: true, data: updatedPortfolio });

    } catch (error) {
        if (error instanceof z.ZodError) {
            const validationError = fromZodError(error);
            return NextResponse.json({ success: false, error: validationError.message }, { status: 400 });
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in close-short API: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
