// src/components/HiveMindDisplay.tsx

"use client";

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Flame, Gauge, TrendingUp, HelpCircle } from 'lucide-react';

// This is mock data that simulates the full context object.
// Later, it will be replaced by `useDashboard` state.
const mockContext = {
    marketRegime: 'Risk-On',
    regimeScore: 7.8,
    sentiment: 'Bullish',
    sentimentScore: 0.6,
    fearAndGreed: { value: 72, classification: 'Greed' },
    btcDominance: 45.8,
    totalMarketCap: 2.1, // In trillions
    dominantNarrative: 'AI Tokens',
};

const RegimeBadge = ({ regime }: { regime: string }) => {
    const color = regime === 'Risk-On' ? 'bg-green-600' : regime === 'Risk-Off' ? 'bg-red-600' : 'bg-gray-600';
    return <Badge className={`${color} text-white`}>{regime.replace('-', ' ')}</Badge>;
};

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const color = sentiment === 'Bullish' ? 'bg-green-600' : sentiment === 'Bearish' ? 'bg-red-600' : 'bg-gray-600';
    return <Badge className={`${color} text-white`}>{sentiment}</Badge>;
};

const InfoRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex justify-between items-center text-sm py-2 border-b border-gray-800 last:border-none">
        <span className="text-gray-400 flex items-center">
            {label}
        </span>
        <span className="font-semibold">{children}</span>
    </div>
);

export function HiveMindDisplay() {
    // In the future, we will use the real context from the dashboard state:
    // const { state } = useDashboard();
    // const context = state.sharedContext;
    // if (!context) return <div>Loading Hive Mind...</div>;
    
    const context = mockContext; // Using mock data for now

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Macro Environment Card */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                    <Activity size={18} className="mr-2 text-gray-400" />
                    Macro Environment
                </h3>
                <div className="space-y-1">
                    <InfoRow label="Market Regime">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <RegimeBadge regime={context.marketRegime} />
                                </TooltipTrigger>
                                <TooltipContent><p>Score: {context.regimeScore.toFixed(1)} / 10.0</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </InfoRow>
                    <InfoRow label="Total Market Cap">
                        <span className="flex items-center">
                            ${context.totalMarketCap.toFixed(1)}T
                            <TrendingUp size={14} className="ml-1 text-green-500" />
                        </span>
                    </InfoRow>
                    <InfoRow label="BTC Dominance">
                         <span className="flex items-center">
                            {context.btcDominance.toFixed(1)}%
                            <TrendingUp size={14} className="ml-1 text-red-500" />
                        </span>
                    </InfoRow>
                </div>
            </div>

            {/* Market Sentiment Card */}
            <div className="bg-gray-800 p-4 rounded-lg">
                 <h3 className="font-semibold mb-2 flex items-center">
                    <Flame size={18} className="mr-2 text-gray-400" />
                    Market Sentiment
                </h3>
                <div className="space-y-1">
                    <InfoRow label="Overall Sentiment">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <SentimentBadge sentiment={context.sentiment} />
                                </TooltipTrigger>
                                <TooltipContent><p>Score: {context.sentimentScore.toFixed(2)} / 1.0</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </InfoRow>
                    <InfoRow label="Fear & Greed Index">
                        <span className="flex items-center text-yellow-400">
                           <Gauge size={14} className="mr-1.5" />
                           {context.fearAndGreed.value} - {context.fearAndGreed.classification}
                        </span>
                    </InfoRow>
                     <InfoRow label="Dominant Narrative">
                        <span>{context.dominantNarrative}</span>
                    </InfoRow>
                </div>
            </div>
        </div>
    );
}