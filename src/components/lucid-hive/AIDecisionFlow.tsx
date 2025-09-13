'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, TrendingUp, Shield, Target, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Decision {
    id: string;
    agent: string;
    type: 'BUY' | 'SELL' | 'HOLD' | 'ANALYZE' | 'RISK_CHECK' | 'OPTIMIZE';
    confidence: number;
    reasoning: string;
    timestamp: Date;
    status: 'processing' | 'completed' | 'pending' | 'executed';
    impact: 'high' | 'medium' | 'low';
    symbol?: string;
    amount?: number;
}

interface FlowNode {
    id: string;
    agent: string;
    x: number;
    y: number;
    status: 'active' | 'processing' | 'completed';
    decisions: Decision[];
}

const agentConfigs = [
    { name: 'MacroAnalyst', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', position: { x: 100, y: 100 } },
    { name: 'SentimentAnalyst', icon: Brain, color: 'from-purple-500 to-pink-500', position: { x: 300, y: 60 } },
    { name: 'TechnicalAnalyst', icon: Zap, color: 'from-yellow-500 to-orange-500', position: { x: 500, y: 100 } },
    { name: 'RiskManager', icon: Shield, color: 'from-red-500 to-rose-500', position: { x: 200, y: 250 } },
    { name: 'PositionManager', icon: Target, color: 'from-green-500 to-emerald-500', position: { x: 400, y: 250 } },
    { name: 'StrategyOptimizer', icon: CheckCircle, color: 'from-indigo-500 to-blue-500', position: { x: 300, y: 180 } }
];

export const AIDecisionFlow: React.FC = () => {
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
    const [activeConnections, setActiveConnections] = useState<string[]>([]);

    // Generate realistic AI decisions
    const generateDecision = (): Decision => {
        const agents = ['MacroAnalyst', 'SentimentAnalyst', 'TechnicalAnalyst', 'RiskManager', 'PositionManager', 'StrategyOptimizer'];
        const types: Decision['type'][] = ['BUY', 'SELL', 'HOLD', 'ANALYZE', 'RISK_CHECK', 'OPTIMIZE'];
        const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'];
        const reasonings = [
            'Strong bullish momentum detected across multiple timeframes',
            'Risk metrics suggest position size reduction',
            'Sentiment analysis indicates market euphoria - caution advised',
            'Technical indicators converging for potential breakout',
            'Macro environment supports continued uptrend',
            'Portfolio rebalancing recommended based on correlation analysis',
            'Stop-loss adjustment needed due to volatility increase',
            'Opportunity identified in oversold conditions'
        ];

        return {
            id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agent: agents[Math.floor(Math.random() * agents.length)],
            type: types[Math.floor(Math.random() * types.length)],
            confidence: Math.random() * 0.4 + 0.6, // 60-100%
            reasoning: reasonings[Math.floor(Math.random() * reasonings.length)],
            timestamp: new Date(),
            status: ['processing', 'completed', 'pending'][Math.floor(Math.random() * 3)] as Decision['status'],
            impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as Decision['impact'],
            symbol: Math.random() > 0.3 ? symbols[Math.floor(Math.random() * symbols.length)] : undefined,
            amount: Math.random() > 0.5 ? Math.random() * 10000 + 1000 : undefined
        };
    };

    // Initialize flow nodes
    useEffect(() => {
        const nodes: FlowNode[] = agentConfigs.map(config => ({
            id: config.name,
            agent: config.name,
            x: config.position.x,
            y: config.position.y,
            status: ['active', 'processing', 'completed'][Math.floor(Math.random() * 3)] as FlowNode['status'],
            decisions: []
        }));
        setFlowNodes(nodes);
    }, []);

    // Generate new decisions periodically
    useEffect(() => {
        const generateNewDecision = () => {
            const newDecision = generateDecision();
            setDecisions(prev => [newDecision, ...prev].slice(0, 20)); // Keep last 20 decisions

            // Update flow node with new decision
            setFlowNodes(prev => prev.map(node => 
                node.agent === newDecision.agent 
                    ? { ...node, decisions: [newDecision, ...node.decisions].slice(0, 3) }
                    : node
            ));

            // Simulate connection activity
            setActiveConnections(prev => {
                const newConnections = [`${newDecision.agent}_flow`];
                return [...new Set([...prev, ...newConnections])];
            });

            // Clear active connections after animation
            setTimeout(() => {
                setActiveConnections(prev => 
                    prev.filter(conn => !conn.startsWith(newDecision.agent))
                );
            }, 2000);
        };

        generateNewDecision();
        const interval = setInterval(generateNewDecision, 4000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: Decision['status']) => {
        switch (status) {
            case 'processing': return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'executed': return <Zap className="w-4 h-4 text-blue-400" />;
            default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTypeColor = (type: Decision['type']) => {
        switch (type) {
            case 'BUY': return 'text-green-400 bg-green-400/20';
            case 'SELL': return 'text-red-400 bg-red-400/20';
            case 'HOLD': return 'text-yellow-400 bg-yellow-400/20';
            case 'ANALYZE': return 'text-blue-400 bg-blue-400/20';
            case 'RISK_CHECK': return 'text-orange-400 bg-orange-400/20';
            case 'OPTIMIZE': return 'text-purple-400 bg-purple-400/20';
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
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Brain className="w-6 h-6 text-purple-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white">AI Decision Flow</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-400">
                            Active Agents: <span className="text-white font-semibold">{flowNodes.filter(n => n.status === 'active').length}</span>
                        </div>
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center space-x-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-3 py-1"
                        >
                            <div className="w-2 h-2 bg-purple-400 rounded-full" />
                            <span className="text-purple-300 text-sm font-semibold">THINKING</span>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Flow Visualization */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-xl blur-2xl" />
                        <div className="relative bg-black/40 border border-gray-600/30 rounded-xl p-4 backdrop-blur-sm h-80">
                            <svg className="w-full h-full" viewBox="0 0 600 320">
                                {/* Connection lines */}
                                {agentConfigs.map((agent, i) => 
                                    agentConfigs.map((otherAgent, j) => {
                                        if (i < j) {
                                            const isActive = activeConnections.includes(`${agent.name}_flow`) || 
                                                           activeConnections.includes(`${otherAgent.name}_flow`);
                                            return (
                                                <motion.line
                                                    key={`${agent.name}-${otherAgent.name}`}
                                                    x1={agent.position.x}
                                                    y1={agent.position.y}
                                                    x2={otherAgent.position.x}
                                                    y2={otherAgent.position.y}
                                                    stroke={isActive ? "#22D3EE" : "#374151"}
                                                    strokeWidth={isActive ? 2 : 1}
                                                    opacity={isActive ? 0.8 : 0.3}
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 2, ease: "easeInOut" }}
                                                />
                                            );
                                        }
                                        return null;
                                    })
                                )}

                                {/* Agent nodes */}
                                {agentConfigs.map((agent) => {
                                    const node = flowNodes.find(n => n.agent === agent.name);
                                    const IconComponent = agent.icon;
                                    
                                    return (
                                        <g key={agent.name}>
                                            {/* Pulsing ring for active agents */}
                                            {node?.status === 'active' && (
                                                <motion.circle
                                                    cx={agent.position.x}
                                                    cy={agent.position.y}
                                                    r={25}
                                                    fill="none"
                                                    stroke="#22D3EE"
                                                    strokeWidth={2}
                                                    opacity={0.6}
                                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                                    animate={{ scale: 1.2, opacity: 0 }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                />
                                            )}
                                            
                                            {/* Agent node */}
                                            <motion.circle
                                                cx={agent.position.x}
                                                cy={agent.position.y}
                                                r={20}
                                                fill="url(#gradient)"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2, duration: 0.5 }}
                                                className="cursor-pointer"
                                            />
                                            
                                            {/* Agent icon */}
                                            <foreignObject
                                                x={agent.position.x - 10}
                                                y={agent.position.y - 10}
                                                width={20}
                                                height={20}
                                                className="pointer-events-none"
                                            >
                                                <IconComponent className="w-5 h-5 text-white" />
                                            </foreignObject>
                                            
                                            {/* Agent label */}
                                            <text
                                                x={agent.position.x}
                                                y={agent.position.y + 35}
                                                textAnchor="middle"
                                                className="fill-gray-300 text-xs font-medium"
                                            >
                                                {agent.name}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Gradient definitions */}
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3B82F6" />
                                        <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    {/* Recent Decisions */}
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Zap className="w-5 h-5 text-cyan-400 mr-2" />
                            Recent AI Decisions
                        </h4>
                        <div className="max-h-72 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <AnimatePresence>
                                {decisions.slice(0, 8).map((decision, index) => (
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
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(decision.type)}`}>
                                                        {decision.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{decision.agent}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(decision.status)}
                                                    <span className="text-xs text-gray-400">
                                                        {decision.confidence.toFixed(0)}%
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
                                            
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                {decision.reasoning}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-600/30">
                                                <span className={`text-xs font-medium ${
                                                    decision.impact === 'high' ? 'text-red-400' :
                                                    decision.impact === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                                }`}>
                                                    {decision.impact.toUpperCase()} IMPACT
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {decision.timestamp.toLocaleTimeString()}
                                                </span>
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