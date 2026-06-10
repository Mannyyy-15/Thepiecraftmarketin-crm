import { HTMLAttributes } from "react";
import { cn } from "./cn";

type Variant =
  | "default"
  | "brand"
  | "portal"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const styles: Record<Variant, string> = {
  default:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  brand:
    "bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300",
  portal:
    "bg-portal-50 text-portal-700 dark:bg-portal-500/10 dark:text-portal-300",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  danger:
    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const dotColors: Record<Variant, string> = {
  default: "bg-slate-400",
  brand: "bg-brand-500",
  portal: "bg-portal-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
