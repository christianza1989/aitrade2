"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MissedOpportunity } from '@/core/opportunity-logger';

// Define interfaces for our state and props
interface Settings {
    [key: string]: string | number;
}

interface Analysis {
    analysis_summary: string;
    suggested_settings: Settings;
}

const SETTING_DESCRIPTIONS: { [key: string]: string } = {
    sellStrategy: "The strategy for selling assets (e.g., takeProfit).",
    takeProfitPercent: "The percentage gain at which to consider selling.",
    stopLossPercent: "The percentage loss at which to sell.",
    trailingStopPercent: "The percentage for the trailing stop loss.",
    riskAmountPercent: "The percentage of the balance to risk on a single trade.",
    rsiPeriod: "The period for the Relative Strength Index (RSI) calculation.",
    symbolsToAnalyze: "The number of top symbols to analyze each cycle.",
    batchSize: "The number of symbols to analyze in a single batch.",
    macroScoreThreshold: "The minimum macro score required to consider buying.",
    minimumBalance: "The minimum balance required to run the bot.",
    cycleIntervalMinutes: "The interval in minutes between buy cycles.",
    smaShortPeriod: "The short period for the Simple Moving Average (SMA).",
    smaLongPeriod: "The long period for the Simple Moving Average (SMA).",
    macdShortPeriod: "The short period for MACD.",
    macdLongPeriod: "The long period for MACD.",
    macdSignalPeriod: "The signal period for MACD."
};

export default function OptimizationPage() {
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<Settings | null>(null);
    const [missedOpportunities, setMissedOpportunities] = useState<MissedOpportunity[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const settingsResponse = await fetch('/api/settings');
                const settingsData = await settingsResponse.json();
                setCurrentSettings(settingsData);

                const opportunitiesResponse = await fetch('/api/missed-opportunities');
                const opportunitiesData = await opportunitiesResponse.json();
                setMissedOpportunities(opportunitiesData);

            } catch (error) {
                console.error("Failed to fetch page data:", error);
                toast.error("Could not load page data.");
            }
        }
        fetchData();
    }, []);

    const runOptimization = async () => {
        setIsLoading(true);
        setAnalysis(null);
        const toastId = toast.loading("AI is analyzing trade history...");
        try {
            const response = await fetch('/api/bot/optimize', {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Optimization failed');
            const data = await response.json();
            setAnalysis(data.response);
            toast.success("AI analysis complete!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Optimization analysis failed.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const applyAiSettings = async () => {
        if (!analysis?.suggested_settings) return;
        const toastId = toast.loading("Applying AI-learned settings...");
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysis.suggested_settings),
            });
            if (!response.ok) throw new Error('Failed to apply settings');
            const newSettings = await response.json();
            setCurrentSettings(newSettings);
            toast.success("AI settings applied successfully! The bot will use these on the next cycle.", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to apply AI settings.", { id: toastId });
        }
    };

    const renderSettingsTable = (title: string, settings: Settings | null) => {
        if (!settings) return null;
        return (
            <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <table className="min-w-full">
                    <tbody>
                        {Object.entries(settings).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-600">
                                <td className="p-2 font-semibold">{key}</td>
                                <td className="p-2">{String(value)}</td>
                                <td className="p-2 text-gray-400 text-sm">{SETTING_DESCRIPTIONS[key]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Autonomous AI Optimization</h1>
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <p className="mb-4">
                    Click the button below to have the AI analyze all past trades from the trade log. It will identify patterns and propose a new, fully optimized set of parameters to improve its own profitability.
                </p>
                <button onClick={runOptimization} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    {isLoading ? 'AI is Thinking...' : 'Run AI Optimization Analysis'}
                </button>
            </div>

            {analysis && (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-bold mb-4">AI Analysis Summary</h2>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <p>{analysis.analysis_summary}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderSettingsTable("Current Settings", currentSettings)}
                        {renderSettingsTable("AI's Proposed New Settings", analysis.suggested_settings)}
                    </div>
                    {renderMissedOpportunitiesTable()}
                    <div className="bg-gray-800 p-4 rounded-lg text-center">
                        <h2 className="text-xl font-bold mb-4">Authorize AI Self-Modification</h2>
                        <p className="mb-4">
                            Allow the AI to apply its learned settings. The bot will use this new configuration on its next trading cycle.
                        </p>
                        <button onClick={applyAiSettings} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                            Apply AI Learned Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    function renderMissedOpportunitiesTable() {
        if (missedOpportunities.length === 0) return null;
        return (
            <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold mb-2">Recent Missed Opportunities (for AI learning)</h3>
                <div className="overflow-y-auto h-48">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400">
                                <th className="p-2">Symbol</th>
                                <th className="p-2">Reason</th>
                                <th className="p-2">Confidence</th>
                                <th className="p-2">Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {missedOpportunities.map((opp, index) => (
                                <tr key={index} className="border-b border-gray-600">
                                    <td className="p-2 font-semibold">{opp.symbol}</td>
                                    <td className="p-2">{opp.reason}</td>
                                    <td className="p-2">{opp.confidenceScore?.toFixed(1)}</td>
                                    <td className="p-2 text-gray-400">{opp.finalSummary}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}
