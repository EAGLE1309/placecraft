"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressVariant = "blue" | "green" | "purple" | "yellow" | "red";
type ProgressSize = "sm" | "md" | "lg";

const variantStyles: Record<ProgressVariant, string> = {
  blue: "bg-blue-600",
  green: "bg-green-600",
  purple: "bg-purple-600",
  yellow: "bg-yellow-600",
  red: "bg-red-600",
};

const sizeStyles: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  labelFormat?: "percentage" | "value" | "fraction";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "blue",
  size = "md",
  showLabel = false,
  labelFormat = "percentage",
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const formatLabel = () => {
    switch (labelFormat) {
      case "percentage":
        return `${Math.round(percentage)}%`;
      case "value":
        return `${value}`;
      case "fraction":
        return `${value}/${max}`;
      default:
        return `${Math.round(percentage)}%`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && <span className="text-sm min-w-12">{formatLabel()}</span>}
    </div>
  );
}

interface ScoreIndicatorProps {
  score: number;
  max?: number;
  label?: string;
  size?: ProgressSize;
  className?: string;
}

export function ScoreIndicator({
  score,
  max = 100,
  label,
  size = "md",
  className,
}: ScoreIndicatorProps) {
  const getVariant = (): ProgressVariant => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "green";
    if (percentage >= 60) return "blue";
    if (percentage >= 40) return "yellow";
    return "red";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variantStyles[getVariant()]
          )}
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      <span className="text-sm">
        {label ? `${score} ${label}` : score}
      </span>
    </div>
  );
}
