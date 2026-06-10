"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";

interface ProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md";
}

export function Progress({ value, className, barClassName, size = "md" }: ProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayValue(Math.min(100, Math.max(0, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        size === "sm" ? "h-1.5" : "h-2",
        className
      )}
      role="progressbar"
      aria-valuenow={displayValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-700 ease-out",
          barClassName
        )}
        style={{ width: `${displayValue}%` }}
      />
    </div>
  );
}
