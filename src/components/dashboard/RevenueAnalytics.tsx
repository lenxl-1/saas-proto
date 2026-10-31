import React, { useState } from 'react';
import { RevenuePeriod, RevenuePeriodSelector } from './RevenuePeriodSelector';
import { RevenueMetricItem, RevenueMetrics, RevenueSeriesKey } from './RevenueMetrics';
import { RevenueChart } from './RevenueChart';
import { formatINRCompact } from '../../lib/formatters';

interface RevenueAnalyticsProps {
  mrr: number;
  dateRange: RevenuePeriod;
  onSelectDateRange: (range: RevenuePeriod) => void;
  isDark: boolean;
}

export const RevenueAnalytics: React.FC<RevenueAnalyticsProps> = ({
  mrr,
  dateRange,
  onSelectDateRange,
  isDark,
}) => {
  const [activeSeries, setActiveSeries] = useState<RevenueSeriesKey | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<RevenueSeriesKey, boolean>>({
    MRR: true,
    'New Revenue': true,
    Churn: true,
  });

  // Calculate dynamic metrics relative to active MRR
  const mrrValue = mrr > 0 ? mrr : 1842000;
  const newRevenueValue = Math.round(mrrValue * 0.15);
  const churnValue = Math.round(mrrValue * 0.03);

  const metricItems: RevenueMetricItem[] = [
    {
      key: 'MRR',
      label: 'MRR',
      value: mrrValue,
      formattedValue: formatINRCompact(mrrValue),
      trend: 'up',
      trendPercent: '+8.4%',
      color: '#6366F1',
    },
    {
      key: 'New Revenue',
      label: 'New Revenue',
      value: newRevenueValue,
      formattedValue: formatINRCompact(newRevenueValue),
      trend: 'up',
      trendPercent: '+12.1%',
      color: '#10B981',
    },
    {
      key: 'Churn',
      label: 'Churn',
      value: churnValue,
      formattedValue: formatINRCompact(churnValue),
      trend: 'down',
      trendPercent: '-3.2%',
      color: isDark ? '#A1A1AA' : '#71717A',
    },
  ];

  const handleToggleSeries = (key: RevenueSeriesKey) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="bg-white dark:bg-[#111111] border border-[#EAEAEA] dark:border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs transition-colors duration-150">
      {/* 1. Top row: Header + Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A] block">
            Performance
          </span>
          <h2 className="text-sm sm:text-base font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight">
            Revenue
          </h2>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
            Recurring revenue performance
          </p>
        </div>

        <RevenuePeriodSelector
          selectedPeriod={dateRange}
          onSelectPeriod={onSelectDateRange}
        />
      </div>

      {/* 2. Compact interactive metric/legend row */}
      <RevenueMetrics
        metrics={metricItems}
        activeSeries={activeSeries}
        onHoverSeries={setActiveSeries}
        visibleSeries={visibleSeries}
        onToggleSeries={handleToggleSeries}
      />

      {/* 3. Modernized Chart Canvas */}
      <RevenueChart
        dateRange={dateRange}
        mrrBase={mrrValue}
        isDark={isDark}
        activeSeries={activeSeries}
        visibleSeries={visibleSeries}
      />
    </div>
  );
};
