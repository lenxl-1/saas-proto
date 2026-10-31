import React from 'react';

export interface HealthBreakdownItem {
  id: number;
  label: string;
  count: number;
  color: string;
}

interface SubscriptionHealthBreakdownProps {
  items: HealthBreakdownItem[];
  total: number;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

export const SubscriptionHealthBreakdown: React.FC<SubscriptionHealthBreakdownProps> = ({
  items,
  total,
  hoveredIndex,
  onHoverIndex,
}) => {
  return (
    <div className="space-y-1.5 pt-3 border-t border-neutral-100 dark:border-white/[0.06]">
      {items.map((item) => {
        const isHovered = hoveredIndex === item.id;
        const isDimmed = hoveredIndex !== null && hoveredIndex !== item.id;
        const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';

        return (
          <div
            key={item.label}
            onMouseEnter={() => onHoverIndex(item.id)}
            onMouseLeave={() => onHoverIndex(null)}
            className={`group flex items-center justify-between py-1 px-1.5 rounded-md transition-all duration-150 cursor-pointer ${
              isHovered
                ? 'bg-neutral-50 dark:bg-[#161616] text-[#18181B] dark:text-[#F5F5F5]'
                : 'hover:bg-neutral-50/60 dark:hover:bg-white/[0.02]'
            } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
          >
            {/* Left: Dot + Status label */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] truncate group-hover:text-[#18181B] dark:group-hover:text-[#F5F5F5] transition-colors">
                {item.label}
              </span>
            </div>

            {/* Right: Count (bold) + Percentage (compact muted) */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-semibold font-mono tabular-nums text-[#18181B] dark:text-[#F5F5F5]">
                {item.count.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-mono text-[#A1A1AA] dark:text-[#71717A] w-11 text-right tabular-nums">
                {percentage}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
