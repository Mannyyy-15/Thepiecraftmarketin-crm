"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
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
    icon: CheckCircle2,
    title: "Success",
    iconWrap: "bg-emerald-500/10 text-emerald-500",
  },
  error: {
    icon: AlertTriangle,
    title: "Error",
    iconWrap: "bg-rose-500/10 text-rose-500",
  },
  info: {
    icon: Info,
    title: "Notification",
    iconWrap: "bg-brand-500/10 text-brand-500",
  },
};

export function Toast({ id, message, type = "info", duration = 4000, onClose }: ToastProps) {
  const cfg = config[type];
  const Icon = cfg.icon;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[16px]",
        "border border-slate-200 dark:border-[#303030]",
        "bg-white dark:bg-[#1f1f1f]",
        "shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:shadow-black/40"
      )}
      role="status"
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", cfg.iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{cfg.title}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">{message}</p>
        </div>

        <button
          onClick={() => onClose(id)}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#303030] dark:hover:text-slate-200 active:scale-90 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
