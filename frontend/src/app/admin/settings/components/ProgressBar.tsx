'use client';

import * as React from "react";

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  color?: string;
}

export const ProgressBar = ({
  value,
  max = 100,
  label,
  showValue = true,
  className = "",
  color = "bg-indigo-500",
}: ProgressBarProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`space-y-2 w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-sm font-semibold text-foreground px-1">
          {label && <span>{label}</span>}
          {showValue && <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
        <div
          className={`h-full ${color} transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.2)]`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
