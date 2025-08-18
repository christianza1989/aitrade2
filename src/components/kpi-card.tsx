"use client";

import { ReactNode, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';

interface KpiCardProps {
    title: string;
    icon: ReactNode;
    kpiKey: 'totalValue' | '24h_pnl' | 'freeCollateral';
}

export function KpiCard({ title, icon, kpiKey }: KpiCardProps) {
    const { state } = useDashboard();
    const { portfolio, marketData } = state;

    const kpiValue = useMemo(() => {
        if (!portfolio) return 0;

        const positionsValue = portfolio.positions.reduce((acc, pos) => {
            const marketInfo = marketData.find(md => md.symbol === pos.symbol);
            const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
            return acc + (currentPrice * pos.amount);
        }, 0);

        const totalValue = portfolio.balance + positionsValue;

        switch (kpiKey) {
            case 'totalValue':
                return totalValue;
            case 'freeCollateral':
                return portfolio.balance;
            case '24h_pnl':
                const pnl24h = portfolio.positions.reduce((acc, pos) => {
                    const marketInfo = marketData.find(md => md.symbol === pos.symbol);
                    if (!marketInfo) return acc;
                    const priceChange = parseFloat(marketInfo.priceChange);
                    return acc + (priceChange * pos.amount);
                }, 0);
                return pnl24h;
            default:
                return 0;
        }
    }, [portfolio, marketData, kpiKey]);

    const formattedValue = `€${kpiValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    let color = 'text-white';
    if (kpiKey === '24h_pnl') {
        if (kpiValue > 0) color = 'text-green-400';
        if (kpiValue < 0) color = 'text-red-400';
    }

    return (
        <div className="bg-gray-900 p-4 rounded-lg flex items-center">
            <div className={`mr-4 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{formattedValue}</p>
            </div>
        </div>
    );
}
