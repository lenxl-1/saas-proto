import React from 'react';

export type RevenuePeriod = '7D' | '30D' | '3M' | '6M' | '12M';

interface RevenuePeriodSelectorProps {
  selectedPeriod: RevenuePeriod;
  onSelectPeriod: (period: RevenuePeriod) => void;
}

const PERIODS: RevenuePeriod[] = ['7D', '30D', '3M', '6M', '12M'];

export const RevenuePeriodSelector: React.FC<RevenuePeriodSelectorProps> = ({
  selectedPeriod,
  onSelectPeriod,
}) => {
  return (
    <div
      role="group"
      aria-label="Revenue time range"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-100/90 dark:bg-[#161616] border border-neutral-200/70 dark:border-white/[0.08]"
    >
      {PERIODS.map((period) => {
        const isSelected = selectedPeriod === period;
        return (
          <button
            key={period}
            type="button"
            onClick={() => onSelectPeriod(period)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
              isSelected
                ? 'bg-white dark:bg-[#222222] text-[#18181B] dark:text-[#F5F5F5] shadow-xs font-semibold'
                : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F5] hover:bg-neutral-200/50 dark:hover:bg-white/[0.04]'
            }`}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
};
