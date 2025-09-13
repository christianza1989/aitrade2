// src/app/dashboard/analysis/page.tsx
"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { LoaderCircle, Search } from 'lucide-react';

export default function OnDemandAnalysisPage() {
    const [symbol, setSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleAnalysis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol.trim()) {
            toast.error("Please enter a symbol.");
            return;
        }

        setIsLoading(true);
        setResult(null);
        const toastId = toast.loading(`Submitting ${symbol.toUpperCase()} for analysis...`);

        try {
            // 1. Pateikiame užduotį
            const res = await fetch('/api/bot/analyze-on-demand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
            });

            if (!res.ok) throw new Error("Failed to submit analysis job.");
            const { jobId } = await res.json();
            toast.success(`Job ${jobId} submitted. Awaiting results...`, { id: toastId });

            // 2. Pradedame periodiškai tikrinti rezultatą
            const interval = setInterval(async () => {
                const statusRes = await fetch(`/api/bot/analysis-status?jobId=${jobId}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === 'COMPLETED') {
                        clearInterval(interval);
                        setResult(statusData.data);
                        setIsLoading(false);
                        toast.success(`Analysis for ${symbol.toUpperCase()} is complete!`, { id: toastId });
                    } else if (statusData.status === 'FAILED') {
                        clearInterval(interval);
                        setIsLoading(false);
                        toast.error(`Analysis failed: ${statusData.error}`, { id: toastId });
                    }
                }
            }, 3000); // Tikriname kas 3 sekundes
        } catch (error) {
            setIsLoading(false);
            toast.error((error as Error).message, { id: toastId });
        }
    };

    return (
        <div className="text-white p-6 space-y-8">
            <h1 className="text-3xl font-bold">On-Demand AI Analysis</h1>

            <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
                <form onSubmit={handleAnalysis} className="flex gap-4">
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        placeholder="Enter a symbol, e.g., BTCUSDT"
                        className="flex-grow bg-gray-700 rounded p-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={isLoading}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded flex items-center disabled:opacity-50" disabled={isLoading}>
                        {isLoading ? <LoaderCircle className="animate-spin" /> : <Search />}
                        <span className="ml-2">{isLoading ? "Analyzing..." : "Analyze"}</span>
                    </button>
                </form>
            </div>

            {result && (
                <div className="bg-gray-800/50 p-6 rounded-lg max-w-4xl mx-auto border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4">Analysis for {symbol.toUpperCase()}</h2>
                    <div className="p-4 bg-gray-900 rounded-lg">
                        <p className="text-lg"><strong>Recommendation:</strong> <span className="text-blue-400 font-semibold">{result.recommendation}</span></p>
                        <p><strong>Confidence Score:</strong> {(result.confidence_score * 100).toFixed(1)}%</p>
                        <p className="mt-2 text-gray-300 italic">"{result.summary}"</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-green-900/50 p-4 rounded-lg">
                            <h3 className="font-bold text-green-300 mb-2">Key Positive Factors</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {result.key_positive_factors.map((factor: string, i: number) => <li key={i}>{factor}</li>)}
                            </ul>
                        </div>
                        <div className="bg-red-900/50 p-4 rounded-lg">
                            <h3 className="font-bold text-red-300 mb-2">Key Risks & Concerns</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {result.key_risks_and_concerns.map((risk: string, i: number) => <li key={i}>{risk}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-6 bg-gray-700 p-4 rounded-lg">
                        <h3 className="font-bold mb-2">Suggested Action</h3>
                        <p className="text-sm">{result.suggested_action}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
