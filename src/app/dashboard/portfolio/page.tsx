"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import toast from 'react-hot-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define interfaces for our state and props
interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
    highPnlPercent?: number;
    takeProfitPercent?: number;
    holdCount?: number;
    stopLossPrice?: number;
}

interface Settings {
    trailingProfitPercent: number;
    takeProfitPercent: number;
    stopLossPercent: number;
    [key: string]: string | number; // Allow other properties
}

const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(error => console.error("Audio playback failed.", error));
};

export default function PortfolioPage() {
    const { state, dispatch } = useDashboard();
    const { portfolio, marketData } = state;
    const [settings, setSettings] = useState<Settings | null>(null);
    const triggeredSymbolsRef = useRef(new Set<string>());

    useEffect(() => {
        async function fetchSettings() {
            try {
                const response = await fetch('/api/settings');
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            }
        }
        fetchSettings();
    }, []);

    const handleSell = useCallback(async (symbol: string, amount: number) => {
        const toastId = toast.loading(`Selling ${amount} of ${symbol}...`);
        try {
            const response = await fetch('/api/portfolio/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, amount }),
            });
            if (!response.ok) throw new Error('Failed to sell.');
            
            const newPortfolio = await response.json();
            dispatch({ type: 'SET_PORTFOLIO', payload: newPortfolio });
            toast.success('Sell successful!', { id: toastId });
        } catch {
            toast.error('Sell failed.', { id: toastId });
        }
    }, [dispatch]);

    // This effect will now only handle the decision triggers, not data fetching
    useEffect(() => {
        if (!portfolio || portfolio.positions.length === 0 || !settings || marketData.length === 0) {
            return;
        }

        const positionsWithMarketData = portfolio.positions.map((pos: Position) => {
            const marketInfo = marketData.find((md: { symbol: string; lastPrice: string; }) => md.symbol === pos.symbol);
            const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
            const pnl = (currentPrice - pos.entryPrice) * pos.amount;
            const pnlPercent = (pos.entryPrice * pos.amount) === 0 ? 0 : (pnl / (pos.entryPrice * pos.amount)) * 100;
            return { ...pos, currentPrice, pnl, pnlPercent };
        });

        for (const pos of positionsWithMarketData) {
            const currentHigh = pos.highPnlPercent || 0;
            if (pos.pnlPercent > currentHigh) {
                fetch('/api/portfolio/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: pos.symbol, updates: { highPnlPercent: pos.pnlPercent } }),
                });
            }

            const trailingStopPrice = (pos.highPnlPercent || 0) + settings.trailingProfitPercent;
            if (pos.highPnlPercent && pos.highPnlPercent > (pos.takeProfitPercent || settings.takeProfitPercent) && pos.pnlPercent < trailingStopPrice) {
                if (!triggeredSymbolsRef.current.has(pos.symbol)) {
                    triggeredSymbolsRef.current.add(pos.symbol);
                    playNotificationSound();
                    toast.success(`Selling ${pos.symbol} to lock in profit (Trailing Stop).`);
                    handleSell(pos.symbol, pos.amount);
                    continue;
                }
            }

            const atTakeProfit = pos.pnlPercent >= (pos.takeProfitPercent || settings.takeProfitPercent);
            const atStopLoss = pos.pnlPercent <= settings.stopLossPercent;

            if ((atTakeProfit || atStopLoss) && !triggeredSymbolsRef.current.has(pos.symbol)) {
                triggeredSymbolsRef.current.add(pos.symbol);
                const reason = atStopLoss ? 'stop-loss' : 'take-profit';
                playNotificationSound();
                toast(`Position ${pos.symbol} hit ${reason} target. Triggering AI decision...`);
                
                fetch('/api/bot/decision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: pos.symbol }),
                }).then(async (res) => {
                    if (res.ok) {
                        const result = await res.json();
                        if (result.decision === 'SOLD') {
                            playNotificationSound();
                            toast.success(`AI decided to sell ${pos.symbol} for ${result.reason}.`);
                        } else if (result.decision === 'HELD') {
                            playNotificationSound();
                            toast(`AI decided to hold ${pos.symbol}. New TP: ${result.new_tp}%.`, { icon: 'ℹ️' });
                        }
                    } else {
                        const errorData = await res.json();
                        const errorMessage = errorData.error || 'An unknown error occurred.';
                        playNotificationSound();
                        toast.error(`AI decision for ${pos.symbol} failed: ${errorMessage}`);
                    }
                }).finally(() => {
                    setTimeout(() => {
                        triggeredSymbolsRef.current.delete(pos.symbol);
                    }, 60000);
                });
            }
        }
    }, [portfolio, marketData, settings, handleSell]);

    if (!portfolio) {
        return <div>Loading portfolio...</div>;
    }

    const getPositionDisplayData = (pos: Position) => {
        const marketInfo = marketData.find((md: { symbol: string; lastPrice: string; }) => md.symbol === pos.symbol);
        const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
        const pnl = (currentPrice - pos.entryPrice) * pos.amount;
        const pnlPercent = (pos.entryPrice * pos.amount) === 0 ? 0 : (pnl / (pos.entryPrice * pos.amount)) * 100;
        return { currentPrice, pnl, pnlPercent };
    };

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">My Portfolio</h1>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Open Positions</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Amount</th>
                                <th className="text-left p-2">Entry Price</th>
                                <th className="text-left p-2">Current Price</th>
                                <th className="text-left p-2">P/L</th>
                                <th className="text-left p-2">P/L (%)</th>
                                <th className="text-left p-2">AI Control</th>
                                <th className="text-left p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolio.positions.map((pos: Position, index: number) => {
                                const { currentPrice, pnl, pnlPercent } = getPositionDisplayData(pos);
                                return (
                                    <tr key={index} className="border-b border-gray-700">
                                        <td className="p-2">{pos.symbol}</td>
                                        <td className="p-2">{pos.amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                                        <td className="p-2">€{pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2">€{currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={`p-2 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            €{pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`p-2 ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnlPercent.toFixed(2)}%
                                        </td>
                                        <td className="p-2">
                                            {pos.holdCount && pos.holdCount > 0 && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <span className="text-yellow-400">Held ({pos.holdCount}x)</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>AI decided to hold this position {pos.holdCount} times. Current TP: {pos.takeProfitPercent}%, SL: €{pos.stopLossPrice?.toFixed(2)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <button onClick={() => handleSell(pos.symbol, pos.amount)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">
                                                Sell
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
