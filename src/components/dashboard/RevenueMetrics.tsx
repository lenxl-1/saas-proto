import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatINRCompact } from '../../lib/formatters';

export type RevenueSeriesKey = 'MRR' | 'New Revenue' | 'Churn';

export interface RevenueMetricItem {
  key: RevenueSeriesKey;
  label: string;
  value: number;
  formattedValue?: string;
  trend: 'up' | 'down';
  trendPercent: string;
  color: string;
}

interface RevenueMetricsProps {
  metrics: RevenueMetricItem[];
  activeSeries: RevenueSeriesKey | null;
  onHoverSeries: (series: RevenueSeriesKey | null) => void;
  visibleSeries: Record<RevenueSeriesKey, boolean>;
  onToggleSeries?: (series: RevenueSeriesKey) => void;
}

export const RevenueMetrics: React.FC<RevenueMetricsProps> = ({
  metrics,
  activeSeries,
  onHoverSeries,
  visibleSeries,
  onToggleSeries,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 py-3 border-y border-neutral-100 dark:border-white/[0.06]">
      {metrics.map((item) => {
        const isHovered = activeSeries === item.key;
        const isDimmed = activeSeries !== null && activeSeries !== item.key;
        const isVisible = visibleSeries[item.key] ?? true;

        return (
          <div
            key={item.key}
            onMouseEnter={() => onHoverSeries(item.key)}
            onMouseLeave={() => onHoverSeries(null)}
            onClick={() => onToggleSeries?.(item.key)}
            className={`group relative flex flex-col p-2.5 rounded-lg transition-all duration-150 cursor-pointer border ${
              isHovered
                ? 'bg-neutral-50 dark:bg-[#161616] border-neutral-300/80 dark:border-white/[0.16] shadow-2xs'
                : 'bg-transparent border-transparent hover:bg-neutral-50/70 dark:hover:bg-white/[0.03]'
            } ${isDimmed || !isVisible ? 'opacity-40' : 'opacity-100'}`}
          >
            {/* Top row: Indicator dot + Label + Trend badge */}
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] truncate group-hover:text-[#18181B] dark:group-hover:text-[#F5F5F5] transition-colors">
                  {item.label}
                </span>
              </div>

              {/* Minimal trend indicator */}
              <div
                className={`flex items-center gap-0.5 text-[10px] font-mono font-medium ${
                  item.trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {item.trend === 'up' ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                <span>{item.trendPercent}</span>
              </div>
            </div>

            {/* Bottom value: Crisp tabular numeral */}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-semibold font-mono tabular-nums tracking-tight text-[#18181B] dark:text-[#F5F5F5]">
                {item.formattedValue || formatINRCompact(item.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
