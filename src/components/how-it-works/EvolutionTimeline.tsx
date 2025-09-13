"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Brain, TrendingUp, Zap, Target, Crown } from 'lucide-react';

interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    achievements: string[];
    impact: string;
}

const timelineEvents: TimelineEvent[] = [
    {
        id: 'genesis',
        date: '2024 Q1',
        title: 'Genesis - Single Agent System',
        description: 'Started with a basic technical analysis agent that could identify simple patterns and execute trades.',
        icon: Brain,
        color: 'text-blue-400',
        achievements: [
            'Basic pattern recognition',
            'Simple buy/sell signals',
            'Manual strategy configuration'
        ],
        impact: 'Foundation for multi-agent architecture'
    },
    {
        id: 'multi-agent',
        date: '2024 Q2',
        title: 'Multi-Agent Architecture',
        description: 'Introduced specialized agents for different market aspects: Technical, Sentiment, Macro, and Risk analysis.',
        icon: Target,
        color: 'text-green-400',
        achievements: [
            '4 specialized AI agents',
            'Inter-agent communication',
            'Consensus-based decisions',
            'Risk management integration'
        ],
        impact: 'Dramatically improved decision quality and reduced false signals'
    },
    {
        id: 'memory-system',
        date: '2024 Q3',
        title: 'Vector Memory System',
        description: 'Implemented advanced memory system using PostgreSQL with pgvector for learning from past trades.',
        icon: TrendingUp,
        color: 'text-purple-400',
        achievements: [
            'Semantic trade memory',
            'Pattern learning',
            'Context-aware decisions',
            'Performance optimization'
        ],
        impact: 'System now learns from every trade, continuously improving performance'
    },
    {
        id: 'self-improvement',
        date: '2024 Q4',
        title: 'Autonomous Evolution',
        description: 'Added MasterAgent that tests new strategies in shadow mode and automatically promotes superior ones.',
        icon: Crown,
        color: 'text-yellow-400',
        achievements: [
            'Automated strategy testing',
            'Shadow bot system',
            'Performance comparison',
            'Automatic optimization'
        ],
        impact: 'System now evolves without human intervention, constantly improving'
    },
    {
        id: 'real-time',
        date: '2025 Q1',
        title: 'Real-time Intelligence',
        description: 'Enhanced real-time processing capabilities with advanced market data integration and instant signal processing.',
        icon: Zap,
        color: 'text-orange-400',
        achievements: [
            'Sub-second response times',
            'Live market data streams',
            'Advanced risk monitoring',
            'Real-time portfolio optimization'
        ],
        impact: 'Lightning-fast execution with comprehensive market awareness'
    }
];

export function EvolutionTimeline() {
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

    return (
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Evolution Timeline</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Witness the remarkable journey of the Lucid Hive from a simple trading bot
                    to a sophisticated autonomous trading intelligence.
                </p>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-purple-500 via-blue-500 to-green-500 rounded-full opacity-30"></div>

                {/* Timeline Events */}
                <div className="space-y-12">
                    {timelineEvents.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                            {/* Event Content */}
                            <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    onHoverStart={() => setHoveredEvent(event.id)}
                                    onHoverEnd={() => setHoveredEvent(null)}
                                    onClick={() => setSelectedEvent(event)}
                                    className={`bg-gray-800/50 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 ${
                                        selectedEvent?.id === event.id
                                            ? 'border-purple-400 bg-purple-500/10'
                                            : hoveredEvent === event.id
                                            ? 'border-gray-500 bg-gray-700/50'
                                            : 'border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center mb-3">
                                        <event.icon className={`w-6 h-6 ${event.color} mr-3`} />
                                        <div className={`text-sm font-semibold ${event.color}`}>{event.date}</div>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                                    <p className="text-gray-400 text-sm">{event.description}</p>

                                    <div className="mt-4">
                                        <div className="text-xs text-gray-500 mb-2">Key Achievements:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {event.achievements.slice(0, 2).map((achievement, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
                                                >
                                                    {achievement}
                                                </span>
                                            ))}
                                            {event.achievements.length > 2 && (
                                                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                                    +{event.achievements.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Timeline Node */}
                            <div className="relative flex-shrink-0 w-12 h-12 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center z-10">
                                <event.icon className={`w-6 h-6 ${event.color}`} />
                            </div>

                            {/* Empty space for alignment */}
                            <div className="w-1/2"></div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Detailed Event Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <selectedEvent.icon className={`w-8 h-8 ${selectedEvent.color} mr-4`} />
                                    <div>
                                        <div className={`text-sm font-semibold ${selectedEvent.color} mb-1`}>
                                            {selectedEvent.date}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <p className="text-gray-300 mb-6 leading-relaxed">{selectedEvent.description}</p>

                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-white mb-3">Key Achievements</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {selectedEvent.achievements.map((achievement, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center bg-gray-800/50 rounded-lg p-3"
                                        >
                                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 flex-shrink-0"></div>
                                            <span className="text-gray-300 text-sm">{achievement}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
                                <h4 className="text-lg font-semibold text-white mb-2">Impact</h4>
                                <p className="text-gray-300">{selectedEvent.impact}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Current Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-12 text-center"
            >
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
                    <Zap className="w-5 h-5 text-white mr-3" />
                    <span className="text-white font-semibold">Currently Active: Real-time Intelligence Phase</span>
                </div>
                <p className="text-gray-400 mt-4">
                    The Lucid Hive continues to evolve, with new capabilities being developed and tested daily.
                </p>
            </motion.div>
        </div>
    );
}
