"use client";

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useDashboard } from '@/context/DashboardContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function Chart() {
    const { state } = useDashboard();
    const { selectedSymbol } = state;
    const [chartData, setChartData] = useState<any>({
        labels: [],
        datasets: [],
    });

    useEffect(() => {
        async function fetchChartData() {
            if (!selectedSymbol) return;
            try {
                const response = await fetch(`/api/chart-data?symbol=${selectedSymbol}`);
                const data = await response.json();
                
                const labels = data.map((d: any) => new Date(d.time * 1000).toLocaleDateString());
                const prices = data.map((d: any) => d.close);

                setChartData({
                    labels,
                    datasets: [
                        {
                            label: `${selectedSymbol} Price`,
                            data: prices,
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        },
                    ],
                });
            } catch (error) {
                console.error("Failed to fetch chart data", error);
            }
        }
        fetchChartData();
    }, [selectedSymbol]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                ticks: {
                    color: '#d1d5db',
                },
            },
            x: {
                ticks: {
                    color: '#d1d5db',
                },
            },
        },
    };

    return (
        <div className="h-[400px]">
            <Line data={chartData} options={options} />
        </div>
    );
}
