import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "portal";
type Size = "sm" | "md" | "lg" | "icon";

// Flat, crisp buttons. No floating lift, no coloured ambient glow, no bounce —
// hover is a precise background/border shift; press is a subtle darken.
const variants: Record<Variant, string> = {
  primary:
    "bg-[#3b82f6] hover:bg-[#2563eb] active:bg-[#1d4ed8] text-white focus-visible:ring-[#3b82f6]",
  portal:
    "bg-portal-600 hover:bg-portal-700 active:bg-portal-800 text-white focus-visible:ring-portal-500",
  secondary:
    "bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900",
  outline:
    "border border-slate-200 dark:border-[#2a2a30] bg-white dark:bg-[#28282d] text-slate-700 dark:text-[#9999a8] hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-[#38383f] dark:hover:border-[#38383f]",
  ghost:
    "text-slate-600 dark:text-[#9999a8] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-[#28282d] dark:hover:text-white active:bg-slate-200 dark:active:bg-[#38383f]",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus-visible:ring-rose-500",
};

const sizes: Record<Size, string> = {
  sm:   "min-h-11 px-3 text-xs gap-1.5 sm:min-h-9",
  md:   "min-h-11 px-3.5 text-[13px] gap-1.5",
  lg:   "min-h-12 px-4 text-sm gap-2",
  icon: "h-11 w-11 p-0",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-colors duration-150 touch-manipulation",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#161618]",
        "cursor-pointer select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
