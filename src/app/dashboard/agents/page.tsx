// src/app/dashboard/agents/page.tsx
"use client";

import { useState, useEffect } from 'react';
import {
    Server, CheckCircle, XCircle, Activity, MessageSquare, Spline, Shield, Coins,
    Briefcase, Blocks, Users, Radar, BrainCircuit, Crown, Zap, HelpCircle, Cpu, Network, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { motion } from 'framer-motion';

// Tipas, apibrėžiantis galimus ikonų pavadinimus
type IconName = 'Activity' | 'MessageSquare' | 'Spline' | 'Shield' | 'Coins' | 'Briefcase' | 'Blocks' | 'Users' | 'Radar' | 'BrainCircuit' | 'Crown' | 'Zap';

interface AgentStatus {
    name: string;
    description: string;
    icon: IconName;
    status: 'Online' | 'Error';
    metrics: {
        successCount: number;
        errorCount: number;
        avgResponseTime: string;
        lastActivity: string;
    };
}

const IconMap: Record<IconName, React.ElementType> = {
    Activity, MessageSquare, Spline, Shield, Coins, Briefcase, Blocks, Users, Radar, BrainCircuit, Crown, Zap
};

const AgentIcon = ({ name }: { name: IconName }) => {
    const IconComponent = IconMap[name] || HelpCircle;
    return <IconComponent className="mr-3 text-gray-400" size={24} />;
};

export default function AgentsDashboardPage() {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/agents/status');
                if (response.ok) {
                    const data = await response.json();
                    setAgents(data);
                }
            } catch (error) {
                console.error("Failed to fetch agent statuses", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const intervalId = setInterval(fetchData, 5000);

        return () => clearInterval(intervalId);
    }, []);

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
                    <Cpu className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-blue-300 text-sm font-semibold tracking-wide">AI AGENTS</span>
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Agent Control Center
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
                    Monitor and manage your AI trading agents in real-time. Each specialized agent
                    operates autonomously while collaborating within the Lucid Hive ecosystem.
                </p>
            </motion.div>

            {/* System Overview Cards */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12"
            >
                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <Server className="w-8 h-8 text-blue-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">{agents.length}</div>
                        <div className="text-sm text-gray-400 font-medium">Total Agents</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">
                            {agents.filter(agent => agent.status === 'Online').length}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">Online Agents</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <Network className="w-8 h-8 text-purple-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">
                            {agents.reduce((acc, agent) => acc + agent.metrics.successCount, 0)}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">Total API Calls</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <Zap className="w-8 h-8 text-yellow-400" />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
                            />
                        </div>
                        <div className="text-3xl font-black text-white mb-2">
                            {agents.length > 0 ? (agents.reduce((acc, agent) => acc + parseFloat(agent.metrics.avgResponseTime.replace('ms', '')), 0) / agents.length).toFixed(0) : 0}ms
                        </div>
                        <div className="text-sm text-gray-400 font-medium">Avg Response</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Enhanced Agents Grid */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-8"
            >
                <div className="flex items-center mb-6">
                    <Activity className="w-6 h-6 text-green-400 mr-3" />
                    <h2 className="text-2xl font-bold text-white">Agent Status Overview</h2>
                </div>

                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center py-20"
                    >
                        <div className="text-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
                            />
                            <p className="text-gray-400 text-lg">Loading agent data...</p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {agents.map((agent, index) => (
                            <motion.div
                                key={agent.name}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 + index * 0.1 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="group relative"
                            >
                                {/* Background Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className={`relative bg-gradient-to-br rounded-2xl p-8 border-2 backdrop-blur-sm transition-all duration-300 ${
                                    agent.status === 'Online'
                                        ? 'from-gray-800/50 to-slate-800/50 border-green-500/30 shadow-lg shadow-green-500/10'
                                        : 'from-gray-800/50 to-slate-800/50 border-red-500/30 shadow-lg shadow-red-500/10'
                                }`}>
                                    {/* Status Indicator */}
                                    <div className={`absolute top-4 right-4 w-4 h-4 rounded-full shadow-lg ${
                                        agent.status === 'Online'
                                            ? 'bg-green-400 shadow-green-400/50'
                                            : 'bg-red-400 shadow-red-400/50'
                                    }`}>
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-full h-full rounded-full bg-current"
                                        />
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center mb-6">
                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className={`p-3 rounded-xl mr-4 ${
                                                agent.status === 'Online'
                                                    ? 'bg-green-500/20'
                                                    : 'bg-red-500/20'
                                            }`}
                                        >
                                            <AgentIcon name={agent.icon} />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                                agent.status === 'Online'
                                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            }`}>
                                                {agent.status === 'Online' ? (
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                )}
                                                {agent.status}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">{agent.description}</p>

                                    {/* Metrics */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                                            <div className="flex items-center">
                                                <BarChart3 className="w-4 h-4 text-blue-400 mr-2" />
                                                <span className="text-gray-400 text-sm">API Calls</span>
                                            </div>
                                            <div className="text-white font-semibold">
                                                {agent.metrics.successCount} / {agent.metrics.errorCount}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                                            <div className="flex items-center">
                                                <Zap className="w-4 h-4 text-yellow-400 mr-2" />
                                                <span className="text-gray-400 text-sm">Response Time</span>
                                            </div>
                                            <div className="text-white font-semibold">{agent.metrics.avgResponseTime}</div>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                                            <div className="flex items-center">
                                                <Activity className="w-4 h-4 text-purple-400 mr-2" />
                                                <span className="text-gray-400 text-sm">Last Activity</span>
                                            </div>
                                            <div className="text-white font-semibold text-sm">
                                                {new Date(agent.metrics.lastActivity).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Indicator */}
                                    <div className="mt-6 pt-4 border-t border-gray-600/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 text-sm">Performance</span>
                                            <div className="flex items-center">
                                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                                    agent.status === 'Online' ? 'bg-green-400' : 'bg-red-400'
                                                }`} />
                                                <span className={`text-sm font-semibold ${
                                                    agent.status === 'Online' ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                    {agent.status === 'Online' ? 'Optimal' : 'Degraded'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
