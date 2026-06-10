"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

const config = {
  success: {
    icon: CheckCircle,
    iconClass: "text-emerald-500",
    barClass:  "bg-emerald-500",
    border:    "border-l-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-500",
    barClass:  "bg-rose-500",
    border:    "border-l-rose-500",
  },
  info: {
    icon: Info,
    iconClass: "text-brand-500",
    barClass:  "bg-brand-500",
    border:    "border-l-brand-500",
  },
};

export function Toast({ id, message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const cfg = config[type];
  const Icon = cfg.icon;

  useEffect(() => {
    if (duration <= 0) return;
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        onClose(id);
      }
    }, 40);
    return () => clearInterval(tick);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 56, scale: 0.94 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: 56, scale: 0.94 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl",
        "border border-l-[3px] border-slate-200 dark:border-slate-700/60",
        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
        "shadow-xl shadow-slate-900/10 dark:shadow-black/40",
        cfg.border
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <motion.div
          initial={{ scale: 0.4, rotate: -15, opacity: 0 }}
          animate={{ scale: 1,   rotate: 0,   opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 350, delay: 0.08 }}
          className="shrink-0"
        >
          <Icon className={cn("w-5 h-5", cfg.iconClass)} />
        </motion.div>

        <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
          {message}
        </p>

        <button
          onClick={() => onClose(id)}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-100 active:scale-90 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {duration > 0 && (
        <div className="h-[2px] bg-slate-100 dark:bg-slate-800">
          <div
            className={cn("h-full rounded-full", cfg.barClass)}
            style={{ width: `${progress}%`, transition: "width 40ms linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}
