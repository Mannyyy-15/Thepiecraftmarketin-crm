import { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-12", className)}>
      <div className="w-12 h-12 rounded-[20px] bg-slate-100 dark:bg-[#28282d] text-slate-500 dark:text-[#9999a8] flex items-center justify-center mb-4 animate-pop">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white animate-slide-up" style={{ animationDelay: "60ms" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5 animate-slide-up" style={{ animationDelay: "140ms" }}>
          {action}
        </div>
      )}
    </div>
  );
}
