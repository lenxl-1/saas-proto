import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  comparison?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  secondaryText?: string;
  subtext?: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  comparison,
  trend,
  trendValue,
  secondaryText,
  subtext,
  description,
  icon,
  onClick,
  className = '',
}) => {
  const displayDescription = description || secondaryText || subtext;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded-xl p-4 sm:p-4.5 transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-white/[0.18] hover:bg-neutral-50/40 dark:hover:bg-[#141414] hover:shadow-2xs active:scale-[0.99]'
          : ''
      } ${className}`}
    >
      {/* 1. Small label + optional icon or action indicator */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-[11px] font-medium tracking-tight text-[#71717A] dark:text-[#A1A1AA]">
          {label}
        </span>
        {icon && (
          <span className="text-[#A1A1AA] dark:text-[#71717A] group-hover:text-[#18181B] dark:group-hover:text-[#F5F5F5] transition-colors">
            {icon}
          </span>
        )}
      </div>

      {/* 2. Large primary number */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-[28px] font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight tabular-nums font-mono">
          {value}
        </div>

        {/* 3. Subtle change indicator */}
        {(trendValue || comparison) && (
          <div className="flex items-center gap-0.5 text-[11px] font-mono font-medium shrink-0">
            {trend === 'up' && (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                <span>{trendValue}</span>
              </span>
            )}
            {trend === 'down' && (
              <span className="inline-flex items-center text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                <span>{trendValue}</span>
              </span>
            )}
            {comparison && (
              <span className="text-[#A1A1AA] dark:text-[#71717A] ml-1 hidden xs:inline text-[10px]">
                {comparison}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Small contextual description */}
      {displayDescription && (
        <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-white/[0.06] text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate">
          {displayDescription}
        </div>
      )}
    </div>
  );
};
