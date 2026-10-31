import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-[#111111] border border-dashed border-[#E5E5E5] dark:border-[#262626] rounded-xl ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] flex items-center justify-center mb-4">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
        {title}
      </h3>

      <p className="mt-1.5 text-xs text-[#737373] dark:text-[#A3A3A3] max-w-sm leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex items-center gap-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
