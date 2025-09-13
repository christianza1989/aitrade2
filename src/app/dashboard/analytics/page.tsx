// src/app/dashboard/analytics/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  DollarSign, Percent, TrendingUp, TrendingDown, Divide, CheckCircle, XCircle, RotateCcw
} from 'lucide-react';
import { StatefulContainer } from '@/components/ui/stateful-container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Dynamically import chart components with SSR turned off
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Chart), {
    ssr: false,
    loading: () => <p>Loading chart...</p>
});
const MonthlyPnlChart = dynamic(() => import('@/components/analytics/MonthlyPnlChart'), {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>,
});
const WinRateChart = dynamic(() => import('@/components/analytics/WinRateChart'), {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>,
});
const DrawdownChart = dynamic(() => import('@/components/analytics/DrawdownChart'), {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>,
});

// Chart.js registration will be handled in useEffect

interface AnalyticsData {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    equityCurve: { date: string; pnl: number }[];
}

interface TradeData {
    id: string;
    timestamp: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    pnl: number;
    userId: string;
}

interface TradeAnnotation {
    x: string;
    y: number;
    trade: TradeData;
}

const KpiCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color?: string }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-start">
        <div className="p-3 bg-gray-700 rounded-lg mr-4">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
        </div>
    </div>
);

interface TimeFilter {
    key: string;
    label: string;
    days: number | null;
}

const TIME_FILTERS: TimeFilter[] = [
    { key: '1D', label: '1 Day', days: 1 },
    { key: '1W', label: '1 Week', days: 7 },
    { key: '1M', label: '1 Month', days: 30 },
    { key: '3M', label: '3 Months', days: 90 },
    { key: '1Y', label: '1 Year', days: 365 },
    { key: 'ALL', label: 'All Time', days: null },
];

