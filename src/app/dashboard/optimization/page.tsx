// src/app/dashboard/optimization/page.tsx

"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { DecisionDeepDiveModal } from '../../../components/DecisionDeepDiveModal';
import { Eye, LoaderCircle } from 'lucide-react';
import { get } from 'lodash';

// Duomenų struktūrų apibrėžimai
interface Settings {
    [key: string]: unknown; // Naudojame 'unknown' lankstumui
}
interface Analysis {
    analysis_summary: string;
    suggested_settings: Settings;
}
interface DecisionData {
    symbol: string;
    decision: 'BUY' | 'SELL' | 'HOLD';
    outcome: 'Profit' | 'Loss';
    pnl: number;
    timestamp: string;
    context: {
        macro: { regime: string, score: number };
        sentiment: { mood: string, score: number };
        technicals: { score: number, summary: string };
    };
    consultation?: {
        question: string;
        answer: string;
    };
    pastLessons?: string[];
}
const SETTING_DESCRIPTIONS: { [key: string]: string } = {
    'risk_management.capital_per_trade_percent': 'Percentage of total capital to use for a single trade.',
    'risk_management.stop_loss_percentage': 'The percentage at which a losing trade is automatically closed.',
    'risk_management.take_profit_percentage': 'The percentage at which a winning trade is automatically closed.',
    'entry_criteria.min_macro_sentiment_score': 'The minimum macro score (0-10) required to even consider opening new trades.',
    'general.cooldown_period_minutes_after_loss': 'How many minutes the bot should wait before trading again after a loss.',
};

// Pavyzdiniai duomenys giluminei analizei (kol kas paliekame kaip maketą)
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
    const [currentSettings, setCurrentSettings] = useState<Settings | null>(null);

    // Būsenos valdymas modaliniam langui
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDecision, setSelectedDecision] = useState<DecisionData | null>(null);

    // Įkeliame dabartinius nustatymus, kai komponentas pasikrauna
    useEffect(() => {
        const fetchCurrentSettings = async () => {
            try {
                const response = await fetch('/api/settings');
                if(response.ok) {
                    setCurrentSettings(await response.json());
                }
            } catch (error) {
                console.error("Could not fetch current settings for comparison.", error);
            }
        };
        fetchCurrentSettings();
    }, []);

    const handleOpenModal = (decision: DecisionData) => {
        setSelectedDecision(decision);
        setIsModalOpen(true);
    };

    const runOptimization = async () => {
        setIsLoading(true);
        setAnalysis(null);
        const toastId = toast.loading('AI is analyzing past performance...');

        try {
            const response = await fetch('/api/bot/optimize', {
                method: 'POST',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to run optimization.');
            }

            setAnalysis(result);
            toast.success('AI analysis complete! See suggested improvements below.', { id: toastId });

        } catch (error) {
            toast.error(`Optimization failed: ${(error as Error).message}`, { id: toastId });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyAiSettings = async () => {
        if (!analysis) return;

        if (!window.confirm("Are you sure you want to apply the AI's suggested settings? This will overwrite your current configuration.")) {
            return;
        }

        const toastId = toast.loading('Applying new settings...');
        try {
            const newSettings = { ...currentSettings, ...analysis.suggested_settings };
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });

            if (!response.ok) throw new Error('Failed to save settings.');

            setCurrentSettings(newSettings);
            toast.success('AI settings have been applied successfully!', { id: toastId });

        } catch (error) {
            toast.error('Could not apply new settings.', { id: toastId });
        }
    };

    const renderSettingsTable = (title: string, settings: Settings | null) => {
        const relevantKeys = Object.keys(SETTING_DESCRIPTIONS);

        return (
            <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <div className="space-y-3">
                    {relevantKeys.map(key => {
                        const value = get(settings, key, 'N/A');
                        return (
                            <div key={key} className="flex justify-between items-center text-sm p-2 bg-gray-700/50 rounded">
                                <div>
                                    <p className="font-semibold">{key}</p>
                                    <p className="text-xs text-gray-400">{SETTING_DESCRIPTIONS[key]}</p>
                                </div>
                                <span className="font-mono text-lg">{String(value)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="text-white p-6 space-y-8">
            <h1 className="text-3xl font-bold">Autonomous AI Optimization</h1>

            <div className="bg-gray-800 p-4 rounded-lg">
                <p className="mb-4 text-gray-300">
                    Click the button below to have the AI analyze all past trades. It will identify patterns and propose a new, optimized set of parameters to improve its own profitability.
                </p>
                <button
                    onClick={runOptimization}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading && <LoaderCircle className="animate-spin mr-2" size={20} />}
                    {isLoading ? 'AI is Thinking...' : 'Run AI Optimization Analysis'}
                </button>
            </div>

            {analysis && (
                <div className="bg-gray-900 p-6 rounded-lg border-2 border-blue-500/50">
                    <h2 className="text-2xl font-bold mb-3 text-blue-300">Analysis Complete</h2>
                    <p className="mb-6 text-gray-300">{analysis.analysis_summary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        {renderSettingsTable("Current Settings", currentSettings)}
                        {renderSettingsTable("AI Suggested Settings", analysis.suggested_settings)}
                    </div>

                    <button onClick={applyAiSettings} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">
                        Apply AI Settings
                    </button>
                </div>
            )}

            {/* Decision Deep Dive lieka kaip maketas ateities darbams */}
            <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Decision Deep Dive</h2>
                <p className="text-sm text-gray-400 mb-4">Analyze the bot's most impactful past decisions to understand its reasoning process. (This is a placeholder for future development).</p>
                {/* ... (likusi lentelės dalis) ... */}
            </div>

            <DecisionDeepDiveModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                data={selectedDecision}
            />
        </div>
    );
}
