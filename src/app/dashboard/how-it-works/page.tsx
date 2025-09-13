// src/app/dashboard/how-it-works/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { AgentNode, AgentStatus, IconName } from '@/components/how-it-works/AgentNode';
import { DataFlowLine } from '@/components/how-it-works/DataFlowLine';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentDeepDivePanel, AgentMetrics } from '@/components/how-it-works/AgentDeepDivePanel';
import { SelfImprovementModule } from '@/components/how-it-works/SelfImprovementModule';
import { TechPillarsSection } from '@/components/how-it-works/TechPillarsSection';
import { useDashboard } from '@/context/DashboardContext';
import { AiChat } from '@/context/DashboardContext';
import { LiveAgentDetailPanel } from '@/components/LiveAgentDetailPanel';
import { TimelineControl } from '@/components/TimelineControl';
import { HeroSection } from '@/components/how-it-works/HeroSection';
import { LiveDashboard } from '@/components/how-it-works/LiveDashboard';
import { InteractiveScenarios } from '@/components/how-it-works/InteractiveScenarios';
import { PerformanceMetrics } from '@/components/how-it-works/PerformanceMetrics';
import { EvolutionTimeline } from '@/components/how-it-works/EvolutionTimeline';

interface AgentData {
    name: string;
    description: string;
    icon: IconName;
    position: { x: number; y: number };
    connections: string[];
    metrics: { avgResponseTime: string } | null;
}

interface ScenarioStep {
    title: string;
    description: string;
    activeAgents: string[];
    activeFlows: string[];
}

// --- ORIGINALUS SCENARIJŲ OBJEKTAS ---
const scenarios: Record<string, ScenarioStep[]> = {
    "Bull Market": [
        {
            title: "Step 1: Intelligence Gathering",
            description: "In a bullish market, the system aggressively scans all sources for opportunities. All data gathering agents are active.",
            activeAgents: ['MacroAnalyst', 'SentimentAnalyst', 'OnChainAnalyst', 'SocialMediaAnalyst', 'TechnicalAnalyst', 'DEX_ScoutAgent'],
            activeFlows: [],
        },
        {
            title: "Step 2: Analysis & Synthesis",
            description: "All collected data flows to the RiskManager. It receives a positive 'Risk-On' signal and strong technicals.",
            activeAgents: ['RiskManager'],
            activeFlows: ['MacroAnalyst->RiskManager', 'SentimentAnalyst->RiskManager', 'OnChainAnalyst->RiskManager', 'SocialMediaAnalyst->RiskManager', 'TechnicalAnalyst->RiskManager', 'DEX_ScoutAgent->RiskManager'],
        },
        {
            title: "Step 3: Capital Allocation",
            description: "With a high confidence signal, the RiskManager forwards multiple BUY candidates to the PortfolioAllocator.",
            activeAgents: ['PortfolioAllocator'],
            activeFlows: ['RiskManager->PortfolioAllocator'],
        },
        {
            title: "Step 4: Execution & Management",
            description: "The PortfolioAllocator calculates aggressive position sizes. Trades are executed, and the PositionManager begins monitoring them.",
            activeAgents: ['PositionManager'],
            activeFlows: [],
        }
    ],
    "Agent Debate": [
        {
            title: "Step 1: Conflicting Signals",
            description: "The TechnicalAnalyst reports a perfect 'BUY' setup, but the MacroAnalyst reports a dangerous 'Risk-Off' environment.",
            activeAgents: ['TechnicalAnalyst', 'MacroAnalyst'],
            activeFlows: [],
        },
        {
            title: "Step 2: Risk Manager identifies Conflict",
            description: "Data flows to the RiskManager, which detects a major conflict between technical and macro signals.",
            activeAgents: ['RiskManager'],
            activeFlows: ['TechnicalAnalyst->RiskManager', 'MacroAnalyst->RiskManager'],
        },
        {
            title: "Step 3: Consultation (The Debate)",
            description: "The RiskManager initiates a 'debate', sending a consultation query back to the MacroAnalyst for clarification.",
            activeAgents: ['MacroAnalyst'],
            activeFlows: ['RiskManager->MacroAnalyst'],
        },
        {
            title: "Step 4: Prudent Decision",
            description: "Based on the MacroAnalyst's cautious response, the RiskManager decides to 'AVOID' the trade, prioritizing capital preservation despite the strong technical signal.",
            activeAgents: ['RiskManager'],
            activeFlows: [],
        }
    ]
};

export default function HowItWorksPage() {
    const [agents, setAgents] = useState<AgentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activity, setActivity] = useState<any[]>([]);
    const { state } = useDashboard();
    const { aiChat } = state;

    useEffect(() => {
        const fetchAgentData = async () => {
            try {
                const response = await fetch('/api/agents/status');
                if (response.ok) {
                    setAgents(await response.json());
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchAgentData();
    }, []);

    useEffect(() => {
        const fetchActivity = async () => {
            const res = await fetch('/api/agent-activity/latest');
            if (res.ok) setActivity(await res.json());
        };
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading Lucid Hive...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Hero Section */}
            <HeroSection />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                {/* Live Dashboard */}
                <LiveDashboard
                    agents={agents}
                    activity={activity}
                    aiChat={aiChat}
                />

                {/* Interactive Scenarios */}
                <InteractiveScenarios />

                {/* Performance Metrics */}
                <PerformanceMetrics />

                {/* Evolution Timeline */}
                <EvolutionTimeline />

                {/* Tech Pillars (keeping the original but enhanced) */}
                <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-8 shadow-2xl">
                    <TechPillarsSection />
                </div>

                {/* Self Improvement Module (keeping the original but enhanced) */}
                <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-8 shadow-2xl">
                    <SelfImprovementModule />
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-800 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <p className="text-gray-400 text-sm">
                            © 2025 Lucid Hive. Autonomous trading intelligence that evolves with the market.
                        </p>
                        <div className="mt-4 flex justify-center space-x-6">
                            <div className="flex items-center text-xs text-gray-500">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                                System Online
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                {agents.length} Agents Active
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                                Continuous Learning
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
