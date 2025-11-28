import * as React from 'react';
import { cn } from './utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium',
          error ? 'text-error' : 'text-foreground-secondary',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label error={!!error} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