const TimeFilterButtons = ({ activeFilter, onFilterChange }: {
    activeFilter: string;
    onFilterChange: (filter: TimeFilter) => void;
}) => (
    <div className="flex gap-2 mb-4 flex-wrap">
        {TIME_FILTERS.map(filter => (
            <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(filter)}
            >
                {filter.label}
            </Button>
        ))}
    </div>
);

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [trades, setTrades] = useState<TradeData[]>([]);
    const [monthlyPnl, setMonthlyPnl] = useState<{ labels: string[]; data: number[] } | null>(null);
    const [winRateBreakdown, setWinRateBreakdown] = useState<{
        winningTrades: { count: number; totalPnl: number };
        losingTrades: { count: number; totalPnl: number };
    } | null>(null);
    const [drawdown, setDrawdown] = useState<{
        dates: string[];
        values: number[];
        maxDrawdown?: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const chartRef = useRef<any>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch both analytics and trade history in parallel
                const [analyticsRes, tradesRes] = await Promise.all([
                    fetch('/api/analytics'),
                    fetch('/api/history')
                ]);

                if (!analyticsRes.ok) throw new Error('Failed to fetch analytics.');
                if (!tradesRes.ok) throw new Error('Failed to fetch trade history.');

                const [analyticsResult, tradesResult] = await Promise.all([
                    analyticsRes.json(),
                    tradesRes.json()
                ]);

                if (analyticsResult.message) { // Handle "No trades" case
                    setData(null);
                    setTrades([]);
                    setMonthlyPnl(null);
                    setWinRateBreakdown(null);
                    setDrawdown(null);
                } else {
                    setData(analyticsResult);
                    setTrades(tradesResult);
                    setMonthlyPnl(analyticsResult.monthlyPnl);
                    setWinRateBreakdown(analyticsResult.winRateBreakdown);
                    setDrawdown(analyticsResult.drawdown);
                }
            } catch (error) {
                const errorMessage = (error as Error).message;
                setError(errorMessage);
                toast.error('Could not load analytics data.');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleFilterChange = (filter: TimeFilter) => {
        setActiveFilter(filter.key);
    };

    const handleResetZoom = () => {
        if (chartRef.current) {
            chartRef.current.resetZoom();
        }
    };

    // Create equity map for quick lookup
    const createEquityMap = (equityCurve: { date: string; pnl: number }[]) => {
        const map = new Map<string, number>();
        equityCurve.forEach(point => {
            map.set(point.date, point.pnl);
        });
        return map;
    };

    // Generate trade annotations
    const createTradeAnnotations = (
        trades: TradeData[],
        equityMap: Map<string, number>
    ) => {
        const buyTrades: TradeAnnotation[] = [];
        const sellTrades: TradeAnnotation[] = [];

        trades.forEach(trade => {
            const tradeDate = new Date(trade.timestamp).toLocaleDateString();
            const equityValue = equityMap.get(tradeDate);

            if (equityValue !== undefined) {
                const tradeAnnotation: TradeAnnotation = {
                    x: tradeDate,
                    y: equityValue,
                    trade
                };

                // Determine if it's a buy or sell based on quantity or side
                if (trade.side === 'BUY' || trade.quantity > 0) {
                    buyTrades.push(tradeAnnotation);
                } else {
                    sellTrades.push(tradeAnnotation);
                }
            }
        });

        return { buyTrades, sellTrades };
    };

    const filterEquityCurve = (equityCurve: { date: string; pnl: number }[], filter: TimeFilter) => {
        if (!filter.days) return equityCurve;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filter.days);

        return equityCurve.filter(point => new Date(point.date) >= cutoffDate);
    };

    const filterTradeAnnotations = (
        annotations: TradeAnnotation[],
        filter: TimeFilter
    ) => {
        if (!filter.days) return annotations;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filter.days);

        return annotations.filter(annotation =>
            new Date(annotation.x) >= cutoffDate
        );
    };

    const currentFilter = TIME_FILTERS.find(f => f.key === activeFilter) || TIME_FILTERS[TIME_FILTERS.length - 1];
    const filteredEquityCurve = data ? filterEquityCurve(data.equityCurve, currentFilter) : [];

    // Create equity map and trade annotations
    const equityMap = createEquityMap(filteredEquityCurve);
    const { buyTrades, sellTrades } = createTradeAnnotations(trades, equityMap);

    // Filter trade annotations by time period
    const filteredBuyTrades = filterTradeAnnotations(buyTrades, currentFilter);
    const filteredSellTrades = filterTradeAnnotations(sellTrades, currentFilter);

    const chartData = {
        datasets: [
            {
                label: 'Cumulative P/L (€)',
                data: filteredEquityCurve.map((d, index) => ({
                    x: d.date,
                    y: d.pnl,
                })),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.1,
                type: 'line' as const,
                showLine: true,
            },
            {
                label: 'Buy Orders',
                data: filteredBuyTrades.map(trade => ({
                    x: trade.x,
                    y: trade.y,
                })),
                pointStyle: 'triangle',
                pointBackgroundColor: '#10B981',
                pointBorderColor: '#059669',
                pointBorderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 12,
                type: 'scatter' as const,
                showLine: false,
            },
            {
                label: 'Sell Orders',
                data: filteredSellTrades.map(trade => ({
                    x: trade.x,
                    y: trade.y,
                })),
                pointStyle: 'rectRot',
                pointBackgroundColor: '#EF4444',
                pointBorderColor: '#DC2626',
                pointBorderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 12,
                type: 'scatter' as const,
                showLine: false,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                labels: {
                    color: '#d1d5db',
                    usePointStyle: true,
                },
            },
            tooltip: {
                callbacks: {
                    title: function(context: any[]) {
                        const dataIndex = context[0].dataIndex;
                        const datasetIndex = context[0].datasetIndex;

                        if (datasetIndex === 0) {
                            // Equity curve tooltip
                            return `Date: ${context[0].label}`;
                        } else {
                            // Trade annotation tooltip
                            const tradeData = datasetIndex === 1
                                ? filteredBuyTrades[dataIndex]?.trade
                                : filteredSellTrades[dataIndex]?.trade;

                            if (tradeData) {
                                return `${tradeData.side} ${tradeData.symbol}`;
                            }
                        }
                        return context[0].label;
                    },
                    label: function(context: any) {
                        const datasetIndex = context.datasetIndex;

                        if (datasetIndex === 0) {
                            // Equity curve
                            return `P/L: €${context.parsed.y.toFixed(2)}`;
                        } else {
                            // Trade annotation
                            const dataIndex = context.dataIndex;
                            const tradeData = datasetIndex === 1
                                ? filteredBuyTrades[dataIndex]?.trade
                                : filteredSellTrades[dataIndex]?.trade;

                            if (tradeData) {
                                return [
                                    `Quantity: ${Math.abs(tradeData.quantity)}`,
                                    `Price: €${tradeData.price.toFixed(2)}`,
                                    `P/L: €${tradeData.pnl.toFixed(2)}`,
                                ];
                            }
                        }
                        return '';
                    },
                },
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x' as const,
                    threshold: 10,
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: 'x' as const,
                },
            },
        },
        scales: {
            y: {
                ticks: {
                    color: '#d1d5db',
                    callback: function(value: any) {
                        return '€' + value.toFixed(0);
                    }
                }
            },
            x: {
                ticks: {
                    color: '#d1d5db'
                }
            },
        },
    };

    return (
        <div className="text-white p-6 space-y-6">
            <h1 className="text-3xl font-bold">Performance Analytics</h1>

            <StatefulContainer
                isLoading={isLoading}
                error={error}
                data={data}
                emptyStateMessage="No trades have been made yet. No data to analyze."
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard title="Total Net P/L" value={`€${data?.totalPnl?.toFixed(2) || '0.00'}`} icon={<DollarSign />} color={data?.totalPnl && data.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} />
                        <KpiCard title="Win Rate" value={`${data?.winRate?.toFixed(1) || '0.0'}%`} icon={<Percent />} />
                        <KpiCard title="Profit Factor" value={data?.profitFactor?.toFixed(2) || '0.00'} icon={<Divide />} />
                        <KpiCard title="Total Trades" value={data?.totalTrades?.toString() || '0'} icon={<TrendingUp />} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <KpiCard title="Average Winning Trade" value={`€${data?.avgWin?.toFixed(2) || '0.00'}`} icon={<CheckCircle className="text-green-400"/>} />
                        <KpiCard title="Average Losing Trade" value={`€${data?.avgLoss?.toFixed(2) || '0.00'}`} icon={<XCircle className="text-red-400"/>} />
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Equity Curve</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetZoom}
                                className="flex items-center gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset Zoom
                            </Button>
                        </div>

                        <TimeFilterButtons
                            activeFilter={activeFilter}
                            onFilterChange={handleFilterChange}
                        />

                        <div className="h-96">
                            <Chart
                                ref={chartRef}
                                type="line"
                                data={chartData}
                                options={chartOptions}
                            />
                        </div>

                        <div className="mt-2 text-sm text-gray-400">
                            💡 Tip: Use mouse wheel to zoom, drag to pan, or use time filters above
                        </div>
                    </div>

                    {/* Phase 3: Additional Analytical Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Monthly P/L Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Monthly P/L</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {monthlyPnl ? (
                                    <MonthlyPnlChart data={monthlyPnl} />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-400">
                                        No data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Win Rate Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Win Rate Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {winRateBreakdown ? (
                                    <WinRateChart data={winRateBreakdown} />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-400">
                                        No data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Drawdown Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Drawdown Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {drawdown ? (
                                    <DrawdownChart data={drawdown} />
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-400">
                                        No data available
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </StatefulContainer>
        </div>
    );
}
