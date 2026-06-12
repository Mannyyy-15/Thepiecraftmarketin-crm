"use client";

import { useEffect } from "react";
import {
  Bell, X, ArrowLeft, Check, Fingerprint, DoorOpen, Send, ThumbsUp,
  ThumbsDown, Receipt, type LucideIcon,
} from "lucide-react";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string | null;
  read: number;
  createdAt: Date | string | null;
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: number) => void;
  onDismiss: (id: number) => void;
}

const ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  punch_in:           { icon: Fingerprint, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  punch_out:          { icon: DoorOpen,    color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  leave_request:      { icon: Send,        color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  leave_approved:     { icon: ThumbsUp,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  leave_rejected:     { icon: ThumbsDown,  color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  expense_claim:      { icon: Receipt,     color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  expense_approved:   { icon: ThumbsUp,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  expense_rejected:   { icon: ThumbsDown,  color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  timesheet_approved: { icon: ThumbsUp,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  timesheet_rejected: { icon: ThumbsDown,  color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
};
const DEFAULT_ICON = { icon: Bell, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" };

function formatDate(createdAt: Date | string | null): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Right-side slide-in notifications panel. Closes on backdrop click or Esc.
 * Shared across all top navs (admin / employee / client).
 */
export default function NotificationPanel({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkOneRead,
  onDismiss,
}: NotificationPanelProps) {
  // Close on Esc; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* Backdrop — clicking anywhere here closes the panel */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* Sliding panel */}
      <aside
        className={`absolute top-0 right-0 h-full w-[88%] max-w-sm bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
          <button
            onClick={onClose}
            className="h-9 w-9 -ml-1 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h2>
          {unread > 0 ? (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              Mark all
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">You're all caught up</p>
              <p className="text-xs text-slate-400 mt-1">New notifications will appear here.</p>
            </div>
          ) : (
            <>
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Recent</p>
              <div className="space-y-2.5">
                {notifications.map((n) => {
                  const conf = ICONS[n.type] || DEFAULT_ICON;
                  const Icon = conf.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.read) onMarkOneRead(n.id); }}
                      className={`group relative flex items-start gap-3 rounded-2xl p-3.5 cursor-pointer transition-all border ${
                        n.read
                          ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60"
                          : "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/40 shadow-sm"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${conf.bg}`}>
                        <Icon className={`h-5 w-5 ${conf.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 font-medium tabular-nums shrink-0">{formatDate(n.createdAt)}</span>
                        </div>
                        {n.message && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                      </div>
                      {/* Unread blue dot */}
                      {!n.read && <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-indigo-500" />}
                      {/* Dismiss (hover) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-all"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
