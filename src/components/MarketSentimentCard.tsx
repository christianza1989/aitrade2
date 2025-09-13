// src/components/MarketSentimentCard.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MessageSquareText } from 'lucide-react';

export const MarketSentimentCard = () => {
    const { state } = useDashboard();
    const { sharedContext } = state;
    
    const getSentimentVariant = (sentiment?: string) => {
        if (sentiment === 'Bullish') return 'default';
        if (sentiment === 'Bearish') return 'destructive';
        return 'secondary';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <MessageSquareText size={16} className="mr-2" />
                    Market Sentiment
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sharedContext ? (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span>Overall Sentiment</span>
                            <Badge variant={getSentimentVariant(sharedContext.sentiment)}>{sharedContext.sentiment || 'N/A'}</Badge>
                        </div>
                        <div className="text-sm">
                            <span>Dominant Narrative</span>
                            <p className="text-xs text-gray-300 mt-1 italic">
                                {/* @ts-expect-error dominantNarrative may not be defined in sharedContext */}
                                {sharedContext.dominantNarrative || 'Not available...'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-xs text-gray-500 py-4">
                        <p>Analysis will be available once the bot is active.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
