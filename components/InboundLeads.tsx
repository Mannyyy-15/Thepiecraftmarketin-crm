"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Inbox, RefreshCw, Mail, Phone,
  ExternalLink, Sparkles, MessageSquare, ChevronDown, AlertCircle,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { getSheetLeads, type SheetLead, type SheetLeadsSegment } from "@/app/actions/sheetLeads";
import { importSheetLeadToCrm } from "@/app/actions/crm";
import { Skeleton } from "@/components/ui/Skeleton";

function timeAgo(ts: string): string {
  if (!ts) return "";
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return ts;
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const SEGMENT_STYLES: Record<string, { pill: string; dot: string }> = {
  form:         { pill: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-[#60a5fa]",       dot: "bg-blue-500" },
  consultation: { pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",    dot: "bg-amber-500" },
  paid:         { pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  playbook:     { pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400", dot: "bg-violet-500" },
  chatbot:      { pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",         dot: "bg-rose-500" },
};

const DEFAULT_STYLE = { pill: "bg-slate-100 text-slate-600 dark:bg-[#303030] dark:text-[#9999a8]", dot: "bg-slate-400" };

function getInitials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0][0] || "?").toUpperCase();
}

function LeadRow({ lead, segmentKey }: { lead: SheetLead; segmentKey?: string }) {
  const [open, setOpen] = useState(false);
  const extras = Object.entries(lead.extra);
  const style = SEGMENT_STYLES[segmentKey || ""] || DEFAULT_STYLE;
  const displayName = lead.name || lead.email?.split("@")[0] || "Unknown";

  return (
    <div className="group">
      <div
        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#303030]/40 transition-colors cursor-default"
        onClick={() => extras.length > 0 && setOpen(o => !o)}
      >
        {/* Avatar */}
        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0 text-xs font-bold text-slate-500 dark:text-[#9999a8] select-none">
          {getInitials(displayName)}
        </div>

        {/* Name + extras toggle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
            {extras.length > 0 && (
              <span className="text-[10px] text-[#9999a8] hidden sm:inline">{extras.length} field{extras.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {lead.email && (
              <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#9999a8] hover:text-[#3b82f6] transition-colors truncate max-w-[160px]">
                <Mail className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
            )}
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline">
                <Phone className="h-2.5 w-2.5 shrink-0" />
                {lead.phone}
              </a>
            )}
          </div>
        </div>

        {/* Source badge */}
        {segmentKey && (
          <div className="hidden sm:block shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize", style.pill)}>
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
              {segmentKey}
            </span>
          </div>
        )}

        {/* Time */}
        {lead.timestamp && (
          <span className="hidden md:block shrink-0 text-[11px] text-[#5a5a68] tabular-nums">
            {timeAgo(lead.timestamp)}
          </span>
        )}

        <button
          onClick={async (e) => {
            e.stopPropagation();
            const res = await importSheetLeadToCrm({ name: lead.name, email: lead.email, phone: lead.phone, segmentLabel: lead.segmentLabel, extra: lead.extra });
            if (res.success) {
              alert("Lead imported to CRM pipeline!");
            }
          }}
          className="shrink-0 h-7 px-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          Import to CRM
        </button>

        {/* Expand chevron */}
        {extras.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#3b82f6] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            aria-label="Toggle details"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Expanded extras */}
      {open && extras.length > 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-slate-100 dark:border-[#303030] bg-slate-50/60 dark:bg-[#303030]/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 pt-3">
            {extras.map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-0.5">
                  {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 break-words">
                  {/^https?:\/\//.test(v) ? (
                    <a href={v} target="_blank" rel="noreferrer"
                      className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                      View link <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : v}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboundLeads() {
  const [segments, setSegments] = useState<SheetLeadsSegment[]>([]);
  const [active, setActive]     = useState<string>("all");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSheetLeads();
      if (res.success && res.segments) setSegments(res.segments);
      else setError(res.error || "Could not load inbound leads.");
    } catch {
      setError("Could not load inbound leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = segments.reduce((s, seg) => s + seg.count, 0);

  const visibleLeads: Array<SheetLead & { _segKey?: string }> =
    active === "all"
      ? segments.flatMap(s => s.leads.map(l => ({ ...l, _segKey: s.key })))
      : (segments.find(s => s.key === active)?.leads || []).map(l => ({ ...l, _segKey: active }));

  return (
    <div className="rounded-[20px] border border-slate-200/80 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-[#303030]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-[#303030] flex items-center justify-center shrink-0">
            <Inbox className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inbound Leads</h3>
              {!loading && !error && total > 0 && (
                <span className="text-[10px] font-bold text-[#3b82f6] bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-full tabular-nums">{total}</span>
              )}
            </div>
            <p className="text-[10px] text-[#9999a8] mt-0.5">From your inquiry sheet — form, consultation, playbook &amp; chatbot</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={load} disabled={loading}
            className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] text-xs font-semibold text-slate-600 dark:text-[#9999a8] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="h-8 w-8 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] text-slate-400 hover:text-[#3b82f6] transition-all cursor-pointer flex items-center justify-center"
            aria-label="Toggle">
            <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Segment filter pills */}
          {!error && segments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-5 py-3 border-b border-slate-100 dark:border-[#303030]">
              <button
                onClick={() => setActive("all")}
                className={cn(
                  "h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
                  active === "all"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                    : "bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] text-slate-500 dark:text-[#9999a8] hover:border-slate-300"
                )}>
                All <span className="ml-1 tabular-nums opacity-60">{total}</span>
              </button>
              {segments.map(seg => {
                const style = SEGMENT_STYLES[seg.key] || DEFAULT_STYLE;
                return (
                  <button key={seg.key} onClick={() => setActive(seg.key)}
                    className={cn(
                      "h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer border capitalize",
                      active === seg.key
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                        : cn("bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] hover:border-slate-300", style.pill.split(" ").filter(c => c.startsWith("text-")).join(" "))
                    )}>
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5", active === seg.key ? "bg-current opacity-50" : style.dot)} />
                    {seg.label}
                    <span className="ml-1.5 opacity-50 tabular-nums">{seg.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-[#303030]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-lg hidden sm:block" />
                  <Skeleton className="h-3 w-12 hidden md:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4 gap-2">
              <div className="h-10 w-10 rounded-[20px] bg-slate-100 dark:bg-[#303030] flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-[#5a5a68]" />
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9999a8] max-w-sm">{error}</p>
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <div className="h-10 w-10 rounded-[20px] bg-slate-100 dark:bg-[#303030] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#5a5a68]" />
              </div>
              <p className="text-xs text-slate-500 dark:text-[#9999a8]">No leads in this segment yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#303030]">
              {visibleLeads.map(lead => (
                <LeadRow key={lead.id} lead={lead} segmentKey={lead._segKey} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
