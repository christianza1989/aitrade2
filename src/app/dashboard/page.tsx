// src/app/dashboard/page.tsx

"use client";

import { useDashboard } from '@/context/DashboardContext';
import { MarketTable } from '@/components/market-table';
import { KpiCard } from '@/components/kpi-card';
import { AnalysisPanel } from '@/components/analysis-panel';
import { AiChatWindow } from '@/components/ai-chat-window';
import { NewsFeed } from '@/components/news-feed';
import { Chart } from '@/components/chart';
import { DecisionLog } from '@/components/decision-log';
import { HiveMindDisplay } from '@/components/HiveMindDisplay';
import { DynamicRiskDisplay } from '@/components/dynamic-risk-display';
import { OpportunityLog } from '@/components/opportunity-log';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { ActivityFeed } from '@/components/ActivityFeed'; // 1. IMPORTUOTI NAUJĄ KOMPONENTĄ

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
                <HiveMindDisplay /> 
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
                    
                    {/* 2. PAKEISTI SENĄ "LIVE LOGS" BLOKĄ NAUJU KOMPONENTU */}
                    <ActivityFeed />
                    
                    <NewsFeed />
                    <OpportunityLog />
                </div>
            </div>
        </div>
    );
}