'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, Eye } from 'lucide-react';
import { DecisionDeepDiveModal } from '@/components/DecisionDeepDiveModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatefulContainer } from '@/components/ui/stateful-container';

interface TradeLog {
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    reason: string;
    timestamp: string;
    decisionContext?: unknown;
    marketContext?: {
        marketRegime: 'Risk-On' | 'Risk-Off' | 'Neutral';
        regimeScore: number;
        sentiment: 'Bullish' | 'Bearish' | 'Neutral';
        sentimentScore: number;
    };
}

export default function HistoryPage() {
    const [tradeHistory, setTradeHistory] = useState<TradeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState<TradeLog | null>(null);
    const [filters, setFilters] = useState({ symbol: '', outcome: 'all' });

    useEffect(() => {
        async function fetchHistory() {
            setIsLoading(true);
            const params = new URLSearchParams();
            if (filters.symbol) params.append('symbol', filters.symbol);
            if (filters.outcome !== 'all') params.append('outcome', filters.outcome);

            try {
                const response = await fetch(`/api/history?${params.toString()}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch trade history. Server responded with status ${response.status}.`);
                }
                const data = await response.json();
                setTradeHistory(data);
            } catch (error) {
                const errorMessage = (error as Error).message;
                setError(errorMessage);
                toast.error("Could not load trade history.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHistory();
    }, [filters]);

    const getRegimeVariant = (regime?: string) => {
        if (regime === 'Risk-On') return 'default';
        if (regime === 'Risk-Off') return 'destructive';
        return 'secondary';
    };

    const getSentimentVariant = (sentiment?: string) => {
        if (sentiment === 'Bullish') return 'default';
        if (sentiment === 'Bearish') return 'destructive';
        return 'secondary';
    };

    const handleOpenModal = (trade: TradeLog) => {
        setSelectedTrade(trade);
        setIsModalOpen(true);
    };

    const summary = useMemo(() => {
        const totalPnl = tradeHistory.reduce((acc, trade) => acc + trade.pnl, 0);
        return {
            totalTrades: tradeHistory.length,
            totalPnl: totalPnl.toFixed(2),
        };
    }, [tradeHistory]);

    return (
        <div className="text-white p-6">
            <h1 className="text-2xl font-bold mb-4">Trade History</h1>
            <div className="flex gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
                <Input
                    placeholder="Filter by Symbol..."
                    value={filters.symbol}
                    onChange={e => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                    className="max-w-xs"
                />
                <div className="flex gap-2">
                    <Button
                        variant={filters.outcome === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilters(prev => ({ ...prev, outcome: 'all' }))}
                    >
                        All
                    </Button>
                    <Button
                        variant={filters.outcome === 'profit' ? 'default' : 'outline'}
                        onClick={() => setFilters(prev => ({ ...prev, outcome: 'profit' }))}
                    >
                        Profit
                    </Button>
                    <Button
                        variant={filters.outcome === 'loss' ? 'default' : 'outline'}
                        onClick={() => setFilters(prev => ({ ...prev, outcome: 'loss' }))}
                    >
                        Loss
                    </Button>
                </div>
            </div>

            <StatefulContainer
                isLoading={isLoading}
                error={error}
                data={tradeHistory}
                emptyStateMessage="No trade history found. Once the bot completes a trade, it will appear here."
            >
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-700 text-sm text-gray-400">
                                    <th className="text-left p-2">Symbol</th>
                                    <th className="text-left p-2">Entry Price</th>
                                    <th className="text-left p-2">Exit Price</th>
                                    <th className="text-left p-2">P/L (€)</th>
                                    <th className="text-left p-2">Reason</th>
                                    <th className="text-left p-2">Market Context</th>
                                    <th className="text-center p-2">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tradeHistory.map((trade, index) => (
                                    <tr key={index} className="border-b border-gray-700 text-sm">
                                        <td className="p-2 font-semibold">{trade.symbol}</td>
                                        <td className="p-2">€{trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                        <td className="p-2">€{trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                        <td className={`p-2 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            €{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2 text-gray-300">{trade.reason || 'N/A'}</td>
                                        <td className="p-2">
                                            {trade.marketContext ? (
                                                <div className="flex flex-col space-y-1">
                                                    <Badge variant={getRegimeVariant(trade.marketContext.marketRegime)}>
                                                        {(trade.marketContext.marketRegime)?.replace('-', ' ') || 'N/A'} ({(trade.marketContext.regimeScore ?? 0).toFixed(1)})
                                                    </Badge>
                                                    <Badge variant={getSentimentVariant(trade.marketContext.sentiment)}>
                                                        {trade.marketContext.sentiment} ({(trade.marketContext.sentimentScore ?? 0).toFixed(2)})
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">Context N/A</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => handleOpenModal(trade)}
                                                className="p-1 text-gray-300 hover:text-blue-400 disabled:opacity-20"
                                                disabled={!trade.decisionContext}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-600 font-bold">
                                    <td className="p-2" colSpan={3}>Total</td>
                                    <td className={`p-2 ${parseFloat(summary.totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        €{summary.totalPnl}
                                    </td>
                                    <td className="p-2" colSpan={3}>{summary.totalTrades} Trades</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </StatefulContainer>

            <DecisionDeepDiveModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={selectedTrade?.decisionContext}
            />
        </div>
    );
}
