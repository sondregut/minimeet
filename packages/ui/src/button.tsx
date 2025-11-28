import * as React from 'react';
import { cn } from './utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary:
    'bg-gradient-to-br from-primary-dark to-primary text-white shadow-sm hover:from-primary hover:to-primary-light hover:shadow-md focus:ring-primary/20',
  secondary:
    'border border-border bg-background-secondary text-primary hover:bg-background-tertiary hover:border-border-dark focus:ring-primary/10',
  accent:
    'bg-gradient-to-br from-accent-dark to-accent text-white shadow-sm hover:from-accent hover:to-accent-light hover:shadow-md focus:ring-accent/20',
  ghost: 'text-primary hover:bg-primary/5 focus:ring-primary/10',
  destructive:
    'bg-error text-white shadow-sm hover:bg-error/90 focus:ring-error/20',
};

const sizeStyles = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-3 text-base',
  lg: 'px-7 py-4 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
