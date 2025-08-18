"use client";

import { useDashboard } from '@/context/DashboardContext';
import { MarketTable } from '@/components/market-table';
import { KpiCard } from '@/components/kpi-card';
import { AnalysisPanel } from '@/components/analysis-panel';
import { AiChatWindow } from '@/components/ai-chat-window';
import { NewsFeed } from '@/components/news-feed';
import { Chart } from '@/components/chart';
import { DecisionLog } from '@/components/decision-log';
import { SharedContextDisplay } from '@/components/shared-context-display';
import { DynamicRiskDisplay } from '@/components/dynamic-risk-display';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

export default function Dashboard() {
    const { state } = useDashboard();

    return (
        <div className="text-white p-4 sm:p-6 space-y-6">
            {/* Row 1: KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Total Value" kpiKey="totalValue" icon={<Wallet size={24} />} />
                <KpiCard title="24h P/L" kpiKey="24h_pnl" icon={<TrendingUp size={24} />} />
                <KpiCard title="Free Collateral" kpiKey="freeCollateral" icon={<DollarSign size={24} />} />
            </div>

            {/* Row 2: Hive Mind & Risk Context */}
            <div className="space-y-6">
                <SharedContextDisplay context={state.sharedContext} />
                <DynamicRiskDisplay />
            </div>

            {/* Row 3: Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h2 className="text-lg font-semibold mb-4">{state.selectedSymbol} Price Chart</h2>
                        <Chart />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-4">AI Analysis Cycle: Latest Buys</h2>
                        <AnalysisPanel />
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <AiChatWindow />
                    </div>
                    <DecisionLog />
                </div>

                {/* Side Column */}
                <div className="xl:col-span-1 space-y-6">
                    <MarketTable />
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h2 className="font-semibold text-md mb-2">Live Logs</h2>
                        <div className="bg-gray-900 text-white p-2 rounded-lg h-64 overflow-y-auto text-xs space-y-1 font-mono">
                            {state.logs.map((log, index) => (
                                <p key={index}>{log}</p>
                            ))}
                        </div>
                    </div>
                    <NewsFeed />
                </div>
            </div>
        </div>
    );
}
