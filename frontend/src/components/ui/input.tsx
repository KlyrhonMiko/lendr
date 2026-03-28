'use client';

import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-semibold text-foreground px-1">{label}</label>
        )}
        <input
          type={type}
          className={`
            flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm ring-offset-background 
            file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/50 
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary 
            disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm
            ${error ? 'border-destructive ring-destructive/20' : ''}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-destructive px-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-semibold text-foreground px-1">{label}</label>
        )}
        <textarea
          className={`
            flex min-h-[100px] w-full rounded-lg border border-border bg-background px-4 py-3 text-sm ring-offset-background 
            placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring focus-visible:border-primary 
            disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none shadow-sm
            ${error ? 'border-destructive ring-destructive/20' : ''}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-destructive px-1">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
