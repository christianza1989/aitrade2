// src/app/dashboard/intel/page.tsx

import { TopNarrativesCard } from '@/components/TopNarrativesCard';
import { CatalystCalendarCard } from '@/components/CatalystCalendarCard';
import { GainersLosersCard } from '@/components/GainersLosersCard';
import { CoinMarketCapService } from '@/core/coinmarketcap';

// This is now a Server Component. Data fetching happens on the server before the page is sent to the client.
async function getIntelData() {
    try {
        const cmc = new CoinMarketCapService();
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

        return {
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
    } catch (error) {
        console.error("[Intel Page] Failed to fetch server-side data:", error);
        return null; // Return null on error
    }
}

export default async function MarketIntelPage() {
    const intelData = await getIntelData();

    return (
        <div className="text-white p-4 sm:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Market Intelligence</h1>
            
            {intelData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TopNarrativesCard narratives={intelData.topNarratives || null} />
                    <CatalystCalendarCard airdrops={intelData.catalystCalendar || null} />
                    <GainersLosersCard movers={intelData.dailyMovers || null} />
                    
                    <div className="bg-gray-900 text-white p-4 rounded-lg md:col-span-2">
                        <h2 className="font-bold text-lg mb-2">Global Market Metrics</h2>
                        <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(intelData.globalMetrics, null, 2)}</pre>
                    </div>
                     <div className="bg-gray-900 text-white p-4 rounded-lg">
                        <h2 className="font-bold text-lg mb-2">Community Pulse</h2>
                         <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(intelData.communityPulse, null, 2)}</pre>
                    </div>
                </div>
            ) : (
                <div className="text-center text-red-400">
                    <p>Failed to load Market Intelligence data. Please check the server logs.</p>
                </div>
            )}
        </div>
    );
}