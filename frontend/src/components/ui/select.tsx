'use client';

import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-sm font-semibold text-foreground px-1">{label}</label>
        )}
        <div className="relative group">
          <select
            className={`
              appearance-none flex h-12 w-full rounded-xl border border-border bg-muted/20 px-4 py-2 text-sm ring-offset-background 
              placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
              focus-visible:ring-primary/50 focus-visible:border-primary 
              disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer
              ${error ? 'border-rose-500 ring-rose-500/50' : ''}
              ${className}
            `}
            ref={ref}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-transform group-focus-within:rotate-180" />
        </div>
        {error && <p className="text-xs text-rose-500 px-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
