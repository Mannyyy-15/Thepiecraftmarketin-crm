"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
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

const accentFill = {
  brand:   "#3b82f6",
  portal:  "#14B8A6",
  emerald: "#10B981",
  amber:   "#F59E0B",
  rose:    "#F43F5E",
} as const;

function parseNumericValue(val: string) {
  // Remove commas to handle formatted numbers like ₹3,83,647
  const clean = val.replace(/,/g, "");
  const m = clean.match(/^([^0-9-]*)(-?[0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseFloat(m[2]), suffix: m[3] };
}

function useCountUp(target: number, decimals: number, duration: number, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let frame = 0;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) frame = requestAnimationFrame(step);
      else setCount(target);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, decimals, duration, trigger]);

  return count;
}

export default function KpiCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  spark,
  accent = "brand",
}: KpiCardProps) {
  const fill = accentFill[accent];
  const sparkData = spark?.map((v, i) => ({ i, v }));
  const gradId = `kpi-grad-${accent}-${title.replace(/\s+/g, "")}`;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  const parsed = parseNumericValue(value);
  const decimals = parsed ? (parsed.num % 1 !== 0 ? 1 : 0) : 0;
  const animated = useCountUp(parsed?.num ?? 0, decimals, 1000, isInView && mounted);
  
  const formatAnimated = (num: number) => {
    if (decimals > 0) return num.toFixed(decimals);
    return Math.round(num).toLocaleString("en-IN");
  };

  const displayValue = mounted && parsed && isInView
    ? `${parsed.prefix}${formatAnimated(animated)}${parsed.suffix}`
    : value;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative rounded-2xl bg-white dark:bg-[#1f1f1f] p-5 sm:p-6 overflow-hidden transition-all duration-200",
        "shadow-[0_1px_4px_rgba(0,0,0,0.03),_0_6px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),_0_10px_28px_rgba(0,0,0,0.09)]",
        "dark:shadow-none dark:border dark:border-[#303030] dark:hover:border-[#6e2a14]"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-[#b8b8c5]/70 uppercase tracking-wider leading-none">
          {title}
        </p>
        {icon && (
          <span className="text-slate-500 dark:text-slate-300 shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <p suppressHydrationWarning className="text-[28px] font-black text-[#111114] dark:text-white tracking-tight tabular-nums leading-none">
        {displayValue}
      </p>

      <div className="mt-3 flex items-end justify-between gap-2">
        {change ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
              changeType === "negative" && "text-rose-500 dark:text-rose-400",
              changeType === "neutral"  && "text-slate-600 dark:text-slate-300"
            )}
          >
            {changeType === "positive" && <ArrowUpRight className="w-3.5 h-3.5" />}
            {changeType === "negative" && <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}
          </span>
        ) : <span />}

        {sparkData && sparkData.length > 1 && (
          <div className="hidden sm:block -mr-2 -mb-2 shrink-0 opacity-70">
            <SparklineChart data={sparkData} fill={fill} gradId={gradId} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
