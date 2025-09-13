'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Brain, Settings, Play, Pause, RotateCcw, Zap, 
    Shield, Target, TrendingUp, Activity, Power,
    ChevronUp, ChevronDown
} from 'lucide-react';

interface AIControlProps {
    className?: string;
}

export const FloatingAIControl: React.FC<AIControlProps> = ({ className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiStatus, setAiStatus] = useState<'running' | 'paused' | 'stopped'>('running');
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

    const agents = [
        { name: 'MacroAnalyst', icon: TrendingUp, status: 'active', performance: 94 },
        { name: 'SentimentAnalyst', icon: Brain, status: 'active', performance: 87 },
        { name: 'TechnicalAnalyst', icon: Zap, status: 'active', performance: 91 },
        { name: 'RiskManager', icon: Shield, status: 'active', performance: 98 },
        { name: 'PositionManager', icon: Target, status: 'active', performance: 89 },
    ];

    const handleAIControl = (action: 'play' | 'pause' | 'restart' | 'stop') => {
        switch (action) {
            case 'play':
                setAiStatus('running');
                break;
            case 'pause':
                setAiStatus('paused');
                break;
            case 'stop':
                setAiStatus('stopped');
                break;
            case 'restart':
                setAiStatus('running');
                break;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'from-green-500 to-emerald-600';
            case 'paused': return 'from-yellow-500 to-orange-600';
            case 'stopped': return 'from-red-500 to-rose-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    return (
        <div className={`fixed bottom-8 right-8 z-50 ${className}`}>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-20 right-0 w-80"
                    >
                        {/* Main Control Panel */}
                        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-gray-700/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <motion.div
                                            animate={{ rotate: aiStatus === 'running' ? 360 : 0 }}
                                            transition={{ duration: 2, repeat: aiStatus === 'running' ? Infinity : 0, ease: "linear" }}
                                        >
                                            <Brain className="w-6 h-6 text-cyan-400" />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-white font-bold">AI Control Center</h3>
                                            <p className="text-xs text-gray-400 capitalize">{aiStatus}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor(aiStatus)} text-white`}>
                                        {aiStatus.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="p-4 border-b border-gray-700/50">
                                <div className="grid grid-cols-4 gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAIControl('play')}
                                        className={`p-3 rounded-lg border transition-colors duration-200 ${
                                            aiStatus === 'running'
                                                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                                : 'bg-gray-800/50 border-gray-600/30 text-gray-400 hover:border-green-500/30 hover:text-green-400'
                                        }`}
                                    >
                                        <Play className="w-5 h-5 mx-auto" />
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAIControl('pause')}
                                        className={`p-3 rounded-lg border transition-colors duration-200 ${
                                            aiStatus === 'paused'
                                                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                                                : 'bg-gray-800/50 border-gray-600/30 text-gray-400 hover:border-yellow-500/30 hover:text-yellow-400'
                                        }`}
                                    >
                                        <Pause className="w-5 h-5 mx-auto" />
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAIControl('restart')}
                                        className="p-3 rounded-lg border bg-gray-800/50 border-gray-600/30 text-gray-400 hover:border-blue-500/30 hover:text-blue-400 transition-colors duration-200"
                                    >
                                        <RotateCcw className="w-5 h-5 mx-auto" />
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAIControl('stop')}
                                        className={`p-3 rounded-lg border transition-colors duration-200 ${
                                            aiStatus === 'stopped'
                                                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                                : 'bg-gray-800/50 border-gray-600/30 text-gray-400 hover:border-red-500/30 hover:text-red-400'
                                        }`}
                                    >
                                        <Power className="w-5 h-5 mx-auto" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Agent Status */}
                            <div className="p-4">
                                <h4 className="text-white font-semibold mb-3 flex items-center">
                                    <Activity className="w-4 h-4 mr-2 text-cyan-400" />
                                    Agent Status
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                    {agents.map((agent) => {
                                        const IconComponent = agent.icon;
                                        return (
                                            <motion.div
                                                key={agent.name}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                    selectedAgent === agent.name
                                                        ? 'bg-cyan-500/10 border-cyan-500/30'
                                                        : 'bg-gray-800/50 border-gray-600/30 hover:border-gray-500/50'
                                                }`}
                                                onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="relative">
                                                            <IconComponent className="w-4 h-4 text-cyan-400" />
                                                            <motion.div
                                                                animate={{
                                                                    scale: [1, 1.2, 1],
                                                                    opacity: [0.5, 1, 0.5]
                                                                }}
                                                                transition={{
                                                                    duration: 2,
                                                                    repeat: Infinity,
                                                                    delay: Math.random() * 2
                                                                }}
                                                                className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-white font-medium">{agent.name}</div>
                                                            <div className="text-xs text-gray-400">Performance: {agent.performance}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            agent.status === 'active' ? 'bg-green-400' : 'bg-gray-500'
                                                        } shadow-lg shadow-current/50`} />
                                                    </div>
                                                </div>
                                                
                                                {/* Performance bar */}
                                                <div className="mt-2">
                                                    <div className="w-full bg-gray-700 rounded-full h-1">
                                                        <motion.div
                                                            className="bg-gradient-to-r from-green-400 to-cyan-400 h-1 rounded-full"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${agent.performance}%` }}
                                                            transition={{ delay: 0.5, duration: 1 }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="relative group"
            >
                {/* Pulsing rings */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${getStatusColor(aiStatus)} blur-xl`}
                />
                
                {/* Main button */}
                <div className={`relative w-16 h-16 rounded-full bg-gradient-to-r ${getStatusColor(aiStatus)} shadow-2xl flex items-center justify-center border-2 border-white/10 backdrop-blur-xl`}>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-6 h-6 text-white" />
                        ) : (
                            <Brain className="w-6 h-6 text-white" />
                        )}
                    </motion.div>
                    
                    {/* Status indicator */}
                    <motion.div
                        animate={{
                            scale: aiStatus === 'running' ? [1, 1.3, 1] : 1,
                            opacity: aiStatus === 'running' ? [0.7, 1, 0.7] : 0.7
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: aiStatus === 'running' ? Infinity : 0
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow-lg flex items-center justify-center"
                    >
                        <div className={`w-2 h-2 rounded-full ${
                            aiStatus === 'running' ? 'bg-green-500' :
                            aiStatus === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                    </motion.div>
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    AI Control Center
                </div>
            </motion.button>
        </div>
    );
};