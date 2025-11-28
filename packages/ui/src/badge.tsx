import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'live' | 'pb' | 'sb';
}

const variantStyles = {
  default: 'bg-background-tertiary text-foreground-secondary',
  primary: 'bg-primary-muted text-primary-dark',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
  live: 'bg-error-light text-error animate-pulse-live',
  pb: 'bg-success-light text-success',
  sb: 'bg-info-light text-info',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5',
          'text-xs font-semibold tracking-wide',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// Athletics-specific badges
export function PBBadge() {
  return <Badge variant="pb">PB</Badge>;
}

export function SBBadge() {
  return <Badge variant="sb">SB</Badge>;
}

export function LiveBadge() {
  return <Badge variant="live">LIVE</Badge>;
}

export function RecordBadge({ type }: { type: string }) {
  return (
    <Badge variant="warning" className="bg-gold/20 text-amber-700">
      {type}
    </Badge>
  );
}
