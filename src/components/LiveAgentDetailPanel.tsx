// src/components/LiveAgentDetailPanel.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './ui/badge';
import { X, Expand } from 'lucide-react';
import { AiChat } from '../context/DashboardContext';
import { IconName } from './how-it-works/AgentNode';
import { AgentIcon } from './AgentIcon'; // Sukursime šį komponentą kitame žingsnyje
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface AgentData {
    name: string;
    description: string;
    icon: IconName;
    metrics?: any;
}

interface LiveAgentDetailPanelProps {
    agent: AgentData | null;
    allInteractions: AiChat[];
    onClose: () => void;
}

export function LiveAgentDetailPanel({ agent, allInteractions, onClose }: LiveAgentDetailPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (agent) {
            setIsExpanded(false);
        }
    }, [agent]);

    if (!agent) return null;

    // Surandame paskutinę šio agento sąveiką
    const lastInteraction = allInteractions.find(
        (interaction) => interaction.agent === agent.name
    );

    return (
        <AnimatePresence>
            {agent && (
                <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                        "bg-gray-900 border-l-2 border-gray-700 p-6 flex flex-col",
                        isExpanded
                            ? "fixed inset-8 z-30 rounded-lg"
                            : "absolute top-0 right-0 h-full w-1/3 max-w-lg"
                    )}
                >
                    <div className="flex-shrink-0">
                        <div className="absolute top-4 right-4 flex items-center space-x-2">
                             <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white">
                                <Expand size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsExpanded(false);
                                    onClose();
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex items-center mb-4">
                            <AgentIcon name={agent.icon} size={32} className="text-blue-400 mr-4" />
                            <h2 className="text-2xl font-bold">{agent.name}</h2>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">{agent.description}</p>
                    </div>

                    <div className="flex-grow overflow-y-auto bg-gray-800 rounded-md p-3 text-xs font-mono">
                        <h3 className="text-base font-semibold text-white mb-2">Last Recorded Interaction</h3>
                        {lastInteraction ? (
                            <>
                                <p className="text-green-400">{`// PROMPT:`}</p>
                                <pre className="whitespace-pre-wrap text-gray-300">{lastInteraction.prompt}</pre>
                                <p className="text-blue-400 mt-4">{`// RESPONSE:`}</p>
                                <pre className="whitespace-pre-wrap text-gray-300">{JSON.stringify(lastInteraction.response, null, 2)}</pre>
                            </>
                        ) : (
                            <p className="text-gray-500">No interactions recorded in this session yet.</p>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
