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

// Subtle, squared-off status chips with a hairline border (tinted bg + matching
// border + text). Squared by default (not pill) and no decorative pulse — colour
// is used for utility only.
const styles: Record<Variant, string> = {
  default: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-[#28282d] dark:text-[#9999a8] dark:border-[#38383f]",
  brand:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#28282d] dark:text-[#9999a8] dark:border-[#38383f]",
  portal:  "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  danger:  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  info:    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-[#28282d] dark:text-[#9999a8] dark:border-[#38383f]",
  neutral: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-[#28282d] dark:text-[#9999a8] dark:border-[#38383f]",
};

const dotColors: Record<Variant, string> = {
  default: "bg-slate-400",
  brand:   "bg-brand-500",
  portal:  "bg-portal-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-rose-500",
  info:    "bg-sky-500",
  neutral: "bg-slate-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
  /** Pulsing dot — opt-in only, for genuinely live signals. */
  pulse?: boolean;
  /** Fully-rounded pill shape — opt-in. Default is a squared chip. */
  pill?: boolean;
}

export function Badge({ className, variant = "default", dot, pulse, pill, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-[11px] font-medium leading-none transition-colors duration-150",
        pill ? "rounded-full px-2" : "rounded",
        styles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", dotColors[variant])} />
          )}
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}
