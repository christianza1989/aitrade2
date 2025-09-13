"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, Play, Brain, Zap, Shield, Target, BarChart3, Clock } from 'lucide-react';

interface Scenario {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    steps: ScenarioStep[];
}

interface ScenarioStep {
    title: string;
    description: string;
    agents: string[];
    outcome: 'positive' | 'negative' | 'neutral';
}

const scenarios: Scenario[] = [
    {
        id: 'bull-market',
        title: 'Bull Market Surge',
        description: 'When all signals align for a strong upward move',
        icon: TrendingUp,
        color: 'text-green-400',
        steps: [
            {
                title: 'Intelligence Gathering',
                description: 'All data sources confirm bullish momentum',
                agents: ['MacroAnalyst', 'SentimentAnalyst', 'TechnicalAnalyst'],
                outcome: 'positive'
            },
            {
                title: 'Risk Assessment',
                description: 'RiskManager approves with high confidence',
                agents: ['RiskManager'],
                outcome: 'positive'
            },
            {
                title: 'Capital Allocation',
                description: 'PortfolioAllocator sizes position aggressively',
                agents: ['PortfolioAllocator'],
                outcome: 'positive'
            }
        ]
    },
    {
        id: 'bear-market',
        title: 'Bear Market Caution',
        description: 'When risk signals dominate the decision process',
        icon: TrendingDown,
        color: 'text-red-400',
        steps: [
            {
                title: 'Risk Detection',
                description: 'Macro and sentiment data show extreme caution',
                agents: ['MacroAnalyst', 'SentimentAnalyst'],
                outcome: 'negative'
            },
            {
                title: 'Signal Conflict',
                description: 'Technical signals conflict with macro outlook',
                agents: ['TechnicalAnalyst', 'RiskManager'],
                outcome: 'negative'
            },
            {
                title: 'Conservative Action',
                description: 'System prioritizes capital preservation',
                agents: ['RiskManager'],
                outcome: 'neutral'
            }
        ]
    },
    {
        id: 'agent-debate',
        title: 'Agent Debate Resolution',
        description: 'When agents must resolve conflicting signals',
        icon: AlertTriangle,
        color: 'text-yellow-400',
        steps: [
            {
                title: 'Conflicting Signals',
                description: 'Technical shows BUY, Macro shows extreme risk',
                agents: ['TechnicalAnalyst', 'MacroAnalyst'],
                outcome: 'neutral'
            },
            {
                title: 'Debate Initiation',
                description: 'RiskManager initiates structured consultation',
                agents: ['RiskManager'],
                outcome: 'neutral'
            },
            {
                title: 'Resolution',
                description: 'Consensus reached prioritizing risk management',
                agents: ['RiskManager'],
                outcome: 'positive'
            }
        ]
    }
];

