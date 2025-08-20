// src/app/dashboard/how-it-works/page.tsx

"use client";

import { FeatureCard } from "@/components/how-it-works/FeatureCard";
import { Section } from "@/components/how-it-works/Section";
import { TimelineStep } from "@/components/how-it-works/TimelineStep";
import { Zap, BrainCircuit, Scale, Search, GitBranch, MemoryStick, Bot, ChevronsRight } from "lucide-react";

export default function HowItWorksPage() {
    return (
        <div className="text-white p-4 sm:p-6">
            <div className="bg-gray-800 rounded-lg p-8 md:p-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center">
                    The Architecture of a <span className="text-blue-400">Next-Generation</span> AI Trader
                </h1>
                <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-400 text-center">
                    This is not just another trading bot. It's a decentralized cognitive system, a "Hive Mind" of specialized AI agents working in synergy. Discover the core principles that set it apart.
                </p>
            </div>

            <Section
                title="The Core Pillars"
                subtitle="Our system is built on three foundational concepts."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard 
                        icon={BrainCircuit}
                        title="Multi-Agent System"
                        description="Instead of a single monolithic AI, we use a team of specialized agents (Macro, Sentiment, Technical, Risk, etc.). Each agent is an expert in its field, ensuring deep analysis at every level."
                    />
                    <FeatureCard 
                        icon={GitBranch}
                        title="Agent Debates"
                        description="True intelligence is born from discussion. When data is conflicting (e.g., great technicals but poor market conditions), our agents engage in a 'debate' to reach a more robust, nuanced conclusion."
                        isNextGen={true}
                    />
                    <FeatureCard 
                        icon={MemoryStick}
                        title="Vector Memory"
                        description="Every trade, successful or not, becomes a 'memory'. The system learns from its entire history, recognizing patterns and avoiding repeated mistakes by consulting its past experiences."
                        isNextGen={true}
                    />
                </div>
            </Section>

            <Section
                title="A Single Trade Cycle: Step-by-Step"
                subtitle="Follow the flow of information from market signal to execution."
            >
                <div className="space-y-12">
                   <TimelineStep
                        icon={Search}
                        title="1. Intelligence Gathering & Scouting"
                        description="The cycle begins with a wide data sweep. The DEX Scout hunts for new, high-risk opportunities while other systems gather macroeconomic data, market sentiment, news, and fundamental project information."
                   />
                   <TimelineStep
                        icon={ChevronsRight}
                        title="2. Analysis by Specialists"
                        description="The raw data is distributed to the specialized agents. MacroAnalyst assesses the overall market risk. SentimentAnalyst reads the news and social 'mood'. TechnicalAnalyst crunches the numbers on hundreds of assets."
                   />
                   <TimelineStep
                        icon={Scale}
                        title="3. Synthesis, Debate & Memory Recall"
                        description="The RiskManager receives all analyses. It identifies conflicts, initiates debates between agents to resolve them, and queries its vector memory for lessons from similar past situations."
                   />
                   <TimelineStep
                        icon={Bot}
                        title="4. Decision & Execution"
                        description="Armed with a complete, debated, and experience-informed picture, the RiskManager makes the final BUY/AVOID decision. The PortfolioAllocator then calculates the precise capital allocation, and the trade is executed."
                        isLast={true}
                   />
                </div>
            </Section>

             <Section
                title="The Path to Autonomy: The Self-Improvement Loop"
                subtitle="This is what makes the system truly next-generation."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                         <FeatureCard 
                            icon={Zap}
                            title="Shadow Mode"
                            description="After analyzing its performance, the StrategyOptimizer creates a new, potentially superior set of rules. This new 'Shadow' bot trades with virtual money alongside the main bot."
                            isNextGen={true}
                        />
                         <FeatureCard 
                            icon={Bot}
                            title="Master Agent Oversight"
                            description="A MasterAgent constantly compares the performance of the main bot and the Shadow bot. If the new strategy consistently proves more profitable over a set period, the MasterAgent automatically 'promotes' the shadow strategy to become the new main strategy. The system evolves without human intervention."
                            isNextGen={true}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-7xl">🧠</p>
                        <p className="mt-4 text-2xl font-bold text-purple-400">The Bot Teaches Itself.</p>
                        <p className="text-gray-400">This cycle of analysis, testing, and autonomous promotion is the final step towards a truly intelligent and adaptive trading system.</p>
                    </div>
                </div>
            </Section>
        </div>
    );
}