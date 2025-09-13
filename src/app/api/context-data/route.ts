// src/app/api/context-data/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BinanceService } from '@/core/binance';
import { CoinMarketCapService } from '@/core/coinmarketcap';
import { AgentService } from '@/core/agent-service';
import { MacroAnalyst, SentimentAnalyst } from '@/core/agents';
import { SharedContext } from '@/core/context';
import { NewsService } from '@/core/news';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    try {
        const binance = new BinanceService();
        const coinMarketCapService = new CoinMarketCapService();
        const newsService = new NewsService();
        const agentService = new AgentService();
        const sharedContext = new SharedContext();
        agentService.register(new MacroAnalyst(agentService));
        agentService.register(new SentimentAnalyst(agentService));
        const macroAnalyst = agentService.getAgent('MacroAnalyst') as MacroAnalyst;
        const sentimentAnalyst = agentService.getAgent('SentimentAnalyst') as SentimentAnalyst;

        const [
            fearAndGreedIndex,
            newsArticles,
            btcData,
            globalMetrics
        ] = await Promise.all([
            coinMarketCapService.getFearAndGreedIndex(),
            newsService.getCryptoNews(),
            binance.getHistoricalData('BTCUSDT', '4h', 1),
            coinMarketCapService.getGlobalMetrics()
        ]);

        if (fearAndGreedIndex) {
            sharedContext.updateContext({ fearAndGreedIndex });
        }

        await macroAnalyst.analyze(btcData?.[0] || {}, newsArticles.map(a => a.title), fearAndGreedIndex, globalMetrics, sharedContext);
        await sentimentAnalyst.analyze(newsArticles, [], sharedContext);
        
        return NextResponse.json({ 
            context: sharedContext.getContext() 
        });

    } catch (error) {
        console.error("[ContextData API] Error fetching context data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred";
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}