'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity, DollarSign, Percent, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PerformanceMetric {
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
    target?: number;
}

interface ChartDataPoint {
    timestamp: number;
    portfolio: number;
    benchmark: number;
    drawdown: number;
}

interface TradeStats {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgReturn: number;
}

export const PerformanceAnalytics: React.FC = () => {
    const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1W');
    const chartRef = useRef<HTMLCanvasElement>(null);

    // Generate performance metrics
    const generateMetrics = (): PerformanceMetric[] => {
        return [
            {
                label: 'Total Return',
                value: 15.67,
                change: 2.34,
                trend: 'up',
                target: 20
            },
            {
                label: 'Annual Return',
                value: 24.12,
                change: -1.23,
                trend: 'down',
                target: 25
            },
            {
                label: 'Volatility',
                value: 12.45,
                change: 0.87,
                trend: 'up',
                target: 15
            },
            {
                label: 'Sharpe Ratio',
                value: 1.89,
                change: 0.12,
                trend: 'up',
                target: 2.0
            }
        ];
    };

    // Generate chart data
    const generateChartData = (): ChartDataPoint[] => {
        const baseValue = 100000;
        const points = 30;
        const data: ChartDataPoint[] = [];
        
        let portfolioValue = baseValue;
        let benchmarkValue = baseValue;
        let maxValue = baseValue;

        for (let i = 0; i < points; i++) {
            const portfolioChange = (Math.random() - 0.45) * 0.02; // Slight positive bias
            const benchmarkChange = (Math.random() - 0.5) * 0.015;
            
            portfolioValue *= (1 + portfolioChange);
            benchmarkValue *= (1 + benchmarkChange);
            maxValue = Math.max(maxValue, portfolioValue);

            data.push({
                timestamp: Date.now() - (points - i) * 24 * 60 * 60 * 1000,
                portfolio: portfolioValue,
                benchmark: benchmarkValue,
                drawdown: ((maxValue - portfolioValue) / maxValue) * 100
            });
        }

        return data;
    };

    // Generate trade statistics
    const generateTradeStats = (): TradeStats => {
        return {
            totalTrades: 1247,
            winRate: 68.4,
            profitFactor: 2.34,
            sharpeRatio: 1.89,
            maxDrawdown: 8.7,
            avgReturn: 0.12
        };
    };

    // Canvas chart drawing
    useEffect(() => {
        const canvas = chartRef.current;
        if (!canvas || chartData.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Calculate scales
        const minValue = Math.min(...chartData.map(d => Math.min(d.portfolio, d.benchmark)));
        const maxValue = Math.max(...chartData.map(d => Math.max(d.portfolio, d.benchmark)));
        const valueRange = maxValue - minValue;

        // Draw grid
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= 5; i++) {
            const x = padding + (chartWidth / 5) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw portfolio line
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        chartData.forEach((point, index) => {
            const x = padding + (chartWidth / (chartData.length - 1)) * index;
            const y = height - padding - ((point.portfolio - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw benchmark line
        ctx.strokeStyle = '#6B7280';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        chartData.forEach((point, index) => {
            const x = padding + (chartWidth / (chartData.length - 1)) * index;
            const y = height - padding - ((point.benchmark - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw data points
        chartData.forEach((point, index) => {
            const x = padding + (chartWidth / (chartData.length - 1)) * index;
            const portfolioY = height - padding - ((point.portfolio - minValue) / valueRange) * chartHeight;
            
            // Portfolio point
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(x, portfolioY, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Glow effect
            ctx.shadowColor = '#10B981';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, portfolioY, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

    }, [chartData]);

    // Initialize data
    useEffect(() => {
        setMetrics(generateMetrics());
        setChartData(generateChartData());
        setTradeStats(generateTradeStats());

        const interval = setInterval(() => {
            setMetrics(generateMetrics());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const timeframes = ['1D', '1W', '1M', '3M', '1Y'] as const;

    return (
        <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <BarChart3 className="w-6 h-6 text-green-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white">Performance Analytics</h3>
                    </div>
                    
                    {/* Timeframe selector */}
                    <div className="flex items-center space-x-1 bg-gray-800/50 border border-gray-600/30 rounded-lg p-1">
                        {timeframes.map((timeframe) => (
                            <motion.button
                                key={timeframe}
                                onClick={() => setSelectedTimeframe(timeframe)}
                                className={`px-3 py-1 text-sm font-medium rounded transition-colors duration-200 ${
                                    selectedTimeframe === timeframe
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {timeframe}
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Performance Chart */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-xl blur-2xl" />
                            <div className="relative bg-black/40 border border-gray-600/30 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-white">Portfolio vs Benchmark</h4>
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-1 bg-green-400 rounded" />
                                            <span className="text-xs text-gray-400">Portfolio</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-1 bg-gray-400 rounded border-dashed" />
                                            <span className="text-xs text-gray-400">Benchmark</span>
                                        </div>
                                    </div>
                                </div>
                                <canvas
                                    ref={chartRef}
                                    width={600}
                                    height={300}
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Target className="w-5 h-5 text-blue-400 mr-2" />
                            Key Metrics
                        </h4>
                        
                        <AnimatePresence>
                            {metrics.map((metric, index) => (
                                <motion.div
                                    key={metric.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-400">{metric.label}</span>
                                            <div className="flex items-center space-x-1">
                                                {metric.trend === 'up' ? (
                                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                                ) : metric.trend === 'down' ? (
                                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                                ) : (
                                                    <Activity className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-white">
                                                {metric.label.includes('Return') || metric.label.includes('Volatility') 
                                                    ? `${metric.value.toFixed(2)}%`
                                                    : metric.value.toFixed(2)
                                                }
                                            </span>
                                            <span className={`text-sm font-medium ${
                                                metric.change > 0 ? 'text-green-400' : 
                                                metric.change < 0 ? 'text-red-400' : 'text-gray-400'
                                            }`}>
                                                {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
                                            </span>
                                        </div>

                                        {/* Progress bar for targets */}
                                        {metric.target && (
                                            <div className="mt-2">
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                    <span>Target: {metric.target}%</span>
                                                    <span>{((metric.value / metric.target) * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                    <motion.div
                                                        className="bg-gradient-to-r from-green-400 to-blue-400 h-1.5 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                                                        transition={{ delay: 0.5, duration: 1 }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Trade Statistics */}
                        {tradeStats && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mt-6"
                            >
                                <h5 className="text-md font-semibold text-white mb-3 flex items-center">
                                    <PieChart className="w-4 h-4 text-purple-400 mr-2" />
                                    Trade Statistics
                                </h5>
                                <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-400">Total Trades</span>
                                            <div className="font-semibold text-white">{tradeStats.totalTrades.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Win Rate</span>
                                            <div className="font-semibold text-green-400">{tradeStats.winRate.toFixed(1)}%</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Profit Factor</span>
                                            <div className="font-semibold text-blue-400">{tradeStats.profitFactor.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Max Drawdown</span>
                                            <div className="font-semibold text-red-400">{tradeStats.maxDrawdown.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};