// src/components/MacroEnvironmentCard.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Activity, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MacroEnvironmentCard = () => {
    const { state } = useDashboard();
    const { sharedContext } = state;

    const getRegimeVariant = (regime: string) => {
        if (regime === 'Risk-On') return 'default';
        if (regime === 'Risk-Off') return 'destructive';
        return 'secondary';
    };

    const getFearGreedColor = (value: number) => {
        if (value <= 24) return 'text-red-500'; // Extreme Fear
        if (value <= 49) return 'text-orange-400'; // Fear
        if (value <= 74) return 'text-green-400'; // Greed
        return 'text-green-300'; // Extreme Greed
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Activity size={16} className="mr-2" />
                    Macro Environment
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sharedContext ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span>Market Regime</span>
                            <Badge variant={getRegimeVariant(sharedContext.marketRegime || 'Neutral')}>
                                {(sharedContext.marketRegime || 'N/A').replace('-', ' ')}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Fear & Greed Index</span>
                            {sharedContext.fearAndGreedIndex?.value ? (
                                <span className={cn("flex items-center font-semibold", getFearGreedColor(Number(sharedContext.fearAndGreedIndex.value)))}>
                                    <Gauge size={14} className="mr-1.5" />
                                    {sharedContext.fearAndGreedIndex.value} ({sharedContext.fearAndGreedIndex.classification})
                                </span>
                            ) : (
                                <span>N/A</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-xs text-gray-500 py-4">
                        <p>Start the bot to run AI analysis.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
