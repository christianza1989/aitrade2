import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Chart.js components to avoid SSR issues
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center">Loading chart...</div>
});

interface EquityCurveChartProps {
    data: { date: string; value: number }[];
    timeRange: string;
}

// Create a client-side only chart component
function ChartComponent({ data, timeRange }: EquityCurveChartProps) {
    const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        // Dynamically import and register Chart.js on client side only
        const initChart = async () => {
            const ChartJS = (await import('chart.js')).Chart;
            const { CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } = await import('chart.js');
            const zoomPlugin = (await import('chartjs-plugin-zoom')).default;
            const { Line } = await import('react-chartjs-2');

            ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

            setChartComponent(() => Line);
        };

        initChart();
    }, []);

    const handleResetZoom = () => {
        if (chartRef.current) {
            chartRef.current.resetZoom();
        }
    };

    const chartData = {
        labels: data.map((d) => d.date),
        datasets: [{
            label: 'Portfolio Value (€)',
            data: data.map((d) => d.value),
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

    if (!ChartComponent) {
        return <div className="h-96 flex items-center justify-center">Loading chart...</div>;
    }

    return (
        <div className="relative">
            <ChartComponent ref={chartRef} data={chartData} options={chartOptions} />
            <button
                onClick={handleResetZoom}
                className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
                Reset Zoom
            </button>
        </div>
    );
}

export default function EquityCurveChart(props: EquityCurveChartProps) {
    return <ChartComponent {...props} />;
}
