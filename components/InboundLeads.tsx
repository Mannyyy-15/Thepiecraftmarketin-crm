"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Inbox, RefreshCw, Mail, Phone, Building2, Calendar, ChevronDown,
  ExternalLink, Sparkles, MessageSquare,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { getSheetLeads, type SheetLead, type SheetLeadsSegment } from "@/app/actions/sheetLeads";

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

const SEGMENT_ACCENT: Record<string, string> = {
  form:         "text-blue-600 dark:text-blue-400",
  consultation: "text-amber-600 dark:text-amber-400",
  paid:         "text-emerald-600 dark:text-emerald-400",
  playbook:     "text-violet-600 dark:text-violet-400",
  chatbot:      "text-rose-600 dark:text-rose-400",
};

function LeadCard({ lead }: { lead: SheetLead }) {
  const [open, setOpen] = useState(false);
  const extras = Object.entries(lead.extra);

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden">
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {lead.name || lead.email || "Unknown"}
            </p>
            {lead.timestamp && (
              <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(lead.timestamp)}</p>
            )}
          </div>
          {extras.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              className="shrink-0 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer p-1"
              aria-label="Toggle details"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Contact row */}
        <div className="flex flex-col gap-1 mt-2">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors truncate">
              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{lead.email}</span>
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              {lead.phone}
            </a>
          )}
        </div>

        {/* Expanded extras */}
        {open && extras.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 gap-1.5">
            {extras.map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-400 capitalize shrink-0 min-w-[88px]">{k.replace(/([A-Z])/g, " $1")}:</span>
                <span className="text-slate-700 dark:text-slate-200 break-words">
                  {/^https?:\/\//.test(v) ? (
                    <a href={v} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-1">
                      Link <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboundLeads() {
  const [segments, setSegments] = useState<SheetLeadsSegment[]>([]);
  const [active, setActive] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSheetLeads();
      if (res.success && res.segments) {
        setSegments(res.segments);
      } else {
        setError(res.error || "Could not load inbound leads.");
      }
    } catch {
      setError("Could not load inbound leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = segments.reduce((s, seg) => s + seg.count, 0);
  const visibleLeads =
    active === "all"
      ? segments.flatMap(s => s.leads)
      : segments.find(s => s.key === active)?.leads || [];

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
            <Inbox className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Inbound Leads
              {!loading && !error && (
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-1.5 py-0.5 rounded-full">{total}</span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400">From your inquiry sheet — form, consultation, playbook & chatbot</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={load}
            disabled={loading}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-400 hover:text-brand-600 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Toggle inbound leads"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Segment filter pills */}
          {!error && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActive("all")}
                className={cn(
                  "h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  active === "all"
                    ? "bg-brand-600 text-white"
                    : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400"
                )}
              >
                All <span className="opacity-70">({total})</span>
              </button>
              {segments.map(seg => (
                <button
                  key={seg.key}
                  onClick={() => setActive(seg.key)}
                  className={cn(
                    "h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    active === seg.key
                      ? "bg-brand-600 text-white"
                      : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-brand-400",
                    active !== seg.key && (SEGMENT_ACCENT[seg.key] || "text-slate-600 dark:text-slate-300")
                  )}
                >
                  {seg.label} <span className="opacity-70">({seg.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-7 w-7 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{error}</p>
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-7 w-7 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No leads in this segment yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
