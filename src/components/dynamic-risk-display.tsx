"use client";

import { useDashboard } from '@/context/DashboardContext';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function DynamicRiskDisplay() {
    const { state } = useDashboard();
    const { adjustedConfig, sharedContext } = state;

    if (!adjustedConfig || !sharedContext) {
        return null; // Don't render if there's no adjustment
    }

    const isAggressive = sharedContext.regimeScore > 7.5;
    const isDefensive = sharedContext.regimeScore < 4.0;

    if (!isAggressive && !isDefensive) {
        return null; // No significant adjustment, don't render
    }

    const title = isAggressive ? "Aggressive Stance Adopted" : "Defensive Stance Adopted";
    const Icon = isAggressive ? AlertTriangle : ShieldCheck;
    const color = isAggressive ? "text-yellow-400" : "text-blue-400";
    const reason = isAggressive 
        ? `Market regime is highly favorable (Score: ${sharedContext.regimeScore.toFixed(1)}). Increasing risk exposure.`
        : `Market regime is unfavorable (Score: ${sharedContext.regimeScore.toFixed(1)}). Reducing risk exposure.`;

    return (
        <div className={`bg-gray-800 p-4 rounded-lg border-l-4 ${isAggressive ? 'border-yellow-400' : 'border-blue-400'}`}>
            <div className="flex items-center">
                <Icon size={24} className={`${color} mr-3`} />
                <div>
                    <h3 className={`text-lg font-semibold ${color}`}>{title}</h3>
                    <p className="text-sm text-gray-300">{reason}</p>
                </div>
            </div>
        </div>
    );
}
