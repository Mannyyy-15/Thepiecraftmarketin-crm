import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "./cn";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />,
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-black/50",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
        {message}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </button>
    </div>
  );
}
