// src/components/DecisionDeepDiveModal.tsx
"use client";

import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

// Atnaujinta sąsaja, atitinkanti realius duomenis
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any | null; // Naudosime 'any' dėl lankstumo
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

    const { decision, analysis, pastLessons, timestamp } = data;
    const { macro, sentiment, technical } = analysis || {};
    const { symbol, pnl, outcome } = data; // Šiuos duomenis gausime iš pagrindinio `trade` objekto

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Decision Deep Dive: {decision?.decision} {decision?.symbol}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <ScrollArea className="p-4">
                    <div className="space-y-4">
                        <DataSection title="Situation at Time of Decision">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <h5 className="font-bold mb-2">Macro</h5>
                                    <DataRow label="Regime" value={<Badge variant={macro?.market_regime === 'Risk-On' ? 'success' : 'destructive'}>{macro?.market_regime}</Badge>} />
                                    <DataRow label="Score" value={macro?.regime_score?.toFixed(1)} />
                                    <DataRow label="Trend" value={macro?.risk_trend} />
                                </div>
                                <div>
                                    <h5 className="font-bold mb-2">Sentiment</h5>
                                    <DataRow label="Mood" value={<Badge variant={sentiment?.sentiment === 'Bullish' ? 'success' : 'destructive'}>{sentiment?.sentiment}</Badge>} />
                                    <DataRow label="Score" value={sentiment?.sentiment_score?.toFixed(2)} />
                                </div>
                                <div>
                                    <h5 className="font-bold mb-2">Technicals</h5>
                                    <DataRow label="Score" value={technical?.technical_score?.toFixed(1)} />
                                    <DataRow label="Trend" value={technical?.trend} />
                                    <DataRow label="Momentum" value={technical?.momentum} />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-900/50 rounded">
                                **Dominant Narrative:** {sentiment?.dominant_narrative || 'N/A'}
                            </p>
                        </DataSection>

                        <DataSection title="AI's Reasoning & Past Lessons">
                            {decision?.human_lesson_consideration && (
                                <div className="p-3 mb-3 bg-purple-900/50 rounded-lg border-l-4 border-purple-500">
                                    <p className="font-semibold text-purple-300">💡 Human Lesson Consideration</p>
                                    <p className="text-xs text-gray-300 italic">&ldquo;{decision.human_lesson_consideration}&rdquo;</p>
                                </div>
                            )}
                            <p className="text-xs text-gray-300 p-2 bg-gray-900/50 rounded italic">
                                **Final Summary:** {decision?.final_summary || 'N/A'}
                            </p>
                            <div>
                                <h5 className="font-bold mb-1 mt-3">Similar Past Trades Recalled from Memory:</h5>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                                    {pastLessons && pastLessons.length > 0 ?
                                     pastLessons.map((lesson: any, i: number) => <li key={i}>{lesson.narrative}</li>) :
                                     <li>No relevant past lessons found.</li>}
                                </ul>
                            </div>
                        </DataSection>
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-gray-700 mt-auto">
                    <p className="text-sm text-gray-400 text-center">Decision made at {new Date(timestamp).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
