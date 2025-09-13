import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MonthlyPnlData {
  labels: string[];
  data: number[];
}

interface MonthlyPnlChartProps {
  data: MonthlyPnlData;
}

export default function MonthlyPnlChart({ data }: MonthlyPnlChartProps) {
  // Generate colors based on P/L values
  const backgroundColors = data.data.map(value =>
    value >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
  );

  const borderColors = data.data.map(value =>
    value >= 0 ? 'rgb(21, 128, 61)' : 'rgb(185, 28, 28)'
  );

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Monthly P/L (€)',
        data: data.data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
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
          label: function(context: any) {
            return `P/L: €${context.parsed.y.toFixed(2)}`;
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
            return '€' + value.toFixed(0);
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
      },
      x: {
        ticks: {
          color: '#d1d5db',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
