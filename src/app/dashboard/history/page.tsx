"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface TradeLog {
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    analysisContext: {
        reason: string;
    };
}

export default function HistoryPage() {
    const [tradeHistory, setTradeHistory] = useState<TradeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/history');
                if (!response.ok) throw new Error('Failed to fetch trade history.');
                const data = await response.json();
                setTradeHistory(data);
            } catch (error) {
                toast.error("Could not load trade history.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHistory();
    }, []);

    if (isLoading) {
        return <div>Loading trade history...</div>;
    }

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Trade History</h1>
            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Entry Price</th>
                                <th className="text-left p-2">Exit Price</th>
                                <th className="text-left p-2">P/L</th>
                                <th className="text-left p-2">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tradeHistory.length > 0 ? (
                                tradeHistory.map((trade, index) => (
                                    <tr key={index} className="border-b border-gray-700">
                                        <td className="p-2">{trade.symbol}</td>
                                        <td className="p-2">€{trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2">€{trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={`p-2 ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            €{trade.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2">{trade.analysisContext?.reason || 'N/A'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-4">No trade history found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
