// src/components/how-it-works/AgentNode.tsx
"use client";

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import React from 'react';
import { AgentIcon, IconName } from '../AgentIcon';

export type AgentStatus = 'idle' | 'analyzing' | 'highlighted' | 'error' | 'dormant';
export type { IconName };

interface AgentNodeProps {
    name: string;
    icon: IconName;
    position: { x: number; y: number };
    status: AgentStatus;
    metrics: { avgResponseTime: string } | null;
    onClick: () => void;
}

const statusStyles = {
    idle: { scale: 1, shadow: 'none', color: '#4b5563' },
    analyzing: { scale: 1.15, shadow: '0 0 25px #3b82f6', color: '#3b82f6' },
    highlighted: { scale: 1.1, shadow: '0 0 15px #22c55e', color: '#22c55e' }, // Changed to Green
    error: { scale: 1, shadow: '0 0 20px #ef4444', color: '#ef4444' },
    dormant: { scale: 0.9, shadow: 'none', color: '#374151' },
};

export function AgentNode({ name, icon, position, status, metrics, onClick }: AgentNodeProps) {
    // *** THE FIX IS HERE ***
    // Force MarketFeed to always be in a highlighted state.
    const finalStatus = name === 'MarketFeed' ? 'highlighted' : status;
    const style = statusStyles[finalStatus];

    return (
        <motion.div
            initial={false}
            animate={{ top: `${position.y}%`, left: `${position.x}%`, scale: style.scale }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
            onClick={onClick}
        >
            <motion.div
                animate={{ boxShadow: style.shadow, borderColor: style.color }}
                transition={{ duration: 0.5, repeat: finalStatus === 'analyzing' ? Infinity : 0, repeatType: 'reverse' }}
                className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border-2"
            >
                <AgentIcon name={icon} size={28} className={cn("transition-colors", finalStatus !== 'idle' ? 'text-white' : 'text-gray-400')} />
            </motion.div>
            <span className="mt-2 text-xs font-semibold text-center group-hover:text-blue-400 transition-colors w-28">
                {name}
            </span>
            {metrics && (
                <span className="text-[10px] text-muted-foreground font-mono">
                    {metrics.avgResponseTime}
                </span>
            )}
        </motion.div>
    );
}
