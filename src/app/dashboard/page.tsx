// src/app/dashboard/page.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { MarketTable } from '@/components/market-table';
import { KpiCard } from '@/components/kpi-card';
import { NewsFeed } from '@/components/news-feed';
import { OpportunityLog } from '@/components/opportunity-log';
import { DollarSign, TrendingUp, Wallet, LoaderCircle, Activity, BarChart3, Zap, Shield } from 'lucide-react';
import { ActivityFeed } from '@/components/ActivityFeed';
import { MacroEnvironmentCard } from '@/components/MacroEnvironmentCard';
import { MarketSentimentCard } from '@/components/MarketSentimentCard';
import { AlertTriangle } from 'lucide-react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatefulContainer } from '@/components/ui/stateful-container';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { state } = useDashboard();

    if (state.isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <LoaderCircle className="animate-spin mr-3" size={24} />
                <span>Loading Dashboard Data...</span>
            </div>
        );
    }

    // Add this block right after the isLoading check
    if (state.error) {
        return (
            <div className="flex items-center justify-center h-full text-white bg-red-900 bg-opacity-30 p-8 rounded-lg">
                <AlertTriangle className="text-red-400 mr-4" size={40} />
                <div>
                    <h2 className="text-xl font-bold text-red-400">A Critical Error Occurred</h2>
                    <p className="text-red-200">{state.error}</p>
                    <p className="text-red-300 mt-2 text-sm">Please try refreshing the page in a few moments.</p>
                </div>
            </div>
        );
    }

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
                    className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6 backdrop-blur-sm"
                >
                    <Activity className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-blue-300 text-sm font-semibold tracking-wide">TRADING DASHBOARD</span>
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Portfolio Overview
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
                    Real-time monitoring of your trading performance, market conditions, and AI-driven insights.
                    Stay ahead of the market with intelligent analytics and automated decision-making.
                </p>
            </motion.div>

            {/* Enhanced KPI Cards Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-12"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BarChart3 className="w-6 h-6 text-purple-400 mr-3" />
                            Key Performance Indicators
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div id="kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <KpiCard title="Total Value" kpiKey="totalValue" icon={<Wallet size={24} />} helpTopicId="total-portfolio-value" />
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <KpiCard title="24h P/L" kpiKey="24h_pnl" icon={<TrendingUp size={24} />} />
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <KpiCard title="Free Collateral" kpiKey="freeCollateral" icon={<DollarSign size={24} />} />
                                </div>
                            </motion.div>

                            {/* System Status Card */}
                            <motion.div
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <Card className="h-full">
                                        <CardContent className="flex items-center justify-between">
                                            <div>
                                                <div className="text-2xl font-black text-white mb-1">Online</div>
                                                <div className="text-sm text-gray-400 font-medium">System Status</div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Shield className="w-8 h-8 text-green-400" />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Enhanced Market Analysis Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-12"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Zap className="w-6 h-6 text-yellow-400 mr-3" />
                            Market Intelligence
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <motion.div
                                whileHover={{ y: -5, scale: 1.01 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <MacroEnvironmentCard />
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5, scale: 1.01 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative">
                                    <MarketSentimentCard />
                                </div>
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Enhanced Trading Operations Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Activity className="w-6 h-6 text-blue-400 mr-3" />
                            Trading Operations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <motion.div
                                className="lg:col-span-2"
                                whileHover={{ y: -5, scale: 1.01 }}
                            >
                                <Card>
                                    <CardContent>
                                        <StatefulContainer
                                            isLoading={state.isLoading}
                                            error={state.error}
                                            data={state.marketData}
                                            emptyStateMessage="No market data available. Market data will appear once the system connects to the exchange."
                                        >
                                            <MarketTable />
                                        </StatefulContainer>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5, scale: 1.01 }}
                                className="space-y-6"
                            >
                                <Card>
                                    <CardContent>
                                        <div id="chat-interface-card">
                                            <ChatInterface />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
