// src/app/dashboard/history/page.tsx

"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge'; // 1. IMPORTUOTAS Badge KOMPONENTAS

// 2. ATNAUJINTA SĄSAJA, KAD ĮTRAUKTŲ RINKOS KONTEKSTĄ
interface TradeLog {
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    analysisContext: {
        reason: string;
    };
    marketContext?: { // Naujas, neprivalomas laukas
        regime: 'Risk-On' | 'Risk-Off' | 'Neutral';
        regimeScore: number;
        sentiment: 'Bullish' | 'Bearish' | 'Neutral';
        sentimentScore: number;
    };
}

// 3. ATNAUJINTI PAVYZDINIAI DUOMENYS
const mockTradeHistory: TradeLog[] = [
    {
        symbol: 'SOLUSDT',
        entryPrice: 140.5,
        exitPrice: 155.2,
        pnl: 1470.00,
        analysisContext: { reason: 'PositionManager decision' },
        marketContext: {
            regime: 'Risk-On',
            regimeScore: 8.2,
            sentiment: 'Bullish',
            sentimentScore: 0.75,
        }
    },
    {
        symbol: 'ADAUSDT',
        entryPrice: 0.45,
        exitPrice: 0.43,
        pnl: -200.00,
        analysisContext: { reason: 'Automatic Stop Loss' },
        marketContext: {
            regime: 'Risk-Off',
            regimeScore: 3.1,
            sentiment: 'Bearish',
            sentimentScore: -0.5,
        }
    }
];

export default function HistoryPage() {
    const [tradeHistory, setTradeHistory] = useState<TradeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            setIsLoading(true);
            try {
                // In a real scenario, the API would fetch real data
                // const response = await fetch('/api/history');
                // if (!response.ok) throw new Error('Failed to fetch trade history.');
                // const data = await response.json();
                // For now, we use mock data
                setTradeHistory(mockTradeHistory);
            } catch (error) {
                toast.error("Could not load trade history.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHistory();
    }, []);

    const getRegimeVariant = (regime: string) => {
        if (regime === 'Risk-On') return 'success';
        if (regime === 'Risk-Off') return 'destructive';
        return 'secondary';
    };

    const getSentimentVariant = (sentiment: string) => {
        if (sentiment === 'Bullish') return 'success';
        if (sentiment === 'Bearish') return 'destructive';
        return 'secondary';
    };

    if (isLoading) {
        return <div className="text-white p-6">Loading trade history...</div>;
    }

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Trade History</h1>
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-700 text-sm text-gray-400">
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Entry Price</th>
                                <th className="text-left p-2">Exit Price</th>
                                <th className="text-left p-2">P/L</th>
                                <th className="text-left p-2">Reason</th>
                                {/* 4. NAUJAS LENTELĖS STULPELIS */}
                                <th className="text-left p-2">Market Context</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tradeHistory.length > 0 ? (
                                tradeHistory.map((trade, index) => (
                                    <tr key={index} className="border-b border-gray-700 text-sm">
                                        <td className="p-2 font-semibold">{trade.symbol}</td>
                                        <td className="p-2">€{trade.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                        <td className="p-2">€{trade.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                        <td className={`p-2 font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            €{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2 text-gray-300">{trade.analysisContext?.reason || 'N/A'}</td>
                                        {/* 5. NAUJO STULPELIO TURINYS */}
                                        <td className="p-2">
                                            {trade.marketContext ? (
                                                <div className="flex flex-col space-y-1">
                                                    <Badge variant={getRegimeVariant(trade.marketContext.regime)}>
                                                        {trade.marketContext.regime.replace('-', ' ')} ({trade.marketContext.regimeScore.toFixed(1)})
                                                    </Badge>
                                                    <Badge variant={getSentimentVariant(trade.marketContext.sentiment)}>
                                                        {trade.marketContext.sentiment} ({trade.marketContext.sentimentScore.toFixed(2)})
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center p-4">No trade history found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}