import React from 'react';
import { Check } from 'lucide-react';
import { SubscriptionStatus } from '../../types';

interface LifecycleStepperProps {
  currentStatus: SubscriptionStatus;
  className?: string;
}

const STAGES: { id: SubscriptionStatus; label: string }[] = [
  { id: 'Draft', label: 'Draft' },
  { id: 'Quotation', label: 'Quotation' },
  { id: 'Confirmed', label: 'Confirmed' },
  { id: 'Active', label: 'Active' },
  { id: 'Closed', label: 'Closed' },
];

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({
  currentStatus,
  className = '',
}) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStatus);

  return (
    <div className={`w-full py-2.5 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#E5E5E5] dark:bg-[#262626] z-0" />
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 dark:bg-indigo-500 z-0 transition-all duration-300"
          style={{
            width: `${Math.max(0, (currentIndex / (STAGES.length - 1)) * 100)}%`,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-200 border-2 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-600 dark:border-indigo-400 ring-4 ring-indigo-500/15'
                    : isPassed
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-[#111111] text-[#A3A3A3] border-[#E5E5E5] dark:border-[#262626]'
                }`}
              >
                {isPassed ? <Check className="w-3 h-3 stroke-[2.5]" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium tracking-tight whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#171717] dark:text-[#F5F5F5] font-semibold'
                    : isPassed
                    ? 'text-[#737373] dark:text-[#A3A3A3]'
                    : 'text-[#A3A3A3] dark:text-[#71717A]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
