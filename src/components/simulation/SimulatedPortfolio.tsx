'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, TrendingUp, TrendingDown, PieChart, 
    DollarSign, BarChart3, Activity, Target, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { simulationEngine, PortfolioState, TradeExecution } from '@/lib/simulation/SimulationEngine';

export const SimulatedPortfolio: React.FC = () => {
    const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
    const [recentTrades, setRecentTrades] = useState<TradeExecution[]>([]);
    const [portfolioHistory, setPortfolioHistory] = useState<PortfolioState[]>([]);
    const chartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Subscribe to portfolio updates
        const unsubscribePortfolio = simulationEngine.subscribe('portfolio:update', (data: PortfolioState) => {
            setPortfolio(data);
            setPortfolioHistory(prev => [...prev, data].slice(-100)); // Keep last 100 points
        });

        // Subscribe to trade executions
        const unsubscribeTrades = simulationEngine.subscribe('trade:executed', (trade: TradeExecution) => {
            setRecentTrades(prev => [trade, ...prev.slice(0, 19)]);
        });

        // Get initial data
        const initialPortfolio = simulationEngine.getCurrentPortfolio();
        const initialTrades = simulationEngine.getRecentTrades();
        const history = simulationEngine.getPortfolioHistory();
        
        setPortfolio(initialPortfolio);
        setRecentTrades(initialTrades);
        setPortfolioHistory(history);

        return () => {
            unsubscribePortfolio();
            unsubscribeTrades();
        };
    }, []);

    // Draw portfolio chart
    useEffect(() => {
        const canvas = chartRef.current;
        if (!canvas || portfolioHistory.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Calculate scales
        const values = portfolioHistory.map(p => p.totalValue);
        const minValue = Math.min(...values, 100000); // Starting value
        const maxValue = Math.max(...values, 100000);
        const valueRange = maxValue - minValue || 1000; // Avoid division by zero

        // Draw grid
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= 4; i++) {
            const x = padding + (chartWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let i = 0; i <= 3; i++) {
            const y = padding + (chartHeight / 3) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw portfolio line
        const currentValue = portfolio?.totalValue || 100000;
        const isProfit = currentValue >= 100000;
        
        ctx.strokeStyle = isProfit ? '#10B981' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();

        portfolioHistory.forEach((point, index) => {
            const x = padding + (chartWidth / (portfolioHistory.length - 1)) * index;
            const y = height - padding - ((point.totalValue - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw area fill
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = isProfit ? '#10B981' : '#EF4444';
        ctx.beginPath();
        
        // Start from bottom
        ctx.moveTo(padding, height - padding - ((100000 - minValue) / valueRange) * chartHeight);
        
        portfolioHistory.forEach((point, index) => {
            const x = padding + (chartWidth / (portfolioHistory.length - 1)) * index;
            const y = height - padding - ((point.totalValue - minValue) / valueRange) * chartHeight;
            ctx.lineTo(x, y);
        });
        
        // Close to bottom
        const lastX = padding + chartWidth;
        ctx.lineTo(lastX, height - padding - ((100000 - minValue) / valueRange) * chartHeight);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;

        // Draw data points
        portfolioHistory.forEach((point, index) => {
            const x = padding + (chartWidth / (portfolioHistory.length - 1)) * index;
            const y = height - padding - ((point.totalValue - minValue) / valueRange) * chartHeight;
            
            ctx.fillStyle = isProfit ? '#10B981' : '#EF4444';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        
        // Y-axis labels
        for (let i = 0; i <= 3; i++) {
            const value = minValue + (valueRange * (3 - i) / 3);
            const y = padding + (chartHeight / 3) * i;
            ctx.textAlign = 'right';
            ctx.fillText(`$${value.toLocaleString()}`, padding - 10, y + 4);
        }

    }, [portfolioHistory, portfolio]);

    if (!portfolio) {
        return (
            <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl">
                <CardContent className="p-6 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-gray-400">Loading portfolio data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const positions = Object.values(portfolio.positions);
    const totalPositionValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const isProfit = portfolio.totalPnL >= 0;

    return (
        <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.1, 1],
                                rotate: [0, 360]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Wallet className="w-6 h-6 text-green-400" />
                        </motion.div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Live Portfolio</h3>
                            <p className="text-sm text-gray-400">Real-time P&L tracking & positions</p>
                        </div>
                    </div>
                    
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1"
                    >
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-300 text-sm font-semibold">LIVE</span>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Portfolio Overview */}
                    <div className="space-y-4">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Total Value</span>
                                    <Wallet className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    ${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Cash: ${portfolio.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Total P&L</span>
                                    {isProfit ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                                </div>
                                <div className={`text-2xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                    {isProfit ? '+' : ''}${portfolio.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className={`text-xs ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                    {isProfit ? '+' : ''}{((portfolio.totalPnL / 100000) * 100).toFixed(2)}%
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Win Rate</span>
                                    <Target className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {portfolio.winRate.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500">
                                    {portfolio.totalTrades} trades
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">Positions</span>
                                    <PieChart className="w-4 h-4 text-purple-400" />
                                </div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {positions.length}
                                </div>
                                <div className="text-xs text-gray-500">
                                    ${totalPositionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} invested
                                </div>
                            </motion.div>
                        </div>

                        {/* Portfolio Chart */}
                        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm">
                            <h5 className="text-white font-semibold mb-3 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2 text-yellow-400" />
                                Portfolio Performance
                            </h5>
                            <canvas
                                ref={chartRef}
                                width={400}
                                height={200}
                                className="w-full h-auto"
                            />
                        </div>
                    </div>

                    {/* Positions & Trades */}
                    <div className="space-y-4">
                        {/* Current Positions */}
                        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm">
                            <h5 className="text-white font-semibold mb-3 flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-green-400" />
                                Current Positions ({positions.length})
                            </h5>
                            <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                <AnimatePresence>
                                    {positions.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400">
                                            No open positions
                                        </div>
                                    ) : (
                                        positions.map((position, index) => (
                                            <motion.div
                                                key={position.symbol}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-gray-700/30 border border-gray-600/20 rounded p-3"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-white">{position.symbol}</span>
                                                    <div className={`flex items-center ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {position.pnl >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                                        <span className="text-xs font-semibold">
                                                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                                                    <div>
                                                        <span>Amount: </span>
                                                        <span className="text-white">{position.amount.toFixed(4)}</span>
                                                    </div>
                                                    <div>
                                                        <span>Avg Price: </span>
                                                        <span className="text-white">${position.avgPrice.toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span>Current: </span>
                                                        <span className="text-white">${position.currentPrice.toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span>P&L%: </span>
                                                        <span className={position.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                            {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Recent Trades */}
                        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm">
                            <h5 className="text-white font-semibold mb-3 flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-blue-400" />
                                Recent Trades ({recentTrades.length})
                            </h5>
                            <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                <AnimatePresence>
                                    {recentTrades.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400">
                                            No trades executed yet
                                        </div>
                                    ) : (
                                        recentTrades.slice(0, 8).map((trade, index) => (
                                            <motion.div
                                                key={trade.id}
                                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-gray-700/30 border border-gray-600/20 rounded p-2"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            trade.side === 'buy' ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'
                                                        }`}>
                                                            {trade.side.toUpperCase()}
                                                        </span>
                                                        <span className="text-white font-medium text-sm">{trade.symbol}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{trade.agent}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                                                    <div>
                                                        <span>Amount: </span>
                                                        <span className="text-white">{trade.amount.toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span>Price: </span>
                                                        <span className="text-white">${trade.price.toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span>Value: </span>
                                                        <span className="text-white">${trade.value.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {new Date(trade.timestamp).toLocaleTimeString()}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};