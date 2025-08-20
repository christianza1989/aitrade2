// src/components/chart.tsx

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

interface Candle {
    time: number;
    close: number;
}

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
    }[];
}

export function Chart() {
    const { state } = useDashboard();
    const { selectedSymbol } = state;
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchChartData() {
            if (!selectedSymbol) return;

            setChartData(null); // Reset chart on new symbol selection
            setError(null);

            try {
                const response = await fetch(`/api/chart-data?symbol=${selectedSymbol}`);
                const data = await response.json();

                // THE FIX IS HERE: Check if the response is an array and not an error object.
                if (response.ok && Array.isArray(data)) {
                    const labels = data.map((d: Candle) => new Date(d.time * 1000).toLocaleDateString());
                    const prices = data.map((d: Candle) => d.close);

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
                } else {
                    // If data is not an array, it's likely an error object
                    throw new Error(data.error || 'Failed to fetch valid chart data.');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                console.error("Failed to fetch chart data:", errorMessage);
                setError(`Could not load chart data for ${selectedSymbol}.`);
            }
        }
        fetchChartData();
    }, [selectedSymbol]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: { ticks: { color: '#d1d5db' } },
            x: { ticks: { color: '#d1d5db' } },
        },
    };

    return (
        <div className="h-[400px] flex items-center justify-center">
            {error && <p className="text-red-400">{error}</p>}
            {!chartData && !error && <p className="text-gray-500">Loading chart...</p>}
            {chartData && <Line data={chartData} options={options} />}
        </div>
    );
}