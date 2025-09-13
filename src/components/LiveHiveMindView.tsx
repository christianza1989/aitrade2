// src/components/LiveHiveMindView.tsx
"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { AgentNode, AgentStatus, IconName } from './how-it-works/AgentNode';
import { DataFlowLine } from './how-it-works/DataFlowLine';
import { LiveAgentDetailPanel } from './LiveAgentDetailPanel';

interface AgentData {
    name: string;
    description: string;
    icon: IconName;
    position: { x: number; y: number };
    connections: string[];
}

export function LiveHiveMindView() {
    const [agents, setAgents] = useState<AgentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
    const { state } = useDashboard();
    const { agentActivity, aiChat } = state;

    useEffect(() => {
        const fetchAgentData = async () => {
            try {
                const response = await fetch('/api/agents/status');
                if (response.ok) {
                    const data = await response.json();
                    setAgents(data);
                }
            } catch (error) {
                console.error("Failed to fetch agent data for Hive Mind:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAgentData();
    }, []);

    const getAgentStatus = (agentName: string): AgentStatus => {
        const activity = agentActivity[agentName];
        if (!activity) return 'idle';

        const now = Date.now();
        // Show pulse effect for 5 seconds
        if ((activity.status === 'success' || activity.status === 'error') && (now - activity.timestamp < 5000)) {
            return activity.status === 'success' ? 'highlighted' : 'error';
        }
        if (activity.status === 'analyzing') {
            return 'analyzing';
        }
        return 'idle';
    };
    
    const isFlowActive = (fromAgentName: string, toAgentName: string): boolean => {
        const fromActivity = agentActivity[fromAgentName];
        if (fromActivity && (fromActivity.status === 'success' || fromActivity.status === 'analyzing')) {
            // Pulsavimo efektas turi trukti 3 sekundes po sėkmingo įvykdymo
            const timeSinceActivity = Date.now() - fromActivity.timestamp;
            return timeSinceActivity < 3000;
        }
        return false;
    };

if (isLoading) {
        return <div className="text-white bg-gray-800 rounded-lg text-center p-10 h-[60vh] flex items-center justify-center">Loading Lucid Hive Visualization...</div>;
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 relative h-[60vh] overflow-hidden">
<h2 className="text-lg font-semibold mb-4 text-white absolute top-4 left-4 z-10">Live Lucid Hive</h2>
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

            {agents.map(agent => (
                <AgentNode
                    key={agent.name}
                    name={agent.name}
                    icon={agent.icon}
                    position={agent.position}
                    status={getAgentStatus(agent.name)}
                    metrics={null} // Add required metrics prop
                    onClick={() => setSelectedAgent(agent)}
                />
            ))}
            
            <LiveAgentDetailPanel
                agent={selectedAgent}
                allInteractions={aiChat} // Perduodame visą pokalbių istoriją
                onClose={() => setSelectedAgent(null)}
            />
        </div>
    );
}
