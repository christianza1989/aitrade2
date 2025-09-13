import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface WinRateBreakdown {
  winningTrades: {
    count: number;
    totalPnl: number;
  };
  losingTrades: {
    count: number;
    totalPnl: number;
  };
}

interface WinRateChartProps {
  data: WinRateBreakdown;
}

export default function WinRateChart({ data }: WinRateChartProps) {
  const chartData = {
    labels: ['Winning Trades', 'Losing Trades'],
    datasets: [
      {
        data: [data.winningTrades.count, data.losingTrades.count],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // Green for winning
          'rgba(239, 68, 68, 0.8)', // Red for losing
        ],
        borderColor: [
          'rgb(21, 128, 61)', // Dark green border
          'rgb(185, 28, 28)', // Dark red border
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 1)', // Bright green on hover
          'rgba(239, 68, 68, 1)', // Bright red on hover
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#d1d5db',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);

            // Calculate percentage
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

            // Get P/L data based on index
            const pnlData = context.dataIndex === 0
              ? data.winningTrades.totalPnl
              : data.losingTrades.totalPnl;

            return [
              `${label}: ${value} trades (${percentage}%)`,
              `Total P/L: €${pnlData.toFixed(2)}`,
            ];
          },
        },
      },
    },
    cutout: '60%', // Creates a doughnut shape
  };

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
