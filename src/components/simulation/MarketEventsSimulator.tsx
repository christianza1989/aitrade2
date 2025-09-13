'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, TrendingUp, Volume2, Zap, 
    NewspaperIcon, BarChart3, Activity, Clock,
    AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { simulationEngine, MarketEvent } from '@/lib/simulation/SimulationEngine';

export const MarketEventsSimulator: React.FC = () => {
    const [events, setEvents] = useState<MarketEvent[]>([]);
    const [activeEvents, setActiveEvents] = useState<MarketEvent[]>([]);

    useEffect(() => {
        // Subscribe to market events
        const unsubscribe = simulationEngine.subscribe('market:event', (event: MarketEvent) => {
            setEvents(prev => [event, ...prev.slice(0, 19)]);
            
            // Add to active events
            setActiveEvents(prev => [...prev, event]);
            
            // Remove from active events after duration
            setTimeout(() => {
                setActiveEvents(prev => prev.filter(e => e.id !== event.id));
            }, event.duration * 1000);
        });

        // Get initial events
        const initialEvents = simulationEngine.getRecentEvents();
        setEvents(initialEvents);

        return unsubscribe;
    }, []);

    const getEventIcon = (type: MarketEvent['type']) => {
        switch (type) {
            case 'news': return NewspaperIcon;
            case 'technical': return BarChart3;
            case 'volume_spike': return Volume2;
            case 'trend_change': return TrendingUp;
            case 'volatility': return Zap;
            default: return AlertCircle;
        }
    };

    const getEventColor = (severity: MarketEvent['severity']) => {
        switch (severity) {
            case 'high': return {
                bg: 'from-red-500/20 to-orange-500/20',
                border: 'border-red-500/30',
                text: 'text-red-400',
                icon: 'text-red-400'
            };
            case 'medium': return {
                bg: 'from-yellow-500/20 to-orange-500/20',
                border: 'border-yellow-500/30',
                text: 'text-yellow-400',
                icon: 'text-yellow-400'
            };
            case 'low': return {
                bg: 'from-blue-500/20 to-cyan-500/20',
                border: 'border-blue-500/30',
                text: 'text-blue-400',
                icon: 'text-blue-400'
            };
        }
    };

    const getSeverityIcon = (severity: MarketEvent['severity']) => {
        switch (severity) {
            case 'high': return AlertTriangle;
            case 'medium': return AlertCircle;
            case 'low': return Info;
        }
    };

    return (
        <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                rotate: [0, 15, -15, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                        </motion.div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Market Events</h3>
                            <p className="text-sm text-gray-400">Real-time market developments & news</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-sm text-white font-semibold">
                                {activeEvents.length} Active
                            </div>
                            <div className="text-xs text-gray-400">Market Events</div>
                        </div>
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center space-x-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1"
                        >
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping" />
                            <span className="text-orange-300 text-sm font-semibold">MONITORING</span>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Events */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Activity className="w-5 h-5 text-red-400 mr-2" />
                            Active Events ({activeEvents.length})
                        </h4>
                        
                        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <AnimatePresence>
                                {activeEvents.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-8 text-gray-400"
                                    >
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                        <p>No active market events</p>
                                        <p className="text-sm">Markets operating normally</p>
                                    </motion.div>
                                ) : (
                                    activeEvents.map((event, index) => {
                                        const colors = getEventColor(event.severity);
                                        const EventIcon = getEventIcon(event.type);
                                        const SeverityIcon = getSeverityIcon(event.severity);
                                        const remainingTime = Math.max(0, event.duration * 1000 - (Date.now() - event.timestamp));
                                        const progress = 1 - (remainingTime / (event.duration * 1000));
                                        
                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, scale: 0.9, x: 50 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="relative group"
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} rounded-lg blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-300`} />
                                                <div className={`relative border ${colors.border} rounded-lg p-4 backdrop-blur-sm hover:border-opacity-60 transition-all duration-300`}>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center space-x-3">
                                                            <motion.div
                                                                animate={{ 
                                                                    scale: [1, 1.2, 1],
                                                                    rotate: [0, 10, -10, 0]
                                                                }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                                className={colors.icon}
                                                            >
                                                                <EventIcon className="w-5 h-5" />
                                                            </motion.div>
                                                            <div>
                                                                <h5 className={`font-semibold ${colors.text}`}>
                                                                    {event.title}
                                                                </h5>
                                                                <p className="text-xs text-gray-400 capitalize">
                                                                    {event.type.replace('_', ' ')} • {event.severity} impact
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center space-x-2">
                                                            <SeverityIcon className={`w-4 h-4 ${colors.icon}`} />
                                                            <span className={`text-xs font-semibold ${colors.text}`}>
                                                                {Math.abs(event.priceImpact).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                                        {event.description}
                                                    </p>
                                                    
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-xs text-gray-400">
                                                            Affected: {event.affectedSymbols.join(', ')}
                                                        </div>
                                                        <div className="text-xs text-gray-400 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {Math.ceil(remainingTime / 1000)}s remaining
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Progress bar */}
                                                    <div className="w-full bg-gray-700 rounded-full h-1">
                                                        <motion.div
                                                            className={`h-1 rounded-full bg-gradient-to-r ${colors.bg.replace('/20', '/60')}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress * 100}%` }}
                                                            transition={{ duration: 0.5 }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Event History */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Clock className="w-5 h-5 text-blue-400 mr-2" />
                            Event History ({events.length})
                        </h4>
                        
                        <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <AnimatePresence>
                                {events.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>No events recorded yet</p>
                                        <p className="text-sm">Event history will appear here</p>
                                    </div>
                                ) : (
                                    events.map((event, index) => {
                                        const colors = getEventColor(event.severity);
                                        const EventIcon = getEventIcon(event.type);
                                        const SeverityIcon = getSeverityIcon(event.severity);
                                        const isActive = activeEvents.some(ae => ae.id === event.id);
                                        
                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className={`relative group ${isActive ? 'opacity-100' : 'opacity-70'}`}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                                <div className={`relative bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm hover:border-gray-500/50 transition-all duration-300 ${
                                                    isActive ? 'ring-1 ring-yellow-400/30' : ''
                                                }`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center space-x-2">
                                                            <EventIcon className={`w-4 h-4 ${colors.icon}`} />
                                                            <span className="font-semibold text-white text-sm">
                                                                {event.title}
                                                            </span>
                                                            {isActive && (
                                                                <motion.div
                                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                                    transition={{ duration: 1, repeat: Infinity }}
                                                                    className="px-1 py-0.5 bg-yellow-400/20 border border-yellow-400/30 rounded text-xs text-yellow-400 font-semibold"
                                                                >
                                                                    ACTIVE
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex items-center space-x-1">
                                                            <SeverityIcon className={`w-3 h-3 ${colors.icon}`} />
                                                            <span className={`text-xs font-semibold ${colors.text}`}>
                                                                {event.priceImpact > 0 ? '+' : ''}{event.priceImpact.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-300 mb-2 leading-relaxed">
                                                        {event.description}
                                                    </p>
                                                    
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span className="capitalize">
                                                            {event.type.replace('_', ' ')} • {event.severity}
                                                        </span>
                                                        <span>
                                                            {new Date(event.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    
                                                    {event.affectedSymbols.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-600/30">
                                                            <div className="text-xs text-gray-400">
                                                                Affected: <span className="text-gray-300">{event.affectedSymbols.join(', ')}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};