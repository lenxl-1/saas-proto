import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'sky';
  size?: 'xs' | 'sm';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    neutral:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/60',
    success:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50',
    warning:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50',
    danger:
      'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-800/50',
    accent:
      'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50',
    sky:
      'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50',
  };

  const dotColors = {
    neutral: 'bg-neutral-400 dark:bg-neutral-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    accent: 'bg-indigo-500',
    sky: 'bg-sky-500',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded gap-1',
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium tracking-tight whitespace-nowrap shrink-0 transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
