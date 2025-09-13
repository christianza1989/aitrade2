'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Brain, Activity, BarChart3, Wallet, 
    AlertTriangle, Zap, Globe, Settings, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SimulationControlPanel } from '@/components/simulation/SimulationControlPanel';
import { SimulatedLiveHiveNetwork } from '@/components/simulation/SimulatedLiveHiveNetwork';
import { SimulatedMarketData } from '@/components/simulation/SimulatedMarketData';
import { SimulatedPortfolio } from '@/components/simulation/SimulatedPortfolio';
import { MarketEventsSimulator } from '@/components/simulation/MarketEventsSimulator';
import { simulationEngine } from '@/lib/simulation/SimulationEngine';

export default function SimulatePage() {
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const [showIntro, setShowIntro] = useState(true);

    useEffect(() => {
        // Subscribe to simulation status changes
        const unsubscribeStart = simulationEngine.subscribe('simulation:started', () => {
            setIsSimulationRunning(true);
            setShowIntro(false);
        });
        
        const unsubscribeStop = simulationEngine.subscribe('simulation:stopped', () => {
            setIsSimulationRunning(false);
        });

        const unsubscribeComplete = simulationEngine.subscribe('simulation:completed', () => {
            setIsSimulationRunning(false);
        });

        return () => {
            unsubscribeStart();
            unsubscribeStop();
            unsubscribeComplete();
        };
    }, []);

    const handleStartSimulation = () => {
        simulationEngine.start();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-green-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
            </div>

            {/* Simulation Control Panel */}
            <SimulationControlPanel />

            {/* Introduction Overlay */}
            <AnimatePresence>
                {showIntro && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="max-w-4xl mx-4"
                        >
                            <Card className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-black/95 border-cyan-500/30 shadow-2xl">
                                <CardContent className="p-8 text-center">
                                    <motion.div
                                        animate={{ 
                                            rotate: [0, 360],
                                            scale: [1, 1.2, 1]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center"
                                    >
                                        <Brain className="w-10 h-10 text-white" />
                                    </motion.div>

                                    <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                                        LUCID HIVE AI SIMULATION
                                    </h1>
                                    
                                    <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                                        Experience <span className="text-cyan-400 font-semibold">10 minutes</span> of live AI trading in action. 
                                        Watch intelligent agents make real-time decisions, execute trades, and adapt to market conditions 
                                        without any external API connections.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4"
                                        >
                                            <Brain className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                                            <h3 className="text-white font-semibold mb-2">AI Agents</h3>
                                            <p className="text-sm text-gray-400">6 specialized AI agents working together</p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4"
                                        >
                                            <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                                            <h3 className="text-white font-semibold mb-2">Live Market</h3>
                                            <p className="text-sm text-gray-400">Real-time price movements & volume</p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6 }}
                                            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4"
                                        >
                                            <Wallet className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                                            <h3 className="text-white font-semibold mb-2">Portfolio</h3>
                                            <p className="text-sm text-gray-400">Live P&L tracking & positions</p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.7 }}
                                            className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4"
                                        >
                                            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                                            <h3 className="text-white font-semibold mb-2">Events</h3>
                                            <p className="text-sm text-gray-400">Dynamic market events & news</p>
                                        </motion.div>
                                    </div>

                                    <div className="space-y-4">
                                        <motion.button
                                            onClick={handleStartSimulation}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transform transition-all duration-200 flex items-center space-x-3 mx-auto"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8 }}
                                        >
                                            <Play className="w-6 h-6" />
                                            <span className="text-xl">Start Live AI Simulation</span>
                                        </motion.button>

                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1 }}
                                            className="flex items-center justify-center space-x-6 text-sm text-gray-400"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Activity className="w-4 h-4 text-green-400" />
                                                <span>10 minute demo</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Globe className="w-4 h-4 text-blue-400" />
                                                <span>No APIs required</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Zap className="w-4 h-4 text-yellow-400" />
                                                <span>Fully interactive</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Dashboard Content */}
            <div className="relative z-10 p-4 lg:p-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                        AI TRADING SIMULATION
                    </h1>
                    <p className="text-gray-300 text-lg max-w-3xl mx-auto">
                        {isSimulationRunning 
                            ? "Live AI trading simulation in progress. Watch agents analyze markets, make decisions, and execute trades in real-time."
                            : "The ultimate demonstration of AI-powered trading. Start the simulation to see intelligent agents in action."
                        }
                    </p>
                    
                    {isSimulationRunning && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 inline-flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2"
                        >
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
                            <span className="text-green-300 font-semibold">SIMULATION ACTIVE</span>
                        </motion.div>
                    )}
                </motion.div>

                {/* Dashboard Grid */}
                <AnimatePresence>
                    {isSimulationRunning && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-8"
                        >
                            {/* AI Network - Main Feature */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <SimulatedLiveHiveNetwork />
                            </motion.div>

                            {/* Market Data & Portfolio Row */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-1 xl:grid-cols-2 gap-8"
                            >
                                <SimulatedMarketData />
                                <SimulatedPortfolio />
                            </motion.div>

                            {/* Market Events */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <MarketEventsSimulator />
                            </motion.div>

                            {/* Information Footer */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-center py-8"
                            >
                                <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-gray-700/30 backdrop-blur-xl max-w-4xl mx-auto">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-center space-x-3 mb-4">
                                            <Info className="w-5 h-5 text-blue-400" />
                                            <h3 className="text-lg font-semibold text-white">Simulation Information</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400">
                                            <div className="text-center">
                                                <div className="text-white font-semibold mb-1">Duration</div>
                                                <div>10 minutes of live AI trading activity</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-white font-semibold mb-1">Technology</div>
                                                <div>Real-time simulation engine with dummy data</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-white font-semibold mb-1">Purpose</div>
                                                <div>Demonstrate AI trading capabilities to investors</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Placeholder when simulation not running */}
                <AnimatePresence>
                    {!isSimulationRunning && !showIntro && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-20"
                        >
                            <motion.div
                                animate={{ 
                                    rotate: [0, 360],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center opacity-50"
                            >
                                <Settings className="w-10 h-10 text-gray-400" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-gray-400 mb-4">Simulation Stopped</h2>
                            <p className="text-gray-500 mb-6">Use the control panel in the top-right to start the simulation</p>
                            <motion.button
                                onClick={() => setShowIntro(true)}
                                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Show Introduction
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}