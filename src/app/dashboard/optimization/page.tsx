// src/app/dashboard/optimization/page.tsx

"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { DecisionDeepDiveModal, DecisionData } from '@/components/DecisionDeepDiveModal'; // 1. IMPORTUOJAME NAUJĄ KOMPONENTĄ
import { Eye } from 'lucide-react';

// Define interfaces for our state and props
interface Settings {
    [key: string]: string | number;
}
interface Analysis {
    analysis_summary: string;
    suggested_settings: Settings;
}
const SETTING_DESCRIPTIONS: { [key: string]: string } = { /* ... existing descriptions ... */ };

// 2. PAVYZDINIAI DUOMENYS GILUMINEI ANALIZEI
const mockDecisions: DecisionData[] = [
    {
        symbol: 'SOLUSDT', decision: 'BUY', outcome: 'Profit', pnl: 1470.00, timestamp: '2025-08-18T10:30:00Z',
        context: {
            macro: { regime: 'Risk-On', score: 8.2 },
            sentiment: { mood: 'Bullish', score: 0.75 },
            technicals: { score: 8.8, summary: 'Strong uptrend with bullish momentum.' }
        },
        consultation: {
            question: "I see a great technical signal for SOL, but your macro analysis shows 'Risk-Off'. Is this a market bottoming signal or a classic bear trap?",
            answer: "This is a temporary correction; the fundamentals remain strong. The high technical score justifies a calculated risk."
        },
        pastLessons: ["Previous profitable SOL trade in 'Risk-On' led to a +20% gain."]
    },
    {
        symbol: 'ADAUSDT', decision: 'BUY', outcome: 'Loss', pnl: -200.00, timestamp: '2025-08-17T14:00:00Z',
        context: {
            macro: { regime: 'Risk-Off', score: 3.1 },
            sentiment: { mood: 'Bearish', score: -0.5 },
            technicals: { score: 7.5, summary: 'Decent setup but fighting the overall market trend.' }
        },
        pastLessons: ["Buying ADA during 'Risk-Off' previously resulted in a small loss."]
    }
];

export default function OptimizationPage() {
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<Settings | null>({ takeProfitPercent: 5, stopLossPercent: -2 }); // Mock
    
    // 3. BŪSENOS VALDYMAS MODALINIAM LANGUI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDecision, setSelectedDecision] = useState<DecisionData | null>(null);

    const handleOpenModal = (decision: DecisionData) => {
        setSelectedDecision(decision);
        setIsModalOpen(true);
    };

    const runOptimization = async () => { /* ... existing function ... */ };
    const applyAiSettings = async () => { /* ... existing function ... */ };
    const renderSettingsTable = (title: string, settings: Settings | null) => { /* ... existing function ... */ };

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Autonomous AI Optimization</h1>
            {/* Top section for running analysis remains the same */}
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <p className="mb-4">
                    Click the button below to have the AI analyze all past trades. It will identify patterns and propose a new, optimized set of parameters to improve its own profitability.
                </p>
                <button onClick={runOptimization} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    {isLoading ? 'AI is Thinking...' : 'Run AI Optimization Analysis'}
                </button>
            </div>
            
            {/* 4. NAUJAS "DEEP DIVE" BLOKAS */}
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <h2 className="text-xl font-bold mb-4">Decision Deep Dive</h2>
                <p className="text-sm text-gray-400 mb-4">Analyze the bot's most impactful past decisions to understand its reasoning process.</p>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-gray-400">
                            <tr className="border-b border-gray-700">
                                <th className="p-2 text-left">Symbol</th>
                                <th className="p-2 text-left">Decision</th>
                                <th className="p-2 text-left">Outcome</th>
                                <th className="p-2 text-left">P/L</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockDecisions.map((decision) => (
                                <tr key={decision.timestamp} className="border-b border-gray-700">
                                    <td className="p-2 font-semibold">{decision.symbol}</td>
                                    <td className="p-2">{decision.decision}</td>
                                    <td className={`p-2 font-bold ${decision.outcome === 'Profit' ? 'text-green-400' : 'text-red-400'}`}>{decision.outcome}</td>
                                    <td className={`p-2 ${decision.outcome === 'Profit' ? 'text-green-400' : 'text-red-400'}`}>{decision.pnl.toFixed(2)}€</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleOpenModal(decision)} className="p-1 text-gray-300 hover:text-white">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Existing analysis and settings comparison section */}
            {analysis && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* ... renderSettingsTable calls ... */}
                 </div>
            )}
            
            {/* 5. MODALINIO LANGO KOMPONENTAS */}
            <DecisionDeepDiveModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={selectedDecision}
            />
        </div>
    );
}