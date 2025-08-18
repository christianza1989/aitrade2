"use client";

import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface Decision {
    timestamp: string;
    decision: string;
    justification: string;
    pnlPercent: number;
    currentPrice: number;
    symbol: string;
}

export function DecisionLog() {
    const [allDecisions, setAllDecisions] = useState<Decision[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDecisions() {
            try {
                const response = await fetch('/api/decisions');
                if (!response.ok) throw new Error('Failed to fetch decisions.');
                const data = await response.json();
                const flattenedDecisions = Object.entries(data).flatMap(([symbol, decisionList]: [string, any]) => 
                    decisionList.map((d: any) => ({ ...d, symbol }))
                ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setAllDecisions(flattenedDecisions);
                setCurrentIndex(0); // Reset to the latest decision on refresh
            } catch (error) {
                toast.error("Could not load decision log.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchDecisions(); // Initial fetch
        const intervalId = setInterval(fetchDecisions, 10000); // Refresh every 10 seconds
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (allDecisions.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
            }, 10000); // Cycle to the newest every 10 seconds
            return () => clearInterval(timer);
        }
    }, [allDecisions]);

    const handleNext = () => {
        setCurrentIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : 0));
    };

    const handlePrev = () => {
        setCurrentIndex(prevIndex => (prevIndex < allDecisions.length - 1 ? prevIndex + 1 : allDecisions.length - 1));
    };

    const currentDecision = allDecisions[currentIndex];

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Portfolio Manager Decisions</h2>
                {allDecisions.length > 1 && (
                    <div className="flex items-center space-x-2">
                        <button onClick={handlePrev} disabled={currentIndex === allDecisions.length - 1} className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                            <ChevronDown size={16} />
                        </button>
                        <span className="text-xs text-gray-400">{currentIndex + 1} / {allDecisions.length}</span>
                        <button onClick={handleNext} disabled={currentIndex === 0} className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                            <ChevronUp size={16} />
                        </button>
                    </div>
                )}
            </div>
            <div className="h-[10vh]">
                {isLoading ? (
                    <p>Loading decisions...</p>
                ) : currentDecision ? (
                    <div className="text-xs p-2 bg-gray-900 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-blue-400">{currentDecision.symbol}</span>
                            <span className="text-gray-400">{new Date(currentDecision.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p>
                            <span className="font-semibold">Decision:</span>
                            <span className={`ml-2 font-bold ${currentDecision.decision === 'SELL_NOW' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {currentDecision.decision.replace('_', ' ')}
                            </span>
                        </p>
                        <p className="text-gray-400 mt-1">{currentDecision.justification}</p>
                    </div>
                ) : (
                    <p className="text-gray-400">No decisions logged yet.</p>
                )}
            </div>
        </div>
    );
}
