import React from 'react';
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
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface DrawdownData {
  dates: string[];
  values: number[];
  maxDrawdown?: number;
}

interface DrawdownChartProps {
  data: DrawdownData;
}

export default function DrawdownChart({ data }: DrawdownChartProps) {
  const chartData = {
    labels: data.dates,
    datasets: [
      {
        label: 'Drawdown (%)',
        data: data.values,
        borderColor: 'rgb(239, 68, 68)', // Red line
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red fill
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: 'rgb(239, 68, 68)',
        pointRadius: 0, // Hide points by default
        pointHoverRadius: 4, // Show on hover
        pointHoverBackgroundColor: 'rgb(239, 68, 68)',
        pointHoverBorderColor: 'rgb(239, 68, 68)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            return `Date: ${context[0].label}`;
          },
          label: function(context: any) {
            const value = context.parsed.y;
            return `Drawdown: ${value.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#d1d5db',
          callback: function(value: any) {
            return value.toFixed(1) + '%';
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
      },
      x: {
        ticks: {
          color: '#d1d5db',
          maxTicksLimit: 10, // Limit number of x-axis labels
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
}
