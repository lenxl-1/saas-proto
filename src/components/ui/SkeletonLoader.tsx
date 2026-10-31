import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-neutral-200/70 dark:bg-neutral-800 rounded-md ${className}`}
  />
);

export const SkeletonRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <div className="flex items-center gap-4 py-3.5 px-4 border-b border-[#F5F5F5] dark:border-[#1F1F1F]">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${
          i === 0 ? 'w-24' : i === 1 ? 'w-36 flex-1' : i === 2 ? 'w-20' : 'w-16'
        }`}
      />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <div className="w-full bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden">
    <div className="flex items-center gap-4 py-3 px-4 bg-neutral-50 dark:bg-neutral-900/50 border-b border-[#E5E5E5] dark:border-[#262626]">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-16" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} columns={columns} />
    ))}
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl space-y-3">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-28" />
  </div>
);
