"use client";

import dynamic from "next/dynamic";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

const SparklineChart = dynamic(() => import("@/components/SparklineChart"), { ssr: false });

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  spark?: number[];
  accent?: "brand" | "portal" | "emerald" | "amber" | "rose";
}

const accentMap = {
  brand: { fill: "#263aa7", glow: "bg-brand-50 dark:bg-brand-600/20 text-brand-600 dark:text-brand-300" },
  portal: { fill: "#14B8A6", glow: "bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300" },
  emerald: { fill: "#10B981", glow: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  amber: { fill: "#F59E0B", glow: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300" },
  rose: { fill: "#F43F5E", glow: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300" },
} as const;

export default function KpiCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  spark,
  accent = "brand",
}: KpiCardProps) {
  const a = accentMap[accent];
  const sparkData = (spark ?? [3, 5, 4, 6, 8, 7, 9, 11, 10, 13, 12, 15]).map((v, i) => ({ i, v }));
  const gradId = `kpi-grad-${accent}-${title.replace(/\s+/g, "")}`;

  return (
    <div className="group relative rounded-2xl border border-slate-200 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] p-4 sm:p-5 shadow-card dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden transition-all hover:shadow-soft hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", a.glow)}>
            {icon}
          </div>
        )}
      </div>

      {/* Bottom row: change text + sparkline (sparkline hidden on mobile) */}
      <div className="mt-3 flex items-end justify-between gap-2">
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
              changeType === "negative" && "text-rose-600 dark:text-rose-400",
              changeType === "neutral" && "text-slate-500 dark:text-slate-400"
            )}
          >
            {changeType === "positive" && <ArrowUpRight className="w-3.5 h-3.5" />}
            {changeType === "negative" && <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}

        {/* Sparkline — desktop only (client-side only to avoid Recharts SSR ID mismatch) */}
        <div className="hidden sm:block -mr-1 -mb-1 shrink-0">
          <SparklineChart data={sparkData} fill={a.fill} gradId={gradId} />
        </div>
      </div>
    </div>
  );
}
