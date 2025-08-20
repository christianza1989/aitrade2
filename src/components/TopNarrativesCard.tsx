// src/components/TopNarrativesCard.tsx

"use client";

import { IntelCard } from './IntelCard';
import { Layers, TrendingUp } from 'lucide-react';

interface Narrative {
    id: string;
    name: string;
    market_cap: number;
    market_cap_change_24h: number;
}

interface TopNarrativesCardProps {
    narratives: Narrative[] | null;
}

export function TopNarrativesCard({ narratives }: TopNarrativesCardProps) {
    return (
        <IntelCard title="Top Narratives" icon={Layers} className="col-span-1 md:col-span-2">
            <div className="overflow-x-auto">
                {!narratives || narratives.length === 0 ? (
                    <p className="text-gray-500 text-sm">Could not load narrative data.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-2">Narrative / Sector</th>
                                <th className="p-2 text-right">Market Cap</th>
                                <th className="p-2 text-right">24h Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {narratives.map((narrative) => (
                                <tr key={narrative.id} className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer">
                                    <td className="p-2 font-semibold">{narrative.name}</td>
                                    <td className="p-2 text-right">${(narrative.market_cap / 1_000_000_000).toFixed(2)}B</td>
                                    <td className={`p-2 text-right flex justify-end items-center ${narrative.market_cap_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <TrendingUp size={14} className="mr-1" />
                                        {narrative.market_cap_change_24h.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </IntelCard>
    );
}