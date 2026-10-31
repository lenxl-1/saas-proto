import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import '../../lib/chartConfig';
import { formatINR, formatINRCompact } from '../../lib/formatters';
import { RevenuePeriod } from './RevenuePeriodSelector';
import { RevenueSeriesKey } from './RevenueMetrics';

interface RevenueChartProps {
  dateRange: RevenuePeriod;
  mrrBase: number;
  isDark: boolean;
  activeSeries: RevenueSeriesKey | null;
  visibleSeries: Record<RevenueSeriesKey, boolean>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  dateRange,
  mrrBase,
  isDark,
  activeSeries,
  visibleSeries,
}) => {
  const chartData: ChartData<'line'> = useMemo(() => {
    const rangeLabels: Record<RevenuePeriod, string[]> = {
      '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      '30D': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      '3M': ['Aug', 'Sep', 'Oct'],
      '6M': ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      '12M': ['Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep', 'Oct'],
    };

    const labels = rangeLabels[dateRange] || rangeLabels['30D'];

    // Smooth curves computed dynamically from active MRR baseline
    const base = mrrBase > 0 ? mrrBase : 1842000;
    const mrrTrend = labels.map((_, i) =>
      Math.round(base * (0.86 + (i / labels.length) * 0.18 + Math.sin(i * 0.8) * 0.02))
    );
    const newRevenueTrend = labels.map((_, i) =>
      Math.round(base * 0.15 * (0.92 + (i % 2 === 0 ? 0.12 : -0.06)))
    );
    const churnTrend = labels.map((_, i) =>
      Math.round(base * 0.03 * (0.85 + (i % 3 === 0 ? 0.15 : -0.08)))
    );

    // Determine visual focus for MRR
    const isMrrDimmed = activeSeries !== null && activeSeries !== 'MRR';
    const isMrrHighlighted = activeSeries === 'MRR';

    // Determine visual focus for New Revenue
    const isNewRevDimmed = activeSeries !== null && activeSeries !== 'New Revenue';
    const isNewRevHighlighted = activeSeries === 'New Revenue';

    // Determine visual focus for Churn
    const isChurnDimmed = activeSeries !== null && activeSeries !== 'Churn';
    const isChurnHighlighted = activeSeries === 'Churn';

    return {
      labels,
      datasets: [
        {
          label: 'MRR',
          data: mrrTrend,
          borderColor: isMrrDimmed
            ? isDark
              ? 'rgba(99, 102, 241, 0.2)'
              : 'rgba(99, 102, 241, 0.25)'
            : '#6366F1',
          backgroundColor: isDark
            ? isMrrDimmed
              ? 'rgba(99, 102, 241, 0.01)'
              : 'rgba(99, 102, 241, 0.05)'
            : isMrrDimmed
            ? 'rgba(99, 102, 241, 0.01)'
            : 'rgba(99, 102, 241, 0.03)',
          fill: true,
          tension: 0.38,
          borderWidth: isMrrHighlighted ? 2.5 : 1.75,
          pointRadius: isMrrHighlighted ? 3 : 0,
          pointHoverRadius: 4.5,
          pointBackgroundColor: '#6366F1',
          pointBorderColor: isDark ? '#111111' : '#FFFFFF',
          pointBorderWidth: 2,
          hidden: !visibleSeries['MRR'],
        },
        {
          label: 'New Revenue',
          data: newRevenueTrend,
          borderColor: isNewRevDimmed
            ? isDark
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(16, 185, 129, 0.25)'
            : '#10B981',
          backgroundColor: 'transparent',
          borderDash: [3, 3],
          tension: 0.38,
          borderWidth: isNewRevHighlighted ? 2.25 : 1.5,
          pointRadius: isNewRevHighlighted ? 3 : 0,
          pointHoverRadius: 4.5,
          pointBackgroundColor: '#10B981',
          pointBorderColor: isDark ? '#111111' : '#FFFFFF',
          pointBorderWidth: 2,
          hidden: !visibleSeries['New Revenue'],
        },
        {
          label: 'Churn',
          data: churnTrend,
          borderColor: isChurnDimmed
            ? isDark
              ? 'rgba(161, 161, 170, 0.2)'
              : 'rgba(113, 113, 122, 0.25)'
            : isDark
            ? '#A1A1AA'
            : '#71717A',
          backgroundColor: 'transparent',
          tension: 0.38,
          borderWidth: isChurnHighlighted ? 2.25 : 1.5,
          pointRadius: isChurnHighlighted ? 3 : 0,
          pointHoverRadius: 4.5,
          pointBackgroundColor: isDark ? '#A1A1AA' : '#71717A',
          pointBorderColor: isDark ? '#111111' : '#FFFFFF',
          pointBorderWidth: 2,
          hidden: !visibleSeries['Churn'],
        },
      ],
    };
  }, [dateRange, mrrBase, isDark, activeSeries, visibleSeries]);

  const options: ChartOptions<'line'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 350,
        easing: 'easeOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false, // We use the interactive Peec-inspired RevenueMetrics as our legend
        },
        tooltip: {
          enabled: true,
          backgroundColor: isDark ? '#161616' : '#FFFFFF',
          titleColor: isDark ? '#F5F5F5' : '#18181B',
          bodyColor: isDark ? '#A1A1AA' : '#71717A',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#EAEAEA',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          cornerRadius: 8,
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
            title: (items) => {
              const label = items[0]?.label || '';
              return `Period: ${label}`;
            },
            label: (ctx) => {
              const val = Number(ctx.raw);
              const label = ctx.dataset.label || '';
              return `  ${label.padEnd(12, ' ')} ${formatINR(val)}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => formatINRCompact(Number(v)),
            font: { size: 10, family: 'JetBrains Mono, monospace' },
            color: isDark ? '#71717A' : '#A1A1AA',
            maxTicksLimit: 5,
            padding: 8,
          },
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
            lineWidth: 1,
          },
          border: {
            display: false,
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 10, family: 'Inter, sans-serif' },
            color: isDark ? '#71717A' : '#A1A1AA',
            padding: 6,
          },
          border: {
            display: false,
          },
        },
      },
    };
  }, [isDark]);

  return (
    <div className="w-full h-56 sm:h-64 mt-3">
      <Line data={chartData} options={options} />
    </div>
  );
};
