// src/components/DecisionDeepDiveModal.tsx

"use client";

import { X } from 'lucide-react';
import { Badge } from './ui/badge';

// This is a placeholder type. In a real scenario, this would be a detailed trade/decision object.
export interface DecisionData {
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

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: DecisionData | null;
}

const DataSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-gray-800 p-3 rounded-lg">
        <h4 className="font-semibold text-gray-300 mb-2">{title}</h4>
        <div className="text-sm space-y-2">{children}</div>
    </div>
);

const DataRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-gray-400">{label}:</span>
        <span className="text-white font-mono text-right">{value}</span>
    </div>
);


export function DecisionDeepDiveModal({ isOpen, onClose, data }: ModalProps) {
    if (!isOpen || !data) return null;

    const outcomeColor = data.outcome === 'Profit' ? 'text-green-400' : 'text-red-400';

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div className="flex items-center">
                        <Badge className={`mr-3 ${outcomeColor.replace('text', 'bg').replace('-400', '-500')} text-white`}>{data.outcome}</Badge>
                        <h2 className="text-xl font-bold">Deep Dive: {data.decision} {data.symbol}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Situation Section */}
                    <DataSection title="Situation at Time of Decision">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                               <DataRow label="Macro Regime" value={<Badge variant={data.context.macro.regime === 'Risk-On' ? 'success' : 'destructive'}>{data.context.macro.regime}</Badge>} />
                               <DataRow label="Macro Score" value={data.context.macro.score.toFixed(1)} />
                            </div>
                             <div>
                               <DataRow label="Sentiment" value={<Badge variant={data.context.sentiment.mood === 'Bullish' ? 'success' : 'destructive'}>{data.context.sentiment.mood}</Badge>} />
                               <DataRow label="Sentiment Score" value={data.context.sentiment.score.toFixed(2)} />
                            </div>
                             <div>
                                <DataRow label="Technical Score" value={data.context.technicals.score.toFixed(1)} />
                                <p className="text-xs text-gray-400 mt-1">{data.context.technicals.summary}</p>
                            </div>
                        </div>
                    </DataSection>

                    {/* Consultation Section */}
                    {data.consultation && (
                         <DataSection title="Agent Consultation (Debate)">
                            <div className="bg-gray-900 p-2 rounded">
                                <p className="text-xs text-blue-300 font-semibold">RiskManager asked MacroAnalyst:</p>
                                <p className="text-sm italic">"{data.consultation.question}"</p>
                            </div>
                             <div className="bg-gray-900 p-2 rounded mt-2">
                                <p className="text-xs text-green-300 font-semibold">MacroAnalyst answered:</p>
                                <p className="text-sm">"{data.consultation.answer}"</p>
                            </div>
                        </DataSection>
                    )}

                     {/* Memory Section */}
                    {data.pastLessons && data.pastLessons.length > 0 && (
                         <DataSection title="Past Lessons (From Vector Memory)">
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                                {data.pastLessons.map((lesson, i) => <li key={i}>{lesson}</li>)}
                            </ul>
                        </DataSection>
                    )}
                </div>
                 {/* Footer */}
                <div className="p-4 border-t border-gray-700 mt-auto">
                    <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-400">Final Outcome:</span>
                        <span className={`font-bold ${outcomeColor}`}>
                            {data.pnl >= 0 ? '+' : ''}€{data.pnl.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}