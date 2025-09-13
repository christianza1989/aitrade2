// src/app/dashboard/page.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { MarketTable } from '@/components/market-table';
import { KpiCard } from '@/components/kpi-card';
import { NewsFeed } from '@/components/news-feed';
import { OpportunityLog } from '@/components/opportunity-log';
import { DollarSign, TrendingUp, Wallet, LoaderCircle, Activity, BarChart3, Zap, Shield, Brain, Cpu, Network } from 'lucide-react';
import { ActivityFeed } from '@/components/ActivityFeed';
import { MacroEnvironmentCard } from '@/components/MacroEnvironmentCard';
import { MarketSentimentCard } from '@/components/MarketSentimentCard';
import { AlertTriangle } from 'lucide-react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatefulContainer } from '@/components/ui/stateful-container';
import { LiveHiveNetwork } from '@/components/lucid-hive/LiveHiveNetwork';
import { MarketPulse } from '@/components/lucid-hive/MarketPulse';
import { AIDecisionFlow } from '@/components/lucid-hive/AIDecisionFlow';
import { PerformanceAnalytics } from '@/components/lucid-hive/PerformanceAnalytics';
import { Portfolio3DGlobe } from '@/components/lucid-hive/Portfolio3DGlobe';
import { FloatingAIControl } from '@/components/lucid-hive/FloatingAIControl';
import { ParticlesBackground } from '@/components/ui/ParticlesBackground';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { state } = useDashboard();

    if (state.isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-6"
                    />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        Lucid Hive Awakening...
                    </h2>
                    <p className="text-gray-400">Initializing AI Trading Network</p>
                </motion.div>
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
        <div className="min-h-screen text-white relative overflow-hidden">
            {/* Particles Background */}
            <ParticlesBackground theme="ai" density={60} speed={0.3} className="z-0" />
            
            {/* Enhanced Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-amber-500/5 to-cyan-500/5 rounded-full blur-2xl animate-pulse delay-500" />
            </div>

            {/* Mission Control Header */}
            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-20 p-8"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center space-x-4">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="relative"
                        >
                            <Brain className="w-10 h-10 text-cyan-400" />
                            <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-lg" />
                        </motion.div>
                        <div>
                            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                LUCID HIVE
                            </h1>
                            <p className="text-gray-300 text-sm font-medium">AI Trading Mission Control</p>
                        </div>
                    </div>
                    
                    {/* Status Indicators */}
                    <div className="flex items-center space-x-6">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2"
                        >
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                            <span className="text-green-300 text-sm font-semibold">ONLINE</span>
                        </motion.div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-white">
                                ${state.portfolio?.balance?.toLocaleString() || '100,000'}
                            </p>
                            <p className="text-gray-400 text-sm">Portfolio Value</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="relative z-20 px-8 pb-8 space-y-8">
                {/* LIVE HIVE NETWORK - THE CENTERPIECE */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="w-full"
                >
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                            <Network className="w-6 h-6 mr-3 text-cyan-400" />
                            Live AI Hive Network
                        </h2>
                        <p className="text-gray-400">Real-time visualization of AI agents communication and decision flow</p>
                    </div>
                    <LiveHiveNetwork />
                </motion.div>

                {/* AI Decision Flow */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="w-full"
                >
                    <AIDecisionFlow />
                </motion.div>

                {/* Market Pulse and Performance Analytics Row */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                >
                    <MarketPulse />
                    <PerformanceAnalytics />
                </motion.div>

                {/* Global Portfolio Distribution */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.0, duration: 0.8 }}
                    className="w-full"
                >
                    <Portfolio3DGlobe />
                </motion.div>

                {/* Enhanced KPI Cards Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-8"
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
                    transition={{ delay: 0.8 }}
                    className="mb-8"
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
                    transition={{ delay: 1.0 }}
                    className="mb-8"
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

            {/* Floating AI Control */}
            <FloatingAIControl />
        </div>
    );
}
