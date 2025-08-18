"use client";

import { useEffect, useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Opportunity } from '@/core/opportunity-scanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

export function OpportunityLog() {
    const { state, dispatch } = useDashboard();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleAnalyze = async (symbol: string) => {
        setIsLoading(symbol);
        try {
            const response = await fetch('/api/bot/decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
            });
            if (!response.ok) {
                throw new Error('Failed to analyze opportunity.');
            }
            // The dashboard context will update the opportunities list automatically
            // through its polling mechanism.
        } catch (error) {
            console.error("Analysis error:", error);
        } finally {
            setIsLoading(null);
        }
    };

    const getStatusVariant = (status: Opportunity['status']) => {
        switch (status) {
            case 'bought': return 'success';
            case 'ignored': return 'destructive';
            case 'analyzing': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="font-semibold text-md mb-4">Opportunity Log (Fast Movers)</h2>
            <div className="space-y-3">
                {state.opportunities.length === 0 ? (
                    <p className="text-gray-400 text-sm">No significant price movements detected recently.</p>
                ) : (
                    state.opportunities.slice(0, 10).map((opp) => (
                        <div key={opp.timestamp} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                            <div>
                                <p className="font-bold">{opp.symbol}</p>
                                <p className={`text-sm ${opp.priceChangePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    +{opp.priceChangePercent.toFixed(2)}%
                                </p>
                                <p className="text-xs text-gray-400">{new Date(opp.timestamp).toLocaleTimeString()}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Badge variant={getStatusVariant(opp.status)}>{opp.status}</Badge>
                                {opp.status === 'detected' && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAnalyze(opp.symbol)}
                                        disabled={isLoading === opp.symbol}
                                    >
                                        <PlayCircle size={16} />
                                        <span className="ml-2">{isLoading === opp.symbol ? 'Analyzing...' : 'Analyze'}</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
