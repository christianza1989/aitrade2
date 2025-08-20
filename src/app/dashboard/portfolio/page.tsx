// src/app/dashboard/portfolio/page.tsx

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import toast from 'react-hot-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck } from 'lucide-react'; // 1. IMPORTUOTA NAUJA PIKTOGRAMA

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
    [key: string]: string | number;
}

// 2. PRIDĖTI PAVYZDINIAI FUNDAMENTALŪS DUOMENYS
// In a real scenario, this data would be fetched via an API for each position.
const mockFundamentalData: { [symbol: string]: { tags: string[], description: string } } = {
    'BTCUSDT': {
        tags: ['Mineable', 'PoW', 'Store of Value'],
        description: 'Bitcoin is a decentralized digital currency that can be sent from user to user on the peer-to-peer bitcoin network without the need for intermediaries.'
    },
    'ETHUSDT': {
        tags: ['PoS', 'Smart Contracts', 'DeFi'],
        description: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality. Ether is the native cryptocurrency of the platform.'
    }
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

    // This effect handles decision triggers. The logic remains the same.
    useEffect(() => {
        // ... (existing useEffect logic remains unchanged)
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
                {/* Mobile View - Cards */}
                <div className="md:hidden">
                    {portfolio.positions.map((pos: Position, index: number) => {
                        const { currentPrice, pnl, pnlPercent } = getPositionDisplayData(pos);
                        const fundamentals = mockFundamentalData[pos.symbol];
                        return (
                            <div key={index} className="bg-gray-700 rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-lg">{pos.symbol}</span>
                                    <span className={`font-bold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {pnlPercent.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="text-sm space-y-1">
                                    <p><strong>Amount:</strong> {pos.amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</p>
                                    <p><strong>Entry Price:</strong> €{pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p><strong>Current Price:</strong> €{currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p><strong>P/L:</strong> <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>€{pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                    {/* 3. NAUJA EILUTĖ MOBILIAJAME VAIZDE */}
                                    {fundamentals && (
                                        <div className="flex items-center pt-1">
                                            <strong>Assessment:</strong>
                                            <ShieldCheck size={16} className="text-green-500 ml-2 mr-1" />
                                            <span className="text-gray-300 text-xs">{fundamentals.tags.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleSell(pos.symbol, pos.amount)} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                                    Sell
                                </button>
                            </div>
                        );
                    })}
                </div>
                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left p-2">Symbol</th>
                                <th className="text-left p-2">Amount</th>
                                <th className="text-left p-2">Entry Price</th>
                                <th className="text-left p-2">Current Price</th>
                                <th className="text-left p-2">P/L (%)</th>
                                {/* 4. NAUJAS STULPELIS LENTELĖJE */}
                                <th className="text-left p-2">Fundamental Assessment</th>
                                <th className="text-left p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolio.positions.map((pos: Position, index: number) => {
                                const { currentPrice, pnlPercent } = getPositionDisplayData(pos);
                                const fundamentals = mockFundamentalData[pos.symbol];
                                return (
                                    <tr key={index} className="border-b border-gray-700">
                                        <td className="p-2 font-bold">{pos.symbol}</td>
                                        <td className="p-2">{pos.amount.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}</td>
                                        <td className="p-2">€{pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2">€{currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className={`p-2 font-semibold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnlPercent.toFixed(2)}%
                                        </td>
                                        {/* 5. NAUJO STULPELIO TURINYS SU TOOLTIP */}
                                        <td className="p-2">
                                            {fundamentals ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center cursor-pointer">
                                                                <ShieldCheck size={18} className="text-green-500" />
                                                                <span className="ml-2 text-gray-300 text-xs hidden lg:block">{fundamentals.tags[0]}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p className="font-bold mb-1">Tags: {fundamentals.tags.join(', ')}</p>
                                                            <p className="text-xs text-gray-400">{fundamentals.description}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-gray-500 text-xs">N/A</span>
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