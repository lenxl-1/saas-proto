import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'sm',
      icon,
      iconPosition = 'left',
      isLoading = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none shrink-0 whitespace-nowrap cursor-pointer';

    const sizeStyles = {
      xs: 'text-[11px] h-7 px-2.5 rounded-md gap-1.5',
      sm: 'text-xs h-8 px-3 rounded-lg gap-1.5',
      md: 'text-sm h-9 px-4 rounded-lg gap-2',
      lg: 'text-sm h-10 px-5 rounded-lg gap-2',
    };

    const variantStyles = {
      primary:
        'bg-[#171717] hover:bg-[#262626] text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-[#0A0A0A] shadow-xs active:scale-[0.99]',
      secondary:
        'bg-white hover:bg-neutral-50 dark:bg-[#111111] dark:hover:bg-[#1A1A1A] text-[#171717] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#262626] shadow-2xs active:scale-[0.99]',
      outline:
        'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#262626]',
      subtle:
        'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[#171717] dark:text-[#F5F5F5]',
      danger:
        'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200/60 dark:border-red-900/60',
      ghost:
        'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#737373] hover:text-[#171717] dark:text-[#A3A3A3] dark:hover:text-[#F5F5F5]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
