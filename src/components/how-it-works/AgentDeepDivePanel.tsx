// src/components/how-it-works/AgentDeepDivePanel.tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Activity, MessageSquare, Spline, Shield, Coins, Briefcase, Blocks, Users, Radar, BrainCircuit, Crown, Zap } from 'lucide-react';
import { Badge } from '../ui/badge';
import React from 'react';

type IconName = 'Activity' | 'MessageSquare' | 'Spline' | 'Shield' | 'Coins' | 'Briefcase' | 'Blocks' | 'Users' | 'Radar' | 'BrainCircuit' | 'Crown' | 'Zap';

interface AgentData {
    name: string;
    description: string;
    icon: IconName;
    metrics?: AgentMetrics;
}

const IconMap: Record<IconName, React.ElementType> = {
    Activity, MessageSquare, Spline, Shield, Coins, Briefcase, Blocks, Users, Radar, BrainCircuit, Crown, Zap
};

interface AgentDeepDivePanelProps {
    agent: AgentData | null;
    onClose: () => void;
    lastInteraction: LastInteraction | null;
}

export function AgentDeepDivePanel({ agent, onClose }: AgentDeepDivePanelProps) {
    const [activeTab, setActiveTab] = useState<'role' | 'metrics'>('role');
    const [lastInteraction, setLastInteraction] = useState<LastInteraction | null>(null);

    useEffect(() => {
        if (agent) {
            setLastInteraction({
                prompt: `// Example Prompt for ${agent.name}\nAnalyze the provided market data and return a decision in JSON format.`,
                response: JSON.stringify({ decision: "HOLD", confidence: 0.85, reason: "Macro trend is positive." }, null, 2)
            });
            setActiveTab('role'); // Reset tab on new agent selection
        }
    }, [agent]);

    if (!agent) return null;

    const IconComponent = IconMap[agent.icon] || HelpCircle;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0 right-0 h-full w-1/3 bg-gray-900 border-l-2 border-gray-700 p-6 z-20 flex flex-col"
            >
                <div className="flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                    <div className="flex items-center mb-4">
                        <IconComponent size={32} className="text-blue-400 mr-4" />
                        <h2 className="text-2xl font-bold">{agent.name}</h2>
                    </div>
                    <div className="flex border-b border-gray-700 mb-4">
                        <TabButton name="role" label="Role" activeTab={activeTab} onClick={setActiveTab} />
                        <TabButton name="metrics" label="Live Metrics" activeTab={activeTab} onClick={setActiveTab} />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {activeTab === 'role' && (
                        <div>
                            <h3 className="font-semibold mb-2">Primary Function</h3>
                            <p className="text-sm text-gray-300">{agent.description}</p>
                            <h3 className="font-semibold mt-6 mb-2">Example Thought Process</h3>
                            <div className="bg-gray-800 p-3 rounded-md text-xs font-mono">
                                <p className="text-green-400">{`// PROMPT:`}</p>
                                <pre className="whitespace-pre-wrap">{lastInteraction?.prompt}</pre>
                                <p className="text-blue-400 mt-4">{`// RESPONSE:`}</p>
                                <pre className="whitespace-pre-wrap">{lastInteraction?.response}</pre>
                            </div>
                        </div>
                    )}
                    {activeTab === 'metrics' && agent.metrics && (
                        <div className="text-sm space-y-3">
                            <MetricRow label="Status" value={<Badge variant={agent.metrics.errorCount > 0 ? "destructive" : "success"}>{agent.metrics.errorCount > 0 ? "Error" : "Online"}</Badge>} />
                            <MetricRow label="API Calls (Success/Error)" value={`${agent.metrics.successCount} / ${agent.metrics.errorCount}`} />
                            <MetricRow label="Avg. Response Time" value={agent.metrics.avgResponseTime} />
                            <MetricRow label="Last Activity" value={new Date(agent.metrics.lastActivity).toLocaleString()} />
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

interface TabButtonProps {
    name: 'role' | 'metrics';
    label: string;
    activeTab: 'role' | 'metrics';
    onClick: (tabName: 'role' | 'metrics') => void;
}

const TabButton = ({ name, label, activeTab, onClick }: TabButtonProps) => (
    <button
        onClick={() => onClick(name)}
        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors
            ${activeTab === name ? 'text-white border-blue-500' : 'text-gray-400 border-transparent hover:text-white'}`}
    >
        {label}
    </button>
);

export interface AgentMetrics {
    successCount: number;
    errorCount: number;
    totalResponseTime: number;
    lastActivity: string;
    avgResponseTime: string;
}

interface LastInteraction {
    prompt: string;
    response: string;
}

const MetricRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center bg-gray-800 p-2 rounded">
        <span className="text-gray-400">{label}:</span>
        <span className="font-semibold">{value}</span>
    </div>
);
