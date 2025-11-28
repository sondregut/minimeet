import * as React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full rounded-md border bg-background px-4 py-3 text-base',
          'placeholder:text-foreground-muted',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:bg-background-secondary',
          'transition-colors duration-150',
          error
            ? 'border-error focus:border-error focus:ring-error/10'
            : 'border-border focus:border-primary focus:ring-primary/10',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-md border bg-background px-4 py-3 text-base',
          'placeholder:text-foreground-muted',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:bg-background-secondary',
          'transition-colors duration-150 resize-none',
          error
            ? 'border-error focus:border-error focus:ring-error/10'
            : 'border-border focus:border-primary focus:ring-primary/10',
          className
        )}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';
