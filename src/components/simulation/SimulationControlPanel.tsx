'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, Square, RotateCcw, Settings, 
    Zap, Clock, TrendingUp, Activity, Gauge,
    ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { simulationEngine } from '@/lib/simulation/SimulationEngine';

interface SimulationStatus {
    isRunning: boolean;
    isPaused: boolean;
    speed: number;
    elapsedTime: number;
    remainingTime: number;
    progress: number;
}

export const SimulationControlPanel: React.FC = () => {
    const [status, setStatus] = useState<SimulationStatus>({
        isRunning: false,
        isPaused: false,
        speed: 1,
        elapsedTime: 0,
        remainingTime: 600000,
        progress: 0
    });
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Subscribe to simulation status updates
        const unsubscribe = simulationEngine.subscribe('simulation:status', (newStatus: SimulationStatus) => {
            setStatus(newStatus);
        });

        // Update status every second
        const statusInterval = setInterval(() => {
            const currentStatus = simulationEngine.getSimulationStatus();
            setStatus(currentStatus);
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(statusInterval);
        };
    }, []);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        simulationEngine.start();
    };

    const handlePause = () => {
        simulationEngine.pause();
    };

    const handleStop = () => {
        simulationEngine.stop();
    };

    const handleReset = () => {
        simulationEngine.reset();
    };

    const handleSpeedChange = (newSpeed: number) => {
        simulationEngine.setSpeed(newSpeed);
    };

    const speedOptions = [0.5, 1, 2, 5, 10];

    const getStatusColor = () => {
        if (!status.isRunning) return 'from-gray-500 to-gray-600';
        if (status.isPaused) return 'from-yellow-500 to-orange-500';
        return 'from-green-500 to-emerald-500';
    };

    const getStatusText = () => {
        if (!status.isRunning) return 'STOPPED';
        if (status.isPaused) return 'PAUSED';
        return 'RUNNING';
    };

    if (!isVisible) {
        return (
            <motion.button
                onClick={() => setIsVisible(true)}
                className="fixed top-4 right-4 z-50 p-3 bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Eye className="w-5 h-5 text-white" />
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 right-4 z-50 w-80"
        >
            <Card className="bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-2xl">
                <CardContent className="p-4">
                    {/* Main Control Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <motion.div
                                animate={{ 
                                    rotate: status.isRunning && !status.isPaused ? [0, 360] : 0,
                                    scale: status.isRunning && !status.isPaused ? [1, 1.1, 1] : 1
                                }}
                                transition={{ 
                                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                    scale: { duration: 1, repeat: Infinity }
                                }}
                            >
                                <Activity className="w-6 h-6 text-cyan-400" />
                            </motion.div>
                            <div>
                                <h3 className="text-white font-bold text-sm">AI Simulation</h3>
                                <p className="text-xs text-gray-400">Live Demo Mode</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <motion.button
                                onClick={() => setIsVisible(false)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <EyeOff className="w-4 h-4" />
                            </motion.button>
                            
                            <motion.button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </motion.button>
                        </div>
                    </div>

                    {/* Status Display */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor()} text-white`}>
                                {getStatusText()}
                            </span>
                            <span className="text-sm text-gray-400">
                                Speed: {status.speed}x
                            </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <motion.div
                                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${status.progress * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        
                        {/* Time Display */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Elapsed: {formatTime(status.elapsedTime)}
                            </span>
                            <span>Remaining: {formatTime(status.remainingTime)}</span>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <motion.button
                            onClick={handleStart}
                            disabled={status.isRunning && !status.isPaused}
                            className={`p-2 rounded-lg border transition-colors duration-200 ${
                                status.isRunning && !status.isPaused
                                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                    : 'bg-gray-800/50 border-gray-600/30 text-gray-300 hover:border-green-500/30 hover:text-green-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            whileHover={{ scale: status.isRunning && !status.isPaused ? 1 : 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Play className="w-4 h-4 mx-auto" />
                        </motion.button>

                        <motion.button
                            onClick={handlePause}
                            disabled={!status.isRunning}
                            className={`p-2 rounded-lg border transition-colors duration-200 ${
                                status.isPaused
                                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                                    : 'bg-gray-800/50 border-gray-600/30 text-gray-300 hover:border-yellow-500/30 hover:text-yellow-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            whileHover={{ scale: !status.isRunning ? 1 : 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Pause className="w-4 h-4 mx-auto" />
                        </motion.button>

                        <motion.button
                            onClick={handleStop}
                            disabled={!status.isRunning}
                            className="p-2 rounded-lg border bg-gray-800/50 border-gray-600/30 text-gray-300 hover:border-red-500/30 hover:text-red-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: !status.isRunning ? 1 : 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Square className="w-4 h-4 mx-auto" />
                        </motion.button>

                        <motion.button
                            onClick={handleReset}
                            className="p-2 rounded-lg border bg-gray-800/50 border-gray-600/30 text-gray-300 hover:border-blue-500/30 hover:text-blue-400 transition-colors duration-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RotateCcw className="w-4 h-4 mx-auto" />
                        </motion.button>
                    </div>

                    {/* Expanded Controls */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {/* Speed Control */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm text-gray-300 flex items-center">
                                            <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                                            Simulation Speed
                                        </label>
                                        <span className="text-xs text-gray-400">{status.speed}x</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1">
                                        {speedOptions.map(speed => (
                                            <motion.button
                                                key={speed}
                                                onClick={() => handleSpeedChange(speed)}
                                                className={`p-2 text-xs rounded border transition-colors duration-200 ${
                                                    status.speed === speed
                                                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                                                        : 'bg-gray-800/50 border-gray-600/30 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-400'
                                                }`}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                {speed}x
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Advanced Settings Toggle */}
                                <motion.button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between p-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-gray-300 hover:border-gray-500/50 transition-colors duration-200"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex items-center">
                                        <Settings className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Advanced Settings</span>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: showAdvanced ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </motion.div>
                                </motion.button>

                                {/* Advanced Settings */}
                                <AnimatePresence>
                                    {showAdvanced && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-3 pl-4 border-l-2 border-gray-600/30"
                                        >
                                            <div className="text-xs text-gray-400">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span>Market Volatility:</span>
                                                    <span className="text-yellow-400">High</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span>AI Aggressiveness:</span>
                                                    <span className="text-green-400">Moderate</span>
                                                </div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span>Event Frequency:</span>
                                                    <span className="text-blue-400">Normal</span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-gray-500">
                                                <p className="mb-2">
                                                    📊 This simulation demonstrates 10 minutes of live AI trading activity with realistic market conditions.
                                                </p>
                                                <p>
                                                    🤖 Watch AI agents make decisions, execute trades, and adapt to market events in real-time.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Stats */}
                    {status.isRunning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 pt-4 border-t border-gray-600/30"
                        >
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="text-center">
                                    <div className="text-gray-400">Progress</div>
                                    <div className="text-white font-semibold">
                                        {Math.round(status.progress * 100)}%
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-400">Status</div>
                                    <div className={`font-semibold ${
                                        status.isPaused ? 'text-yellow-400' : 'text-green-400'
                                    }`}>
                                        {status.isPaused ? 'Paused' : 'Active'}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};