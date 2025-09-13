"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentNode, AgentStatus } from './AgentNode';
import { IconName } from '../AgentIcon';
import { DataFlowLine } from './DataFlowLine';
import { LiveAgentDetailPanel } from '../LiveAgentDetailPanel';
import { TimelineControl } from '../TimelineControl';
import { useDashboard } from '@/context/DashboardContext';
import { Activity, Play, Pause, RotateCcw, Eye, EyeOff, Zap, Cpu, Network, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AgentData {
    name: string;
    description: string;
    icon: IconName;
    position: { x: number; y: number };
    connections: string[];
    metrics: { avgResponseTime: string } | null;
}

interface LiveDashboardProps {
    agents: AgentData[];
    activity: any[];
    aiChat: any[];
}

export function LiveDashboard({ agents, activity, aiChat }: LiveDashboardProps) {
    const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [replayActivity, setReplayActivity] = useState<any[]>([]);
    const [cycleIds, setCycleIds] = useState<string[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [contextualLog, setContextualLog] = useState<string[]>([]);
    const [showControls, setShowControls] = useState(true);

    const activityToDisplay = isLiveMode ? activity : replayActivity;
    const animationFrameRef = useRef<NodeJS.Timeout | null>(null);
    const activityIndexRef = useRef(0);

    useEffect(() => {
        const fetchCycles = async () => {
            const res = await fetch('/api/agent-activity/cycles');
            if (res.ok) setCycleIds(await res.json());
        };
        fetchCycles();
    }, []);

    const handleCycleSelect = async (cycleId: string) => {
        setIsLiveMode(false);
        setIsPlaying(false);
        const res = await fetch(`/api/agent-activity/replay/${cycleId}`);
        if (res.ok) {
            const data = await res.json();
            setReplayActivity([]);
            setContextualLog([`Cycle ${cycleId.substring(0,8)} loaded. Press Play to start.`]);
            (window as any).__replayData = data;
            activityIndexRef.current = 0;
        }
    };

    const handlePlayPause = () => setIsPlaying(!isPlaying);
    const handleReset = () => {
        setIsLiveMode(true);
        setReplayActivity([]);
        setContextualLog([]);
    };

    useEffect(() => {
        if (isPlaying && !isLiveMode) {
            const replayData = (window as any).__replayData;
            if (!replayData || activityIndexRef.current >= replayData.length) {
                setIsPlaying(false);
                return;
            }

            const animate = () => {
                const currentEvent = replayData[activityIndexRef.current];
                setReplayActivity(prev => [...prev, currentEvent]);
                setContextualLog(prev => [...prev, `${new Date(currentEvent.timestamp).toLocaleTimeString()} - ${currentEvent.agentName}: ${currentEvent.status}`].slice(-10));

                activityIndexRef.current++;

                if (activityIndexRef.current < replayData.length) {
                    animationFrameRef.current = setTimeout(animate, 500);
                } else {
                    setIsPlaying(false);
                }
            };
            animate();
        }
        return () => {
            if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
        };
    }, [isPlaying, isLiveMode]);

    const getAgentStatus = (agentName: string): AgentStatus => {
        const lastEvent = activityToDisplay.find(a => a.agentName === agentName);
        if (!lastEvent) return 'dormant';
        switch (lastEvent.status) {
            case 'ANALYZING': return 'analyzing';
            case 'SUCCESS': return 'highlighted';
            case 'ERROR': return 'error';
            default: return 'idle';
        }
    };

    const isFlowActive = (from: string, to: string): boolean => {
        return activityToDisplay.some(a =>
            a.status === 'DATA_FLOW' && a.agentName === from && a.flowTo === to
        );
    };

    const activeAgents = activityToDisplay.length;
    const totalFlows = agents.reduce((acc, agent) => acc + agent.connections.length, 0);
    const activeFlows = agents.reduce((acc, fromAgent) =>
        acc + fromAgent.connections.filter(toAgentName =>
            isFlowActive(fromAgent.name, toAgentName)
        ).length, 0);

    return (
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700/50">
            {/* Enhanced Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <div className="flex items-center space-x-4">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg"
                    >
                        <Activity className="w-8 h-8 text-white" />
                    </motion.div>
                    <div>
                        <h2 className="text-4xl font-black text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            Live Hive Mind
                        </h2>
                        <p className="text-gray-400 text-lg">
                            Experience {agents.length} AI agents collaborating in real-time intelligence
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    {/* Enhanced Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center space-x-4"
                    >
                        <div className="flex items-center bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-green-400 rounded-full mr-3"
                            />
                            <span className="text-green-300 font-semibold">{activeAgents} Active</span>
                        </div>
                        <div className="flex items-center bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2">
                            <Network className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-blue-300 font-semibold">{activeFlows}/{totalFlows} Flows</span>
                        </div>
                        <div className={`flex items-center rounded-full px-4 py-2 border ${
                            isLiveMode
                                ? 'bg-purple-500/10 border-purple-500/20'
                                : 'bg-orange-500/10 border-orange-500/20'
                        }`}>
                            <motion.div
                                animate={isLiveMode ? { rotate: 360 } : {}}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className={`w-3 h-3 rounded-full mr-3 ${
                                    isLiveMode ? 'bg-purple-400' : 'bg-orange-400'
                                }`}
                            />
                            <span className={`font-semibold ${
                                isLiveMode ? 'text-purple-300' : 'text-orange-300'
                            }`}>
                                {isLiveMode ? 'LIVE' : 'REPLAY'}
                            </span>
                        </div>
                    </motion.div>

                    {/* Enhanced Controls Toggle */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowControls(!showControls)}
                        className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 transition-all duration-300 backdrop-blur-sm"
                    >
                        {showControls ? (
                            <EyeOff className="w-5 h-5 text-gray-400" />
                        ) : (
                            <Eye className="w-5 h-5 text-gray-400" />
                        )}
                    </motion.button>
                </div>
            </motion.div>

            {/* Enhanced Main Visualization */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl overflow-hidden border border-gray-700/30 shadow-inner"
                style={{ height: '700px' }}
            >
                {/* Enhanced Background with Animated Elements */}
                <div className="absolute inset-0">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='25' cy='25' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </div>

                    {/* Animated Background Orbs */}
                    <motion.div
                        animate={{
                            x: [0, 200, 0],
                            y: [0, -100, 0],
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute top-20 left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{
                            x: [0, -150, 0],
                            y: [0, 80, 0],
                        }}
                        transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"
                    />
                </div>

                {/* Enhanced Data Flow Lines with Animation */}
                {agents.map(fromAgent =>
                    fromAgent.connections.map(toAgentName => {
                        const toAgent = agents.find(a => a.name === toAgentName);
                        if (!toAgent) return null;

                        return (
                            <DataFlowLine
                                key={`${fromAgent.name}->${toAgent.name}`}
                                fromPos={fromAgent.position}
                                toPos={toAgent.position}
                                isActive={isFlowActive(fromAgent.name, toAgent.name)}
                            />
                        );
                    })
                )}

                {/* Enhanced Agent Nodes */}
                {agents.map((agent, index) => (
                    <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                    >
                        <AgentNode
                            name={agent.name}
                            icon={agent.icon}
                            position={agent.position}
                            status={getAgentStatus(agent.name)}
                            metrics={agent.metrics}
                            onClick={() => setSelectedAgent(agent)}
                        />
                    </motion.div>
                ))}

                {/* Enhanced Agent Detail Panel */}
                <LiveAgentDetailPanel
                    agent={selectedAgent}
                    allInteractions={aiChat}
                    onClose={() => setSelectedAgent(null)}
                />

                {/* Enhanced Live Indicator */}
                {isLiveMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className="absolute top-6 right-6 flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl px-4 py-2 backdrop-blur-sm"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.7, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-3 h-3 bg-green-400 rounded-full mr-3 shadow-lg shadow-green-400/50"
                        />
                        <span className="text-green-300 text-sm font-bold tracking-wide">LIVE SYSTEM</span>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="ml-2"
                        >
                            <Zap className="w-4 h-4 text-green-400" />
                        </motion.div>
                    </motion.div>
                )}

                {/* System Status Overlay */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-6 left-6 flex items-center space-x-4"
                >
                    <div className="flex items-center bg-gray-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-700/50">
                        <Cpu className="w-4 h-4 text-blue-400 mr-2" />
                        <span className="text-gray-300 text-sm font-medium">Neural Network Active</span>
                    </div>
                    <div className="flex items-center bg-gray-900/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-700/50">
                        <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-gray-300 text-sm font-medium">Performance: Optimal</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Enhanced Controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: 20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="mt-8 overflow-hidden"
                    >
                        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6">
                            <TimelineControl
                                cycleIds={cycleIds}
                                onCycleSelect={handleCycleSelect}
                                onPlayPause={handlePlayPause}
                                onReset={handleReset}
                                isPlaying={isPlaying}
                                contextualLog={contextualLog}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
