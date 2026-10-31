import React, { useState } from 'react';
import {
  HealthDataCounts,
  SubscriptionHealthChart,
} from './SubscriptionHealthChart';
import {
  HealthBreakdownItem,
  SubscriptionHealthBreakdown,
} from './SubscriptionHealthBreakdown';

interface SubscriptionHealthProps {
  counts: HealthDataCounts;
  isDark: boolean;
}

export const SubscriptionHealth: React.FC<SubscriptionHealthProps> = ({
  counts,
  isDark,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = counts.active + counts.trial + counts.expiring + counts.paused;

  const items: HealthBreakdownItem[] = [
    {
      id: 0,
      label: 'Active',
      count: counts.active,
      color: '#10B981', // Emerald
    },
    {
      id: 1,
      label: 'Renewing this month',
      count: counts.trial,
      color: '#6366F1', // Indigo
    },
    {
      id: 2,
      label: 'Expiring soon',
      count: counts.expiring,
      color: '#F43F5E', // Rose
    },
    {
      id: 3,
      label: 'Paused',
      count: counts.paused,
      color: '#F59E0B', // Amber
    },
  ];

  return (
    <div className="bg-white dark:bg-[#111111] border border-[#EAEAEA] dark:border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A] block">
            Health
          </span>
          <h2 className="text-sm sm:text-base font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight">
            Subscription health
          </h2>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
            Lifecycle & retention breakdown
          </p>
        </div>

        <span className="text-[10px] font-mono font-medium text-[#71717A] dark:text-[#A1A1AA] px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200/50 dark:border-white/[0.06]">
          Realtime
        </span>
      </div>

      {/* Donut chart */}
      <SubscriptionHealthChart
        counts={counts}
        total={total}
        isDark={isDark}
        hoveredIndex={hoveredIndex}
        onHoverIndex={setHoveredIndex}
      />

      {/* Compact Breakdown */}
      <SubscriptionHealthBreakdown
        items={items}
        total={total}
        hoveredIndex={hoveredIndex}
        onHoverIndex={setHoveredIndex}
      />
    </div>
  );
};
