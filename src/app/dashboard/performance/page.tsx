"use client";

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { LoaderCircle, TrendingUp, TrendingDown, Shield, BarChart2 } from 'lucide-react';
import { MetricCard } from '../../../components/MetricCard';
import { InsightsHistoryPanel } from '../../../components/InsightsHistoryPanel';
import { InsightModal } from '../../../components/InsightModal';
import { Button } from '../../../components/ui/button';

// Dynamically import chart components to avoid SSR issues
const EquityCurveChart = dynamic(() => import('../../../components/EquityCurveChart'), {
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center"><LoaderCircle className="animate-spin" /></div>
});

interface PerformanceData {
    totalReturnPercent: number;
    sharpeRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
    equityCurve: { date: string; value: number }[];
}

export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('ALL');

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/performance-analytics');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch performance data.');
                }
                const result = await response.json();
                if (result.message) {
                    setData(null);
                } else {
                    setData(result);
                }
            } catch (error) {
                toast.error((error as Error).message);
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredEquityCurve = useMemo(() => {
        if (!data?.equityCurve) return [];
        if (timeRange === 'ALL') return data.equityCurve;

        const now = new Date();
        const getStartDate = (months: number) => new Date(now.getFullYear(), now.getMonth() - months, now.getDate());

        let startDate: Date;
        if (timeRange === '1M') startDate = getStartDate(1);
        else if (timeRange === '3M') startDate = getStartDate(3);
        else if (timeRange === '6M') startDate = getStartDate(6);
        else if (timeRange === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);
        else startDate = new Date(0); // fallback, should not happen

        return data.equityCurve.filter((d: { date: string; value: number }) => new Date(d.date) >= startDate);
    }, [data, timeRange]);

    const chartData = {
        labels: filteredEquityCurve.map((d: { date: string; value: number }) => d.date),
        datasets: [{
            label: 'Portfolio Value (€)',
            data: filteredEquityCurve.map((d: { date: string; value: number }) => d.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.1,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Portfolio Equity Curve',
            },
            zoom: {
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: 'xy' as const,
                },
                pan: {
                    enabled: true,
                    mode: 'xy' as const,
                },
            },
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date',
                },
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Portfolio Value (€)',
                },
            },
        },
    };

    if (isLoading) return <div className="text-white text-center p-8"><LoaderCircle className="animate-spin" /></div>;
    if (!data) return <div className="text-white text-center p-8">Not enough trades to calculate performance metrics.</div>;

    return (
        <div className="text-white p-6 space-y-6">
            <h1 className="text-3xl font-bold">The Analyst's Cockpit</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Total Return" value={`${data.totalReturnPercent.toFixed(2)}%`} icon={<TrendingUp />} helpTopicId="total-return" />
                <MetricCard title="Sharpe Ratio" value={data.sharpeRatio.toFixed(2)} icon={<BarChart2 />} helpTopicId="sharpe-ratio" />
                <MetricCard title="Max Drawdown" value={`${data.maxDrawdown.toFixed(2)}%`} icon={<TrendingDown />} helpTopicId="max-drawdown" />
                <MetricCard title="Calmar Ratio" value={data.calmarRatio.toFixed(2)} icon={<Shield />} helpTopicId="calmar-ratio" />
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Portfolio Equity Curve</h2>
                    <div className="flex gap-2">
                        {['1M', '3M', '6M', 'YTD', 'ALL'].map(range => (
                            <Button key={range} variant={timeRange === range ? 'default' : 'secondary'} size="sm" onClick={() => setTimeRange(range)}>{range}</Button>
                        ))}
                    </div>
                </div>
                <div className="h-96">
                    <EquityCurveChart
                        data={filteredEquityCurve}
                        timeRange={timeRange}
                    />
                </div>
            </div>

            <InsightsHistoryPanel onShowEvidence={setSelectedInsightId} />

            <InsightModal insightId={selectedInsightId} onClose={() => setSelectedInsightId(null)} />
        </div>
    );
}
