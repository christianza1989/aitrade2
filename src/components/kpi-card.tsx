"use client";

import { ReactNode, useMemo, useEffect, useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';

interface KpiCardProps {
    title: string;
    icon: ReactNode;
    kpiKey?: 'totalValue' | '24h_pnl' | 'freeCollateral';
    value?: string | number;
    color?: string;
}

export function KpiCard({ title, icon, kpiKey, value, color: propColor }: KpiCardProps) {
    const { state } = useDashboard();
    const { portfolio, marketData } = state;
    const [tradeHistory, setTradeHistory] = useState([]);

    useEffect(() => {
        async function fetchTradeHistory() {
            try {
                const response = await fetch('/api/history');
                const data = await response.json();
                setTradeHistory(data);
            } catch (error) {
                console.error("Failed to fetch trade history:", error);
            }
        }
        fetchTradeHistory();
        const interval = setInterval(fetchTradeHistory, 10000); // Refetch every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const kpiValue = useMemo(() => {
        if (value !== undefined) return value;
        if (!portfolio || !kpiKey) return 0;

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
                const now = new Date().getTime();
                const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
                const pnl24h = tradeHistory.reduce((acc, trade) => {
                    const tradeTimestamp = new Date((trade as { timestamp: string }).timestamp).getTime();
                    if (tradeTimestamp > twentyFourHoursAgo) {
                        return acc + (trade as { pnl: number }).pnl;
                    }
                    return acc;
                }, 0);
                return pnl24h;
            default:
                return 0;
        }
    }, [portfolio, marketData, kpiKey, value, tradeHistory]);

    const formattedValue = typeof kpiValue === 'number' 
        ? `€${kpiValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : kpiValue;
    
    let color = propColor || 'text-white';
    if (kpiKey === '24h_pnl' && typeof kpiValue === 'number') {
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
