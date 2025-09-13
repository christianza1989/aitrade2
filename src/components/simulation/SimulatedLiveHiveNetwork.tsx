'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Brain, Shield, Target, TrendingUp, Zap, BarChart3,
    Activity, CheckCircle, AlertCircle, Clock, Cpu, Network
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { simulationEngine, AIDecision } from '@/lib/simulation/SimulationEngine';

interface AgentNode {
    id: string;
    name: string;
    icon: any;
    x: number;
    y: number;
    status: 'active' | 'processing' | 'idle' | 'thinking';
    confidence: number;
    lastDecision?: AIDecision;
    performance: number;
    color: string;
}

export const SimulatedLiveHiveNetwork: React.FC = () => {
    const [agents, setAgents] = useState<AgentNode[]>([]);
    const [recentDecisions, setRecentDecisions] = useState<AIDecision[]>([]);
    const [connections, setConnections] = useState<string[]>([]);
    const [dataFlows, setDataFlows] = useState<Array<{
        id: string;
        from: string;
        to: string;
        data: string;
        timestamp: number;
    }>>([]);

    // Define agent configurations with positions for the network visualization
    const agentConfigs = [
        { name: 'MacroAnalyst', icon: TrendingUp, color: '#3B82F6', position: { x: 200, y: 100 } },
        { name: 'SentimentAnalyst', icon: Brain, color: '#8B5CF6', position: { x: 400, y: 80 } },
        { name: 'TechnicalAnalyst', icon: Zap, color: '#F59E0B', position: { x: 500, y: 200 } },
        { name: 'RiskManager', icon: Shield, color: '#EF4444', position: { x: 350, y: 300 } },
        { name: 'PositionManager', icon: Target, color: '#10B981', position: { x: 150, y: 280 } },
        { name: 'StrategyOptimizer', icon: CheckCircle, color: '#6366F1', position: { x: 300, y: 200 } }
    ];

    useEffect(() => {
        // Initialize agents
        const initialAgents: AgentNode[] = agentConfigs.map(config => ({
            id: config.name,
            name: config.name,
            icon: config.icon,
            x: config.position.x,
            y: config.position.y,
            status: 'idle',
            confidence: 0.8 + Math.random() * 0.2,
            performance: 85 + Math.random() * 15,
            color: config.color
        }));
        setAgents(initialAgents);

        // Subscribe to AI decisions from simulation
        const unsubscribeDecisions = simulationEngine.subscribe('ai:decision', (decision: AIDecision) => {
            setRecentDecisions(prev => [decision, ...prev.slice(0, 19)]);
            
            // Update agent status
            setAgents(prev => prev.map(agent => 
                agent.name === decision.agent 
                    ? { 
                        ...agent, 
                        status: 'processing' as const,
                        lastDecision: decision,
                        confidence: decision.confidence
                    }
                    : agent
            ));

            // Create data flow between agents
            if (decision.type === 'BUY' || decision.type === 'SELL') {
                // Risk manager receives info from trading agents
                createDataFlow(decision.agent, 'RiskManager', `${decision.type} Signal`);
                // Portfolio manager gets notified
                createDataFlow('RiskManager', 'PositionManager', 'Risk Assessment');
            }

            // Reset agent status after processing
            setTimeout(() => {
                setAgents(prev => prev.map(agent => 
                    agent.name === decision.agent 
                        ? { ...agent, status: 'active' as const }
                        : agent
                ));
            }, 2000 + Math.random() * 3000);
        });

        // Subscribe to decision updates (when they get executed)
        const unsubscribeUpdates = simulationEngine.subscribe('ai:decision_updated', (decision: AIDecision) => {
            setRecentDecisions(prev => prev.map(d => 
                d.id === decision.id ? decision : d
            ));

            if (decision.status === 'executed') {
                // Create connection visual effect
                setConnections(prev => [...prev, `${decision.agent}_executed`]);
                setTimeout(() => {
                    setConnections(prev => prev.filter(c => c !== `${decision.agent}_executed`));
                }, 2000);
            }
        });

        // Subscribe to trades to show portfolio manager activity
        const unsubscribeTrades = simulationEngine.subscribe('trade:executed', (trade) => {
            createDataFlow('PositionManager', 'StrategyOptimizer', 'Trade Executed');
            
            // Show all agents briefly as active when trade happens
            setAgents(prev => prev.map(agent => ({
                ...agent,
                status: 'active' as const
            })));
        });

        // Simulate periodic agent thinking/communication
        const thinkingInterval = setInterval(() => {
            if (Math.random() < 0.4) {
                const randomAgent = agentConfigs[Math.floor(Math.random() * agentConfigs.length)];
                setAgents(prev => prev.map(agent => 
                    agent.name === randomAgent.name 
                        ? { ...agent, status: 'thinking' as const }
                        : agent
                ));

                setTimeout(() => {
                    setAgents(prev => prev.map(agent => 
                        agent.name === randomAgent.name 
                            ? { ...agent, status: 'idle' as const }
                            : agent
                    ));
                }, 1500);
            }
        }, 3000);

        return () => {
            unsubscribeDecisions();
            unsubscribeUpdates();
            unsubscribeTrades();
            clearInterval(thinkingInterval);
        };
    }, []);

    const createDataFlow = (from: string, to: string, data: string) => {
        const flow = {
            id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            from,
            to,
            data,
            timestamp: Date.now()
        };
        
        setDataFlows(prev => [flow, ...prev.slice(0, 9)]);
        
        // Remove flow after animation
        setTimeout(() => {
            setDataFlows(prev => prev.filter(f => f.id !== flow.id));
        }, 3000);
    };

    const getStatusColor = (status: AgentNode['status']) => {
        switch (status) {
            case 'active': return '#10B981';
            case 'processing': return '#F59E0B';
            case 'thinking': return '#8B5CF6';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (status: AgentNode['status']) => {
        switch (status) {
            case 'active': return <Activity className="w-3 h-3" />;
            case 'processing': return <Clock className="w-3 h-3 animate-spin" />;
            case 'thinking': return <Brain className="w-3 h-3" />;
            default: return <Cpu className="w-3 h-3" />;
        }
    };

    const getDecisionTypeColor = (type: AIDecision['type']) => {
        switch (type) {
            case 'BUY': return 'text-green-400 bg-green-400/20';
            case 'SELL': return 'text-red-400 bg-red-400/20';
            case 'HOLD': return 'text-yellow-400 bg-yellow-400/20';
            case 'ANALYZE': return 'text-blue-400 bg-blue-400/20';
            case 'RISK_CHECK': return 'text-orange-400 bg-orange-400/20';
            default: return 'text-gray-400 bg-gray-400/20';
        }
    };

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
                            <Network className="w-6 h-6 text-cyan-400" />
                        </motion.div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Live AI Hive Network</h3>
                            <p className="text-sm text-gray-400">Real-time agent communication & decision flow</p>
                        </div>
                    </div>
                    
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1"
                    >
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-green-300 text-sm font-semibold">LIVE</span>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Network Visualization */}
                    <div className="lg:col-span-2">
                        <div className="relative bg-black/40 border border-gray-600/30 rounded-xl p-4 backdrop-blur-sm h-96">
                            <svg className="w-full h-full" viewBox="0 0 600 350">
                                {/* Connection lines between agents */}
                                {agentConfigs.map((agent, i) => 
                                    agentConfigs.map((otherAgent, j) => {
                                        if (i < j) {
                                            const isActive = connections.includes(`${agent.name}_executed`) || 
                                                           connections.includes(`${otherAgent.name}_executed`);
                                            const agentNode = agents.find(a => a.name === agent.name);
                                            const otherAgentNode = agents.find(a => a.name === otherAgent.name);
                                            
                                            return (
                                                <motion.line
                                                    key={`${agent.name}-${otherAgent.name}`}
                                                    x1={agent.position.x}
                                                    y1={agent.position.y}
                                                    x2={otherAgent.position.x}
                                                    y2={otherAgent.position.y}
                                                    stroke={isActive ? "#22D3EE" : 
                                                        (agentNode?.status === 'active' || otherAgentNode?.status === 'active') ? 
                                                        "#374151" : "#1F2937"}
                                                    strokeWidth={isActive ? 2 : 1}
                                                    opacity={isActive ? 0.8 : 0.3}
                                                    strokeDasharray={isActive ? "5,5" : "none"}
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 2 }}
                                                />
                                            );
                                        }
                                        return null;
                                    })
                                )}

                                {/* Data flow particles */}
                                <AnimatePresence>
                                    {dataFlows.map(flow => {
                                        const fromAgent = agentConfigs.find(a => a.name === flow.from);
                                        const toAgent = agentConfigs.find(a => a.name === flow.to);
                                        
                                        if (!fromAgent || !toAgent) return null;

                                        return (
                                            <motion.circle
                                                key={flow.id}
                                                r={3}
                                                fill="#22D3EE"
                                                initial={{ 
                                                    cx: fromAgent.position.x, 
                                                    cy: fromAgent.position.y,
                                                    opacity: 1
                                                }}
                                                animate={{ 
                                                    cx: toAgent.position.x, 
                                                    cy: toAgent.position.y,
                                                    opacity: 0
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 2, ease: "easeInOut" }}
                                            >
                                                <animate attributeName="r" values="3;6;3" dur="0.5s" repeatCount="indefinite" />
                                            </motion.circle>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Agent nodes */}
                                {agents.map(agent => {
                                    const IconComponent = agent.icon;
                                    const config = agentConfigs.find(c => c.name === agent.name);
                                    
                                    return (
                                        <g key={agent.name}>
                                            {/* Pulsing ring for active agents */}
                                            {agent.status === 'active' && (
                                                <motion.circle
                                                    cx={agent.x}
                                                    cy={agent.y}
                                                    r={30}
                                                    fill="none"
                                                    stroke={getStatusColor(agent.status)}
                                                    strokeWidth={2}
                                                    opacity={0.6}
                                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                                    animate={{ scale: 1.2, opacity: 0 }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                />
                                            )}
                                            
                                            {/* Agent base circle */}
                                            <motion.circle
                                                cx={agent.x}
                                                cy={agent.y}
                                                r={25}
                                                fill={agent.color}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.1, duration: 0.5 }}
                                                style={{ filter: `drop-shadow(0 0 10px ${agent.color}40)` }}
                                            />
                                            
                                            {/* Status indicator ring */}
                                            <circle
                                                cx={agent.x}
                                                cy={agent.y}
                                                r={28}
                                                fill="none"
                                                stroke={getStatusColor(agent.status)}
                                                strokeWidth={3}
                                                opacity={0.7}
                                            />
                                            
                                            {/* Agent icon */}
                                            <foreignObject
                                                x={agent.x - 12}
                                                y={agent.y - 12}
                                                width={24}
                                                height={24}
                                                className="pointer-events-none"
                                            >
                                                <IconComponent className="w-6 h-6 text-white" />
                                            </foreignObject>
                                            
                                            {/* Agent label */}
                                            <text
                                                x={agent.x}
                                                y={agent.y + 45}
                                                textAnchor="middle"
                                                className="fill-gray-300 text-xs font-medium"
                                            >
                                                {agent.name}
                                            </text>

                                            {/* Performance indicator */}
                                            <text
                                                x={agent.x}
                                                y={agent.y + 58}
                                                textAnchor="middle"
                                                className="fill-gray-500 text-xs"
                                            >
                                                {agent.performance.toFixed(0)}%
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* Recent AI Decisions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-white flex items-center">
                                <Brain className="w-5 h-5 text-purple-400 mr-2" />
                                Live AI Decisions
                            </h4>
                            <span className="text-xs text-gray-400">
                                {recentDecisions.length} recent
                            </span>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <AnimatePresence>
                                {recentDecisions.slice(0, 8).map((decision, index) => (
                                    <motion.div
                                        key={decision.id}
                                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="relative bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm hover:border-gray-500/50 transition-all duration-300">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getDecisionTypeColor(decision.type)}`}>
                                                        {decision.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{decision.agent}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className="text-xs text-gray-400">
                                                        {getStatusIcon(decision.status === 'executed' ? 'active' : 'processing')}
                                                    </div>
                                                    <span className="text-xs text-cyan-400">
                                                        {(decision.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {decision.symbol && (
                                                <div className="text-sm font-semibold text-white mb-1">
                                                    {decision.symbol}
                                                    {decision.amount && (
                                                        <span className="ml-2 text-xs text-gray-400">
                                                            ${decision.amount.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <p className="text-xs text-gray-300 leading-relaxed mb-2">
                                                {decision.reasoning}
                                            </p>
                                            
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span className={`font-medium ${
                                                    decision.status === 'executed' ? 'text-green-400' :
                                                    decision.status === 'processing' ? 'text-yellow-400' : 'text-gray-400'
                                                }`}>
                                                    {decision.status.toUpperCase()}
                                                </span>
                                                <span>{new Date(decision.timestamp).toLocaleTimeString()}</span>
                                            </div>

                                            {/* Confidence bar */}
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-700 rounded-full h-1">
                                                    <motion.div
                                                        className="bg-gradient-to-r from-cyan-400 to-blue-400 h-1 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${decision.confidence * 100}%` }}
                                                        transition={{ delay: 0.3, duration: 0.8 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};