// src/app/dashboard/intel/page.tsx
"use client";

import { TopNarrativesCard } from '@/components/TopNarrativesCard';
import { CatalystCalendarCard } from '@/components/CatalystCalendarCard';
import { GainersLosersCard } from '@/components/GainersLosersCard';
import { CoinMarketCapService } from '@/core/coinmarketcap';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LoaderCircle } from 'lucide-react';

// Duomenų struktūrų apibrėžimai
interface IntelData {
    globalMetrics: any;
    topNarratives: any[] | null;
    catalystCalendar: any[] | null;
    dailyMovers: {
        gainers: any[] | null;
        losers: any[] | null;
    } | null;
    communityPulse: {
        trendingTokens: any[] | null;
    };
}

// Pagrindinis komponentas
export default function MarketIntelPage() {
    const [intelData, setIntelData] = useState<IntelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchIntelData = async () => {
            setIsLoading(true);
            const toastId = toast.loading("Fetching Market Intelligence...");
            try {
                // Laikinai paliekame tiesioginį API kvietimą iš kliento pusės,
                // nes šiems duomenims nereikia autorizacijos.
                // Ateityje tai galėtų būti perkelta į atskirą API maršrutą.
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

                setIntelData({
                    globalMetrics: globalMetrics?.quote?.USD,
                    topNarratives,
                    catalystCalendar: airdrops,
                    dailyMovers: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        gainers: (gainersLosers as any)?.gainers,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        losers: (gainersLosers as any)?.losers,
                    },
                    communityPulse: {
                        trendingTokens,
                    },
                });
                toast.success("Intelligence data loaded!", { id: toastId });
            } catch (error) {
                console.error("[Intel Page] Failed to fetch data:", error);
                toast.error("Could not load intelligence data.", { id: toastId });
            } finally {
                setIsLoading(false);
            }
        };

        fetchIntelData();
    }, []);

    return (
        <div className="text-white p-4 sm:p-6 space-y-6">
            <h1 className="text-2xl font-bold">Market Intelligence</h1>

            {isLoading ? (
                 <div className="flex items-center justify-center h-64">
                    <LoaderCircle className="animate-spin mr-3" size={24} />
                    <span>Loading Intel...</span>
                </div>
            ) : intelData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TopNarrativesCard narratives={intelData.topNarratives} />
                    <CatalystCalendarCard airdrops={intelData.catalystCalendar} />
                    <GainersLosersCard movers={intelData.dailyMovers} />

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
                <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg">
                    <p>Failed to load Market Intelligence data. API might be unavailable or keys are invalid.</p>
                </div>
            )}
        </div>
    );
}
