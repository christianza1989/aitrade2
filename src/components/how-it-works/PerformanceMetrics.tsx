"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Target, Clock, BarChart3, Activity, Zap, Award, Shield, Users } from 'lucide-react';

interface Metric {
    label: string;
    value: string;
    change: number;
    icon: React.ComponentType<any>;
    color: string;
}

export function PerformanceMetrics() {
    const [metrics, setMetrics] = useState<Metric[]>([
        {
            label: 'Total Return',
            value: '+24.7%',
            change: 2.1,
            icon: TrendingUp,
            color: 'text-green-400'
        },
        {
            label: 'Portfolio Value',
            value: '$127,450',
            change: 1.8,
            icon: DollarSign,
            color: 'text-blue-400'
        },
        {
            label: 'Win Rate',
            value: '68.4%',
            change: -0.3,
            icon: Target,
            color: 'text-purple-400'
        },
        {
            label: 'Avg Trade Time',
            value: '4.2h',
            change: -0.8,
            icon: Clock,
            color: 'text-orange-400'
        }
    ]);

    const [performanceData, setPerformanceData] = useState({
        daily: [12, 19, 15, 25, 22, 18, 20],
        weekly: [45, 52, 49, 61, 58, 55, 62],
        monthly: [180, 195, 210, 225, 240, 235, 247]
    });

    const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => prev.map(metric => ({
                ...metric,
                change: metric.change + (Math.random() - 0.5) * 0.5
            })));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-400';
        if (change < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getChangeIcon = (change: number) => {
        if (change > 0) return '↗';
        if (change < 0) return '↘';
        return '→';
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700/50">
            {/* Enhanced Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 mb-6 backdrop-blur-sm"
                >
                    <Award className="w-5 h-5 text-green-400 mr-3" />
                    <span className="text-green-300 text-sm font-semibold tracking-wide">PERFORMANCE ANALYTICS</span>
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Real-Time Performance
                </h2>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                    Live performance tracking and comprehensive metrics showcasing the Lucid Hive's
                    effectiveness across all market conditions with continuous optimization.
                </p>
            </motion.div>

            {/* Enhanced Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="group relative"
                    >
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm h-full">
                            <div className="flex items-center justify-between mb-6">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className={`p-3 rounded-xl bg-gradient-to-br ${
                                        metric.label === 'Total Return' ? 'from-green-500 to-emerald-500' :
                                        metric.label === 'Portfolio Value' ? 'from-blue-500 to-cyan-500' :
                                        metric.label === 'Win Rate' ? 'from-purple-500 to-pink-500' :
                                        'from-orange-500 to-red-500'
                                    } shadow-lg`}
                                >
                                    <metric.icon className="w-6 h-6 text-white" />
                                </motion.div>

                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                        getChangeColor(metric.change).includes('green')
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                            : getChangeColor(metric.change).includes('red')
                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                    }`}
                                >
                                    <span className="mr-1">{getChangeIcon(metric.change)}</span>
                                    <span>{Math.abs(metric.change).toFixed(1)}%</span>
                                </motion.div>
                            </div>

                            <div className="text-3xl font-black text-white mb-2">{metric.value}</div>
                            <div className="text-sm text-gray-400 font-medium">{metric.label}</div>

                            {/* Live Indicator */}
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Enhanced Performance Chart */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 mb-12 border border-gray-700/30 backdrop-blur-sm"
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg"
                        >
                            <BarChart3 className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">Performance Trend</h3>
                            <p className="text-gray-400">Real-time performance analytics</p>
                        </div>
                    </div>

                    <div className="flex space-x-2 bg-gray-900/50 rounded-xl p-1 border border-gray-700/50">
                        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                            <motion.button
                                key={period}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setTimeframe(period)}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                                    timeframe === period
                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Enhanced Bar Chart */}
                <div className="relative">
                    <div className="flex items-end justify-between h-40 space-x-3 mb-6">
                        {performanceData[timeframe].map((value, index) => (
                            <motion.div
                                key={index}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: `${(value / Math.max(...performanceData[timeframe])) * 100}%`, opacity: 1 }}
                                transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                                className="flex-1 relative group"
                            >
                                {/* Bar */}
                                <div className="w-full bg-gradient-to-t from-purple-600 via-purple-500 to-purple-400 rounded-t-xl shadow-lg relative overflow-hidden">
                                    {/* Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Value Label */}
                                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900/90 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-lg border border-gray-700/50">
                                        {value}%
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/90"></div>
                                    </div>
                                </div>

                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 to-transparent rounded-t-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                            </motion.div>
                        ))}
                    </div>

                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-xs text-gray-400 px-3">
                        {performanceData[timeframe].map((_, index) => (
                            <span key={index} className="text-center">
                                {timeframe === 'daily'
                                    ? `Day ${index + 1}`
                                    : timeframe === 'weekly'
                                    ? `Week ${index + 1}`
                                    : `Month ${index + 1}`}
                            </span>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Enhanced Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    {
                        icon: Activity,
                        value: '1,247',
                        label: 'Trades Executed',
                        change: '+12 this week',
                        color: 'from-green-500 to-emerald-500',
                        bgColor: 'from-green-500/10 to-emerald-500/10'
                    },
                    {
                        icon: Shield,
                        value: '94.2%',
                        label: 'System Uptime',
                        change: 'Last 30 days',
                        color: 'from-blue-500 to-cyan-500',
                        bgColor: 'from-blue-500/10 to-cyan-500/10'
                    },
                    {
                        icon: Zap,
                        value: '2.4s',
                        label: 'Avg Response Time',
                        change: '-0.3s improvement',
                        color: 'from-orange-500 to-red-500',
                        bgColor: 'from-orange-500/10 to-red-500/10'
                    }
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="group relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm text-center h-full">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${stat.color} mb-6 mx-auto shadow-lg`}
                            >
                                <stat.icon className="w-8 h-8 text-white" />
                            </motion.div>

                            <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
                            <div className="text-lg text-gray-300 font-semibold mb-2">{stat.label}</div>
                            <div className={`text-sm font-medium ${
                                stat.change.includes('+') ? 'text-green-400' :
                                stat.change.includes('-') ? 'text-red-400' :
                                'text-blue-400'
                            }`}>
                                {stat.change}
                            </div>

                            {/* Live Pulse */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
