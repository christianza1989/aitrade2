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

    const portfolioAllocator = 'PortfolioAllocator' in lastRunAnalysis ? lastRunAnalysis.PortfolioAllocator : null;
    const allocations = 
        portfolioAllocator && 
        typeof portfolioAllocator === 'object' && 
        'response' in portfolioAllocator &&
        portfolioAllocator.response &&
        typeof portfolioAllocator.response === 'object'
            ? portfolioAllocator.response 
            : {};
    
    const allDecisions = Object.entries(allocations);

    if (allDecisions.length === 0) {
        return (
            <div className="bg-gray-900 text-white p-4 rounded-lg h-full flex items-center justify-center col-span-full">
                <p className="text-gray-400">Portfolio Allocator did not provide any decisions.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allDecisions.map(([symbol, dec]) => {
                const decision = dec as Decision;
                const isBuy = decision.decision === 'EXECUTE_BUY';
                
                return (
                    <div key={symbol} className={`bg-gray-900 text-white p-4 rounded-lg border-l-4 ${isBuy ? 'border-green-500' : 'border-gray-600'}`}>
                        <h3 className={`font-bold text-lg mb-2 ${isBuy ? 'text-blue-400' : 'text-gray-500'}`}>{symbol}</h3>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-semibold">Decision:</span>
                                <span className={`font-bold ml-2 ${isBuy ? 'text-green-400' : 'text-yellow-400'}`}>{decision.decision.replace('_', ' ')}</span>
                            </p>
                            {isBuy && (
                                <p>
                                    <span className="font-semibold">Amount:</span>
                                    <span className="font-bold ml-2">€{decision.amount_to_buy_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </p>
                            )}
                            <div>
                                <p className="font-semibold mb-1">Justification:</p>
                                <p className="text-gray-400 text-xs">{decision.justification}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
