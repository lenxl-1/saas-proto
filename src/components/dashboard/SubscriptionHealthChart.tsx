import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import '../../lib/chartConfig';

export interface HealthDataCounts {
  active: number;
  trial: number; // Renewing this month
  expiring: number;
  paused: number;
}

interface SubscriptionHealthChartProps {
  counts: HealthDataCounts;
  total: number;
  isDark: boolean;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

export const SubscriptionHealthChart: React.FC<SubscriptionHealthChartProps> = ({
  counts,
  total,
  isDark,
  hoveredIndex,
  onHoverIndex,
}) => {
  const chartData: ChartData<'doughnut'> = useMemo(() => {
    // 4 standard segments specified in Section 16 & 7:
    // Active, Renewing this month, Expiring soon, Paused
    const colors = [
      '#10B981', // Emerald - Active
      '#6366F1', // Indigo - Renewing this month
      '#F43F5E', // Rose - Expiring soon
      '#F59E0B', // Amber - Paused
    ];

    const backgroundColors = colors.map((col, idx) => {
      if (hoveredIndex === null) return col;
      return hoveredIndex === idx ? col : isDark ? `${col}40` : `${col}4D`;
    });

    return {
      labels: ['Active', 'Renewing this month', 'Expiring soon', 'Paused'],
      datasets: [
        {
          data: [counts.active, counts.trial, counts.expiring, counts.paused],
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: isDark ? '#111111' : '#FFFFFF',
          hoverBorderColor: isDark ? '#111111' : '#FFFFFF',
          hoverOffset: 4,
          borderRadius: 2,
        },
      ],
    };
  }, [counts, isDark, hoveredIndex]);

  const options: ChartOptions<'doughnut'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      animation: {
        duration: 350,
      },
      onHover: (_evt, elements) => {
        if (elements && elements.length > 0) {
          onHoverIndex(elements[0].index);
        } else {
          onHoverIndex(null);
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: isDark ? '#161616' : '#FFFFFF',
          titleColor: isDark ? '#F5F5F5' : '#18181B',
          bodyColor: isDark ? '#A1A1AA' : '#71717A',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#EAEAEA',
          borderWidth: 1,
          padding: 8,
          cornerRadius: 6,
          titleFont: {
            size: 11,
            family: 'Inter, sans-serif',
            weight: 600,
          },
          bodyFont: {
            size: 11,
            family: 'JetBrains Mono, monospace',
          },
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${val.toLocaleString('en-IN')} (${pct}%)`;
            },
          },
        },
      },
    };
  }, [isDark, onHoverIndex, total]);

  return (
    <div className="relative w-full h-40 sm:h-44 flex items-center justify-center my-1">
      <Doughnut data={chartData} options={options} />

      {/* Center of the donut display total */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#18181B] dark:text-[#F5F5F5] tabular-nums">
          {total.toLocaleString('en-IN')}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
          Subscriptions
        </span>
      </div>
    </div>
  );
};
