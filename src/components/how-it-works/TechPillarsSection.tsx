"use client";

import { motion } from 'framer-motion';
import { BrainCircuit, GitBranch, MemoryStick, Bot } from 'lucide-react';
import React from 'react';

const pillars = [
    {
        icon: BrainCircuit,
        title: "Multi-Agent System",
        short: "A 'Hive Mind' of specialized AIs, each an expert in its field, ensuring deep analysis at every level.",
        long: "Instead of a monolithic AI, our system utilizes a decentralized team of agents (Macro, Sentiment, Technical, Risk, etc.). This modular architecture allows for greater specialization and robustness. Each agent processes data independently and communicates its findings, creating a holistic market view far superior to any single model."
    },
    {
        icon: GitBranch,
        title: "Agent Debates",
        short: "When data is conflicting, our agents engage in a 'debate' to reach a more robust, nuanced conclusion.",
        long: "True intelligence emerges from resolving contradictions. When the TechnicalAnalyst sees a perfect BUY signal, but the MacroAnalyst screams 'Risk-Off', the RiskManager initiates a consultation. This structured 'debate' forces the system to weigh conflicting evidence and avoid simplistic, high-risk decisions."
    },
    {
        icon: MemoryStick,
        title: "Vector Memory",
        short: "Every trade, successful or not, becomes a 'memory', allowing the AI to learn from its entire history.",
        long: "We use a PostgreSQL database with the pgvector extension, managed via Prisma. Each trade's narrative (market conditions, decision reasoning, outcome) is converted into a high-dimensional vector. When faced with a new situation, the RiskManager queries this database to find the most similar past experiences, learning to avoid repeating mistakes."
    },
    {
        icon: Bot,
        title: "Autonomous Evolution",
        short: "A MasterAgent tests new strategies in a 'Shadow Mode' and automatically promotes superior ones.",
        long: "The StrategyOptimizer analyzes performance and generates a new, potentially better configuration. This 'Shadow Bot' trades with virtual money alongside the main bot. The MasterAgent compares their profitability. If the shadow strategy consistently outperforms, it's automatically deployed as the new main strategy. The system evolves without human intervention."
    }
];

export function TechPillarsSection() {
    return (
        <div className="bg-gray-900/50 p-8 mt-8">
            <div className="text-center mb-12">
<h2 className="text-3xl font-bold">The Core Principles of the Lucid Hive</h2>
                <p className="mt-2 text-gray-400">
                    Discover the foundational technologies that power our autonomous trading system.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {pillars.map((pillar) => (
                    <div
                        key={pillar.title}
                        className="bg-gray-800 p-6 rounded-lg border-l-4 border-purple-500 flex flex-col"
                    >
                        <div className="flex items-center mb-4">
                            {React.createElement(pillar.icon, { className: "text-purple-400 mr-4 flex-shrink-0", size: 28 })}
                            <h3 className="text-xl font-bold">{pillar.title}</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            {pillar.short}
                        </p>
                        <div className="border-t border-gray-700 pt-4 mt-auto">
                            <p className="text-sm text-gray-300">{pillar.long}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
