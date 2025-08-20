"use client";

import { ISharedContext } from '@/core/context';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SharedContextDisplayProps {
    context: ISharedContext | null;
}

const RegimeBadge = ({ regime }: { regime: ISharedContext['marketRegime'] }) => {
    const color = regime === 'Risk-On' ? 'bg-green-600' : regime === 'Risk-Off' ? 'bg-red-600' : 'bg-gray-600';
    return <Badge className={`${color} text-white`}>{regime.replace('-', ' ')}</Badge>;
};

const SentimentBadge = ({ sentiment }: { sentiment: ISharedContext['sentiment'] }) => {
    const color = sentiment === 'Bullish' ? 'bg-green-600' : sentiment === 'Bearish' ? 'bg-red-600' : 'bg-gray-600';
    return <Badge className={`${color} text-white`}>{sentiment}</Badge>;
};

export function SharedContextDisplay({ context }: SharedContextDisplayProps) {
    if (!context) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg text-center">
                <h2 className="text-lg font-semibold mb-2">Hive Mind Context</h2>
                <p className="text-gray-400">Waiting for first cycle...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Hive Mind Context</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Market Regime:</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <RegimeBadge regime={context.marketRegime} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Score: {context.regimeScore.toFixed(1)} / 10.0</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Market Sentiment:</span>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <SentimentBadge sentiment={context.sentiment} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Score: {context.sentimentScore.toFixed(2)} / 1.0</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="col-span-2">
                     <span className="text-gray-400">Key Topics:</span>
                     <div className="flex flex-wrap gap-2 mt-1">
                        {context.keyTopics.length > 0 ? context.keyTopics.map(topic => (
                            <Badge key={topic} variant="secondary">{topic}</Badge>
                        )) : <span className="text-xs text-gray-500">None detected</span>}
                     </div>
                </div>
            </div>
        </div>
    );
}
