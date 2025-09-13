// src/app/dashboard/portfolio/page.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import toast from 'react-hot-toast';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Button } from '@/components/ui/button';
import { Eye, LoaderCircle, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Activity } from 'lucide-react';
import { DecisionDeepDiveModal } from '@/components/DecisionDeepDiveModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatefulContainer } from '@/components/ui/stateful-container';
import { motion } from 'framer-motion';

interface Position {
    id?: string; // Pozicijos ID gali būti neprivalomas
    symbol: string;
    amount: number;
    entryPrice: number;
    type?: 'long' | 'short';
    strategy?: string;
}

interface MarketData {
    symbol: string;
    lastPrice: string;
}

export default function PortfolioPage() {
    const { state, dispatch } = useDashboard();
    const { portfolio, marketData } = state;

    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [tradeToClose, setTradeToClose] = useState<{ symbol: string, amount: number, isShort: boolean } | null>(null);

    const [isDeepDiveModalOpen, setIsDeepDiveModalOpen] = useState(false);
    const [selectedContext, setSelectedContext] = useState<any>(null);
    const [isContextLoading, setIsContextLoading] = useState(false);

    const handleOpenFeedbackModal = (symbol: string, amount: number, isShort: boolean) => {
        setTradeToClose({ symbol, amount, isShort });
        setIsFeedbackModalOpen(true);
    };

    const handleSellWithFeedback = async (reason: string) => {
        if (!tradeToClose) return;
        const { symbol, amount, isShort } = tradeToClose;

        const endpoint = isShort ? '/api/portfolio/close-short' : '/api/portfolio/sell';
        const toastId = toast.loading(`${isShort ? 'Closing' : 'Selling'} ${amount} of ${symbol}...`);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, amount, reason }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || `Failed to ${isShort ? 'close short' : 'sell'}.`);
            }

            const result = await response.json();
            dispatch({ type: 'SET_PORTFOLIO', payload: result.data });
            toast.success(`${isShort ? 'Close short' : 'Sell'} successful!`, { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error((error as Error).message, { id: toastId });
        }
    };

    const handleOpenDeepDiveModal = async (positionId: string) => {
        setIsDeepDiveModalOpen(true);
        setIsContextLoading(true);
        try {
            const response = await fetch(`/api/positions/${positionId}/context`);
            if (!response.ok) throw new Error("Failed to fetch decision context.");
            const contextData = await response.json();
            setSelectedContext(contextData);
        } catch (error) {
            console.error(error);
            setSelectedContext({ error: (error as Error).message });
        } finally {
            setIsContextLoading(false);
        }
    };

    const getPositionDisplayData = (pos: Position) => {
        const marketInfo = marketData.find((md: MarketData) => md.symbol === pos.symbol);
        const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
        const value = currentPrice * pos.amount;

        let pnl, pnlPercent;
        if (pos.type === 'short') {
            pnl = (pos.entryPrice - currentPrice) * pos.amount;
            pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * pos.amount)) * 100 : 0;
        } else {
            pnl = (currentPrice - pos.entryPrice) * pos.amount;
            pnlPercent = pos.entryPrice > 0 ? (pnl / (pos.entryPrice * pos.amount)) * 100 : 0;
        }
        return { value, pnl, pnlPercent };
    };

    // Remove the basic loading check - StatefulContainer will handle this

    return (
        <div className="min-h-screen text-white">
            {/* Enhanced Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 mb-6 backdrop-blur-sm"
                >
                    <PieChart className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-green-300 text-sm font-semibold tracking-wide">PORTFOLIO MANAGEMENT</span>
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Portfolio Overview
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
                    Comprehensive view of your trading positions with real-time P/L tracking,
                    strategy performance, and intelligent position management tools.
                </p>
            </motion.div>

            {/* Portfolio Summary Cards */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
            >
                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <DollarSign className="w-8 h-8 text-blue-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">
                            ${portfolio.positions.reduce((acc, pos) => {
                                const marketInfo = marketData.find((md: MarketData) => md.symbol === pos.symbol);
                                const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
                                return acc + (currentPrice * pos.amount);
                            }, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">Total Portfolio Value</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <Activity className="w-8 h-8 text-purple-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">{portfolio.positions.length}</div>
                        <div className="text-sm text-gray-400 font-medium">Active Positions</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <BarChart3 className="w-8 h-8 text-green-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">
                            {portfolio.positions.filter(pos => {
                                const { pnlPercent } = getPositionDisplayData(pos);
                                return pnlPercent > 0;
                            }).length}/{portfolio.positions.length}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">Winning Positions</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Enhanced Positions Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
            >
                <div className="flex items-center mb-6">
                    <TrendingUp className="w-6 h-6 text-blue-400 mr-3" />
                    <h2 className="text-2xl font-bold text-white">Open Positions</h2>
                </div>

                <StatefulContainer
                    isLoading={state.isLoading}
                    error={state.error}
                    data={portfolio?.positions}
                    emptyStateMessage="No open positions. Your portfolio is currently empty."
                >
                    <div className="bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        {/* Desktop View - Enhanced Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-700/50 text-left text-sm text-gray-400">
                                        <th className="p-4 font-semibold">Asset</th>
                                        <th className="p-4 font-semibold">Position</th>
                                        <th className="p-4 font-semibold">Entry Price</th>
                                        <th className="p-4 font-semibold">Current Price</th>
                                        <th className="p-4 font-semibold">Unrealized P/L</th>
                                        <th className="p-4 font-semibold">Strategy</th>
                                        <th className="p-4 font-semibold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.positions.map((pos: Position, index: number) => {
                                        const { value, pnl, pnlPercent } = getPositionDisplayData(pos);
                                        const marketInfo = marketData.find((md: MarketData) => md.symbol === pos.symbol);
                                        const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
                                        const isShort = pos.type === 'short';

                                        return (
                                            <motion.tr
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-all duration-300"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <div className="text-xl font-bold text-white">{pos.symbol}</div>
                                                        {isShort && (
                                                            <Badge variant="destructive" className="ml-3 bg-red-500/20 text-red-300 border-red-500/30">
                                                                SHORT
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-white font-semibold">{pos.amount.toFixed(4)}</div>
                                                    <div className="text-gray-400 text-sm">
                                                        ${(pos.amount * pos.entryPrice).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300">${pos.entryPrice.toFixed(2)}</td>
                                                <td className="p-4 text-gray-300">${currentPrice.toFixed(2)}</td>
                                                <td className="p-4">
                                                    <div className={`font-bold text-lg ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                                    </div>
                                                    <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                                        {pos.strategy || 'Manual'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {pos.id && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleOpenDeepDiveModal(pos.id!)}
                                                                disabled={isContextLoading}
                                                                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-all duration-300"
                                                            >
                                                                {isContextLoading ? (
                                                                    <LoaderCircle className="h-4 w-4 animate-spin text-blue-400" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4 text-blue-400" />
                                                                )}
                                                            </motion.button>
                                                        )}
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleOpenFeedbackModal(pos.symbol, pos.amount, isShort)}
                                                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-500/25"
                                                        >
                                                            {isShort ? 'Close Short' : 'Sell'}
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View - Enhanced Cards */}
                        <div className="md:hidden space-y-6">
                            {portfolio.positions.map((pos: Position, index: number) => {
                                const { value, pnl, pnlPercent } = getPositionDisplayData(pos);
                                const marketInfo = marketData.find((md: MarketData) => md.symbol === pos.symbol);
                                const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
                                const isShort = pos.type === 'short';

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ y: -5, scale: 1.01 }}
                                        className="group relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="relative bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-2xl p-6 border border-gray-600/30 backdrop-blur-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center">
                                                    <div className="text-2xl font-black text-white">{pos.symbol}</div>
                                                    {isShort && (
                                                        <Badge variant="destructive" className="ml-3 bg-red-500/20 text-red-300 border-red-500/30">
                                                            SHORT
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                                    {pos.strategy || 'Manual'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div>
                                                    <div className="text-sm text-gray-400 mb-1">Position Size</div>
                                                    <div className="text-white font-semibold">{pos.amount.toFixed(4)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-400 mb-1">Entry Price</div>
                                                    <div className="text-white font-semibold">${pos.entryPrice.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-400 mb-1">Current Price</div>
                                                    <div className="text-white font-semibold">${currentPrice.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-400 mb-1">P/L</div>
                                                    <div className={`font-bold text-lg ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                                    </div>
                                                    <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                {pos.id && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleOpenDeepDiveModal(pos.id!)}
                                                        disabled={isContextLoading}
                                                        className="flex-1 p-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 font-semibold transition-all duration-300"
                                                    >
                                                        {isContextLoading ? (
                                                            <LoaderCircle className="h-4 w-4 animate-spin mx-auto" />
                                                        ) : (
                                                            'View Details'
                                                        )}
                                                    </motion.button>
                                                )}
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleOpenFeedbackModal(pos.symbol, pos.amount, isShort)}
                                                    className="flex-1 p-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/25"
                                                >
                                                    {isShort ? 'Close Short' : 'Sell Position'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </StatefulContainer>
            </motion.div>

            <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSubmit={handleSellWithFeedback}
                symbol={tradeToClose?.symbol || ''}
            />
            <DecisionDeepDiveModal
                isOpen={isDeepDiveModalOpen}
                onClose={() => setIsDeepDiveModalOpen(false)}
                data={isContextLoading ? <div className="flex justify-center items-center h-32"><LoaderCircle className="animate-spin" /></div> : selectedContext}
            />
        </div>
    );
}
