import { HTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

// Border-driven surface: 8px radius, 1px hairline border, no decorative shadow.
// Structure comes from the border + intentional spacing, not box-shadows.
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-slate-900 dark:text-white tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] text-slate-500 dark:text-slate-400 mt-0.5", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4 border-t border-slate-200 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}
