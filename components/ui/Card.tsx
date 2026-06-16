import { HTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[20px] bg-white dark:bg-[#1f1f1f]",
        "shadow-[0_1px_4px_rgba(0,0,0,0.03),_0_6px_20px_rgba(0,0,0,0.05)]",
        "dark:shadow-none dark:border dark:border-[#303030]",
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
        "flex items-start justify-between gap-4 px-6 py-4",
        "border-b border-[#f2f2f4] dark:border-[#303030]",
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
        "text-sm font-bold text-[#111114] dark:text-white tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] text-[#8888a0] dark:text-[#9999a8] mt-0.5", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-4",
        "border-t border-[#f2f2f4] dark:border-[#303030]",
        className
      )}
      {...props}
    />
  );
}
