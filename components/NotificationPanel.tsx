"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Bell, ArrowLeft, Check, Fingerprint, DoorOpen, Send, ThumbsUp,
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
 * A single notification row that can be swiped left/right to dismiss.
 * Uses pointer capture so the drag never gets stuck mid-swipe.
 */
function SwipeableNotification({
  n,
  onMarkOneRead,
  onDismiss,
}: {
  n: NotificationItem;
  onMarkOneRead: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const dxRef = useRef(0);
  const [removing, setRemoving] = useState(false);

  const conf = ICONS[n.type] || DEFAULT_ICON;
  const Icon = conf.icon;
  const DISMISS_AT = 110; // px of horizontal travel to dismiss

  const paint = (dx: number, withTransition: boolean) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = withTransition ? "transform 0.25s ease, opacity 0.25s ease" : "none";
    el.style.transform = `translateX(${dx}px)`;
    el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 220));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (removing) return;
    draggingRef.current = true;
    startXRef.current = e.clientX - dxRef.current;
    paint(dxRef.current, false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    dxRef.current = e.clientX - startXRef.current;
    paint(dxRef.current, false);
  };

  const finishDismiss = (dir: 1 | -1) => {
    setRemoving(true);
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.22s ease, opacity 0.22s ease";
      cardRef.current.style.transform = `translateX(${dir * 400}px)`;
      cardRef.current.style.opacity = "0";
    }
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => onDismiss(n.id), 200);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    const dx = dxRef.current;
    if (Math.abs(dx) >= DISMISS_AT) {
      finishDismiss(dx > 0 ? 1 : -1);
    } else if (Math.abs(dx) < 6) {
      // Treat as a tap → mark read.
      dxRef.current = 0;
      paint(0, true);
      if (!n.read) onMarkOneRead(n.id);
    } else {
      dxRef.current = 0;
      paint(0, true); // spring back
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ touchAction: "pan-y" }}>
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative flex items-start gap-3 rounded-2xl p-3.5 cursor-grab active:cursor-grabbing select-none border ${
          n.read
            ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60"
            : "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/40 shadow-sm"
        }`}
        style={{ willChange: "transform, opacity" }}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${conf.bg}`}>
          <Icon className={`h-5 w-5 ${conf.color}`} />
        </div>
        <div className="min-w-0 flex-1 pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
            <span className="text-[10px] text-slate-400 font-medium tabular-nums shrink-0">{formatDate(n.createdAt)}</span>
          </div>
          {n.message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
          )}
        </div>
        {!n.read && <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-indigo-500 pointer-events-none" />}
      </div>
    </div>
  );
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!mounted) return null;

  // Rendered through a portal to document.body so no transformed/overflow-hidden
  // ancestor (sticky header, motion.div, etc.) can clip or shrink the fixed panel.
  return createPortal(
    <div
      className={open ? "" : "pointer-events-none"}
      aria-hidden={!open}
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
    >
      {/* Backdrop — clicking anywhere here closes the panel */}
      <div
        onClick={onClose}
        className="bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ position: "absolute", inset: 0, opacity: open ? 1 : 0 }}
      />

      {/* Sliding panel */}
      <aside
        className="bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        role="dialog"
        aria-label="Notifications"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100dvh",
          width: "100vw",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
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
                {notifications.map((n) => (
                  <SwipeableNotification
                    key={n.id}
                    n={n}
                    onMarkOneRead={onMarkOneRead}
                    onDismiss={onDismiss}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