export function InteractiveScenarios() {
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleScenarioSelect = (scenario: Scenario) => {
        setSelectedScenario(scenario);
        setCurrentStep(0);
        setIsPlaying(false);
    };

    const handlePlayScenario = () => {
        if (!selectedScenario) return;

        setIsPlaying(true);
        setCurrentStep(0);

        const playSteps = () => {
            setTimeout(() => {
                setCurrentStep(prev => {
                    if (prev < selectedScenario.steps.length - 1) {
                        setTimeout(playSteps, 2000);
                        return prev + 1;
                    } else {
                        setIsPlaying(false);
                        return prev;
                    }
                });
            }, 2000);
        };

        playSteps();
    };

    const getOutcomeIcon = (outcome: string) => {
        switch (outcome) {
            case 'positive': return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'negative': return <AlertTriangle className="w-5 h-5 text-red-400" />;
            default: return <div className="w-5 h-5 rounded-full bg-yellow-400" />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700/50">
            {/* Enhanced Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6 backdrop-blur-sm"
                >
                    <Brain className="w-5 h-5 text-blue-400 mr-3" />
                    <span className="text-blue-300 text-sm font-semibold tracking-wide">INTERACTIVE LEARNING</span>
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Scenario Simulations
                </h2>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                    Experience real-time decision-making processes through interactive market scenarios.
                    See how our AI agents collaborate, debate, and reach consensus in various market conditions.
                </p>
            </motion.div>

            {/* Enhanced Scenario Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {scenarios.map((scenario, index) => (
                    <motion.button
                        key={scenario.id}
                        onClick={() => handleScenarioSelect(scenario)}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative p-8 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                            selectedScenario?.id === scenario.id
                                ? 'border-purple-400 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-2xl shadow-purple-500/20'
                                : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/70 hover:bg-gray-800/50'
                        }`}
                    >
                        {/* Background Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className={`inline-flex p-4 rounded-2xl mb-6 ${
                                    selectedScenario?.id === scenario.id
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                        : 'bg-gradient-to-br from-gray-700 to-gray-600'
                                } group-hover:shadow-lg transition-all duration-300`}
                            >
                                <scenario.icon className="w-8 h-8 text-white" />
                            </motion.div>

                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300">
                                {scenario.title}
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                {scenario.description}
                            </p>

                            {/* Selection Indicator */}
                            {selectedScenario?.id === scenario.id && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-4 right-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                                >
                                    <CheckCircle className="w-4 h-4 text-white" />
                                </motion.div>
                            )}
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Enhanced Scenario Playback */}
            <AnimatePresence>
                {selectedScenario && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-br from-gray-800/50 to-slate-800/50 rounded-2xl p-8 border border-gray-700/30 backdrop-blur-sm"
                    >
                        {/* Scenario Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className={`p-3 rounded-xl bg-gradient-to-br ${
                                        selectedScenario.id === 'bull-market' ? 'from-green-500 to-emerald-500' :
                                        selectedScenario.id === 'bear-market' ? 'from-red-500 to-pink-500' :
                                        'from-yellow-500 to-orange-500'
                                    }`}
                                >
                                    <selectedScenario.icon className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{selectedScenario.title}</h3>
                                    <p className="text-gray-400">{selectedScenario.description}</p>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePlayScenario}
                                disabled={isPlaying}
                                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                    isPlaying
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg hover:shadow-purple-500/25'
                                }`}
                            >
                                <Play className="w-5 h-5 mr-2" />
                                {isPlaying ? 'Running Simulation...' : 'Start Simulation'}
                            </motion.button>
                        </div>

                        {/* Enhanced Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                                <span className="flex items-center">
                                    <Target className="w-4 h-4 mr-2" />
                                    Step {currentStep + 1} of {selectedScenario.steps.length}
                                </span>
                                <span className="flex items-center">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    {Math.round(((currentStep + 1) / selectedScenario.steps.length) * 100)}% Complete
                                </span>
                            </div>
                            <div className="relative">
                                <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                                    <motion.div
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full shadow-lg"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentStep + 1) / selectedScenario.steps.length) * 100}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                                {/* Progress Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-sm opacity-50" />
                            </div>
                        </div>

                        {/* Enhanced Current Step */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-8 border border-gray-600/30 mb-8"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-3">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.1, 1],
                                                    opacity: [0.7, 1, 0.7]
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={`p-2 rounded-lg mr-4 ${
                                                    selectedScenario.steps[currentStep].outcome === 'positive' ? 'bg-green-500/20' :
                                                    selectedScenario.steps[currentStep].outcome === 'negative' ? 'bg-red-500/20' :
                                                    'bg-yellow-500/20'
                                                }`}
                                            >
                                                {getOutcomeIcon(selectedScenario.steps[currentStep].outcome)}
                                            </motion.div>
                                            <div className="flex items-center text-sm text-gray-400">
                                                <Clock className="w-4 h-4 mr-1" />
                                                Step {currentStep + 1}
                                            </div>
                                        </div>
                                        <h4 className="text-2xl font-bold text-white mb-4">
                                            {selectedScenario.steps[currentStep].title}
                                        </h4>
                                        <p className="text-gray-300 text-lg leading-relaxed">
                                            {selectedScenario.steps[currentStep].description}
                                        </p>
                                    </div>
                                </div>

                                {/* Enhanced Active Agents */}
                                <div className="border-t border-gray-600/30 pt-6">
                                    <div className="flex items-center mb-4">
                                        <Zap className="w-5 h-5 text-purple-400 mr-2" />
                                        <span className="text-purple-300 font-semibold">Active AI Agents</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedScenario.steps[currentStep].agents.map((agent, index) => (
                                            <motion.div
                                                key={agent}
                                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                transition={{ delay: index * 0.15 }}
                                                whileHover={{ scale: 1.05 }}
                                                className="group relative"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                <div className="relative px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 rounded-full text-sm font-semibold backdrop-blur-sm">
                                                    {agent}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Enhanced Step Navigation */}
                        <div className="flex items-center justify-between">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                disabled={currentStep === 0}
                                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                    currentStep === 0
                                        ? 'bg-gray-700/50 cursor-not-allowed text-gray-500'
                                        : 'bg-gray-700/50 hover:bg-gray-600/50 text-white border border-gray-600/50'
                                }`}
                            >
                                <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                                Previous Step
                            </motion.button>

                            {/* Step Indicators */}
                            <div className="flex space-x-3">
                                {selectedScenario.steps.map((_, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => setCurrentStep(index)}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className={`relative transition-all duration-300 ${
                                            index === currentStep
                                                ? 'w-8 h-8'
                                                : 'w-6 h-6'
                                        }`}
                                    >
                                        <div className={`w-full h-full rounded-full transition-all duration-300 ${
                                            index === currentStep
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                                                : index < currentStep
                                                ? 'bg-green-500/70'
                                                : 'bg-gray-600/50 hover:bg-gray-500/70'
                                        }`} />
                                        {index === currentStep && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-50"
                                            />
                                        )}
                                    </motion.button>
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCurrentStep(Math.min(selectedScenario.steps.length - 1, currentStep + 1))}
                                disabled={currentStep === selectedScenario.steps.length - 1}
                                className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                    currentStep === selectedScenario.steps.length - 1
                                        ? 'bg-gray-700/50 cursor-not-allowed text-gray-500'
                                        : 'bg-gray-700/50 hover:bg-gray-600/50 text-white border border-gray-600/50'
                                }`}
                            >
                                Next Step
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
