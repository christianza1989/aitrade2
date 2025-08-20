// src/app/api/intel-data/route.ts

import { NextResponse } from 'next/server';
import { CoinMarketCapService } from '@/core/coinmarketcap';

export const dynamic = 'force-dynamic'; // Ensure the response is not cached

export async function GET() {
    try {
        const cmc = new CoinMarketCapService();

        // Fetch all data points in parallel for efficiency
        const [
            globalMetrics,
            topNarratives,
            airdrops,
            gainersLosers,
            trendingTokens
        ] = await Promise.all([
            cmc.getGlobalMetrics(),
            cmc.getCategories(),
            cmc.getAirdrops(),
            cmc.getTrendingGainersAndLosers(),
            cmc.getTrendingTokens()
        ]);

        const intelData = {
            globalMetrics: globalMetrics?.quote?.USD,
            topNarratives,
            catalystCalendar: airdrops,
            dailyMovers: {
                gainers: gainersLosers?.gainers,
                losers: gainersLosers?.losers,
            },
            communityPulse: {
                trendingTokens,
            },
        };

        return NextResponse.json(intelData);

    } catch (error) {
        console.error("[Intel-Data API] Error fetching market intelligence data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}