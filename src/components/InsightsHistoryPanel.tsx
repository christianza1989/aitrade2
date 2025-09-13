"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { LoaderCircle, BrainCircuit, Eye } from 'lucide-react';
import { StatefulContainer } from './ui/stateful-container';

interface Insight {
    insightId: string;
    timestamp: string;
    title: string;
    summary: string;
}

interface InsightsHistoryPanelProps {
    onShowEvidence: (insightId: string) => void;
}

export const InsightsHistoryPanel = ({ onShowEvidence }: InsightsHistoryPanelProps) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/insights/history');
                if (!res.ok) throw new Error('Failed to fetch insights history');
                setInsights(await res.json());
            } catch (error) {
                const errorMessage = (error as Error).message;
                setError(errorMessage);
                console.error("Failed to fetch insights history", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsights();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit /> AI Insights History</CardTitle>
                <CardDescription>A log of patterns and suggestions the AI has discovered in your trading behavior over time.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <StatefulContainer
                        isLoading={isLoading}
                        error={error}
                        data={insights}
                        emptyStateMessage="No insights generated yet."
                    >
                        <div className="space-y-4">
                            {insights.map(insight => (
                                <div key={insight.insightId} className="p-3 bg-muted/50 rounded-lg">
                                    <p className="font-semibold">{insight.title}</p>
                                    <p className="text-xs text-muted-foreground mb-2">{new Date(insight.timestamp).toLocaleDateString()}</p>
                                    <p className="text-sm mb-3">{insight.summary}</p>
                                    <Button size="sm" variant="outline" onClick={() => onShowEvidence(insight.insightId)}>
                                        <Eye className="mr-2 h-4 w-4" /> Show Evidence
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </StatefulContainer>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
