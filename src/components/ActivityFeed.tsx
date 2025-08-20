// src/components/ActivityFeed.tsx

"use client";

import { useDashboard } from '@/context/DashboardContext';
import { ScrollArea } from './ui/scroll-area';
import { Power, ShoppingCart, DollarSign, AlertTriangle, Zap, ArrowRight, Bot } from 'lucide-react';
import React from 'react';

// This function determines the icon and color based on the log message content.
const parseLog = (log: string) => {
    const lowerCaseLog = log.toLowerCase();
    
    // Remove the timestamp for parsing
    const message = log.substring(log.indexOf(']') + 2);

    if (lowerCaseLog.includes('bought')) {
        return { Icon: ShoppingCart, color: 'text-green-400', text: message };
    }
    if (lowerCaseLog.includes('sold')) {
        return { Icon: DollarSign, color: 'text-red-400', text: message };
    }
    if (lowerCaseLog.includes('status changed to active')) {
        return { Icon: Power, color: 'text-yellow-400', text: 'Bot Activated' };
    }
     if (lowerCaseLog.includes('status set to active')) {
        return { Icon: Power, color: 'text-yellow-400', text: 'Bot Status set to Active' };
    }
    if (lowerCaseLog.includes('status changed to inactive') || lowerCaseLog.includes('stopped')) {
        return { Icon: Power, color: 'text-gray-500', text: 'Bot Deactivated' };
    }
    if (lowerCaseLog.includes('error')) {
        return { Icon: AlertTriangle, color: 'text-red-500', text: message };
    }
    if (lowerCaseLog.includes('decided to')) {
        return { Icon: Bot, color: 'text-blue-400', text: message };
    }
    if (lowerCaseLog.includes('cycle started')) {
        return { Icon: Zap, color: 'text-purple-400', text: 'New analysis cycle started.' };
    }
    
    // Default for general logs
    return { Icon: ArrowRight, color: 'text-gray-400', text: message };
};

export function ActivityFeed() {
    const { state } = useDashboard();
    
    // Reverse the logs so the newest appear at the top
    const reversedLogs = [...state.logs].reverse();

    return (
        <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col">
            <h2 className="font-semibold text-md mb-4">Activity Feed</h2>
            <ScrollArea className="flex-grow">
                <div className="space-y-3 pr-2">
                    {reversedLogs.length === 0 ? (
                        <p className="text-gray-500 text-sm">No activity yet. Start the bot to see live events.</p>
                    ) : (
                        reversedLogs.map((log, index) => {
                            const { Icon, color, text } = parseLog(log);
                            return (
                                <div key={index} className="flex items-start text-xs">
                                    <Icon size={14} className={`mr-3 mt-0.5 flex-shrink-0 ${color}`} />
                                    <p className={`flex-grow ${color}`}>
                                        <span className="text-gray-500 mr-2">{log.substring(1, 9)}</span>
                                        {text}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}