"use client";

import { useDashboard } from '../context/DashboardContext';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Power, ShoppingCart, DollarSign, AlertTriangle, Zap, ArrowRight, Bot, XCircle } from 'lucide-react';
import React from 'react';

// Ši funkcija parenka ikoną ir spalvą pagal log'o pranešimo turinį.
const parseLog = (log: string) => {
    const lowerCaseLog = log.toLowerCase();
    
    // Pašalinam laiko žymą analizei
    const message = log.substring(log.indexOf(']') + 2);

    if (lowerCaseLog.includes('bought')) {
        return { Icon: ShoppingCart, color: 'text-green-400', text: message };
    }
    if (lowerCaseLog.includes('sold')) {
        return { Icon: DollarSign, color: 'text-red-400', text: message };
    }
    if (lowerCaseLog.includes('avoid')) {
        return { Icon: XCircle, color: 'text-yellow-400', text: message };
    }
    if (lowerCaseLog.includes('bot status changed to active')) {
        return { Icon: Power, color: 'text-yellow-400', text: 'Bot Activated' };
    }
    if (lowerCaseLog.includes('bot status changed to inactive')) {
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
    
    // Numatytasis stilius bendriems log'ams
    return { Icon: ArrowRight, color: 'text-gray-400', text: message };
};

export function ActivityFeed() {
    const { state } = useDashboard();
    
    // Apverčiam log'us, kad naujausi būtų viršuje
    const reversedLogs = [...state.logs].reverse();

    return (
        <Card id="activity-feed-card" className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-full">
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
            </CardContent>
        </Card>
    );
}
