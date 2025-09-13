"use client";

import { ReactNode, useMemo } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { Trade } from '../core/optimizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContextualHelp } from './ContextualHelp';
import CountUp from 'react-countup';

interface KpiCardProps {
    title: string;
    icon: ReactNode;
    kpiKey?: 'totalValue' | '24h_pnl' | 'freeCollateral';
    value?: string | number;
    color?: string;
    helpTopicId?: string;
}

export function KpiCard({ title, icon, kpiKey, value, color: propColor, helpTopicId }: KpiCardProps) {
    const { state } = useDashboard();
    const { portfolio, marketData, tradeHistory } = state;

    const kpiValue = useMemo(() => {
        if (value !== undefined) return value;
        if (!portfolio || !kpiKey) return 0;

        const unrealizedPnl = portfolio.positions.reduce((acc, pos) => {
            const marketInfo = marketData.find(md => md.symbol === pos.symbol);
            const currentPrice = marketInfo ? parseFloat(marketInfo.lastPrice) : pos.entryPrice;
            
            let pnl = 0;
            if (pos.type === 'short') {
                pnl = (pos.entryPrice - currentPrice) * pos.amount;
            } else { // Default to long position
                pnl = (currentPrice - pos.entryPrice) * pos.amount;
            }
            return acc + pnl;
        }, 0);

        const totalValue = portfolio.balance + unrealizedPnl;

        switch (kpiKey) {
            case 'totalValue':
                return totalValue;
            case 'freeCollateral':
                return portfolio.balance;
            case '24h_pnl':
                const now = new Date().getTime();
                const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
                const pnl24h = tradeHistory.reduce((acc, trade) => {
                    const tradeTimestamp = new Date(trade.timestamp).getTime();
                    if (tradeTimestamp > twentyFourHoursAgo) {
                        return acc + trade.pnl;
                    }
                    return acc;
                }, 0);
                return pnl24h + unrealizedPnl; // Pridedame ir nerealizuotą P/L
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    {helpTopicId && <ContextualHelp topicId={helpTopicId} />}
                </div>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>
                    <CountUp
                        end={typeof kpiValue === 'number' ? kpiValue : 0}
                        duration={1.5}
                        separator=","
                        decimals={2}
                        decimal="."
                        prefix={kpiKey === '24h_pnl' ? (typeof kpiValue === 'number' && kpiValue >= 0 ? "+€" : "-€") : "€"}
                        formattingFn={(value) => {
                            const absValue = Math.abs(value);
                            const formatted = absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            if (kpiKey === '24h_pnl') {
                                return `${value >= 0 ? '+' : '-'}€${formatted}`;
                            }
                            return `€${formatted}`;
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
