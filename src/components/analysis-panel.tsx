"use client";

import { useDashboard } from '@/context/DashboardContext';

// Define interfaces for the component props and data structures
interface Decision {
    decision: string;
    amount_to_buy_usd: number;
    justification: string;
}

export interface Analysis {
    PortfolioAllocator?: {
        response: {
            [symbol: string]: Decision;
        };
    };
}

interface AnalysisPanelProps {
    analysis?: Analysis;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
    const { state } = useDashboard();
    const lastRunAnalysis = analysis || state.lastRunAnalysis;

    if (!lastRunAnalysis || Object.keys(lastRunAnalysis).length === 0) {
        return (
            <div className="bg-gray-900 text-white p-4 rounded-lg h-full flex items-center justify-center col-span-full">
                <div className="text-center">
                    <h2 className="font-bold text-lg mb-2">AI Analysis</h2>
                    <p className="text-gray-400">Run a cycle to get AI analysis.</p>
                </div>
            </div>
        );
    }

    const portfolioAllocator = lastRunAnalysis.PortfolioAllocator;
    const allocations = 
        portfolioAllocator && 
        typeof portfolioAllocator === 'object' && 
        'response' in portfolioAllocator &&
        portfolioAllocator.response &&
        typeof portfolioAllocator.response === 'object'
            ? portfolioAllocator.response 
            : {};
    
    // Type guard to check if an object is a Decision
    const isDecision = (value: unknown): value is Decision => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'decision' in value &&
            'amount_to_buy_usd' in value &&
            'justification' in value
        );
    };

    const buyDecisions = Object.entries(allocations).filter(
        (entry): entry is [string, Decision] => isDecision(entry[1]) && entry[1].decision === 'EXECUTE_BUY'
    );

    if (buyDecisions.length === 0) {
        return (
            <div className="bg-gray-900 text-white p-4 rounded-lg h-full flex items-center justify-center col-span-full">
                <p className="text-gray-400">No new assets were purchased in the last cycle.</p>
            </div>
        );
    }

    return (
        <>
            {buyDecisions.map(([symbol, decision]) => (
                <div key={symbol} className="bg-gray-900 text-white p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-blue-400">{symbol}</h3>
                    <div className="space-y-2 text-sm">
                        <p>
                            <span className="font-semibold">Decision:</span>
                            <span className="font-bold text-green-400 ml-2">{decision.decision.replace('_', ' ')}</span>
                        </p>
                        <p>
                            <span className="font-semibold">Amount:</span>
                            <span className="font-bold ml-2">€{decision.amount_to_buy_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <div>
                            <p className="font-semibold mb-1">Justification:</p>
                            <p className="text-gray-400 text-xs">{decision.justification}</p>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
