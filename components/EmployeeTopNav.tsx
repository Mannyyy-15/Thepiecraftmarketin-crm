"use client";

import {
  Bell,
  Search,
  Command,
  X,
  Check,
  LogOut,
  Sparkles,
  Zap,
  Fingerprint,
  DoorOpen,
  Send,
  ThumbsUp,
  ThumbsDown,
  Receipt,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { getCurrentUser, logout } from "@/app/actions/auth";
import { getMyNotifications, markAllNotificationsRead, dismissNotification } from "@/app/actions/crm";
import type { Notification } from "@/lib/schema";
import NotificationPanel from "@/components/NotificationPanel";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info";
}

function titleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1) return "Home";
  const last = parts[parts.length - 1];
  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function EmployeeTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFromPath(pathname);

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<(Notification & { _time?: string })[]>([]);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Toast system
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (message: string, type: "success" | "info" = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) setUser({ name: res.name as string, email: res.email as string });
    });
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Notification polling
  useEffect(() => {
    const fetchNotifs = async () => {
      const res = await getMyNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.map((n: Notification) => ({
          ...n,
          _time: formatNotifTime(n.createdAt),
        })));
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const hasUnread = notifications.some((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const notifIconMap: Record<string, { icon: LucideIcon; color: string }> = {
    punch_in: { icon: Fingerprint, color: "text-emerald-500" },
    punch_out: { icon: DoorOpen, color: "text-amber-500" },
    leave_request: { icon: Send, color: "text-indigo-500" },
    leave_approved: { icon: ThumbsUp, color: "text-emerald-500" },
    leave_rejected: { icon: ThumbsDown, color: "text-rose-500" },
    expense_claim: { icon: Receipt, color: "text-purple-500" },
    expense_approved: { icon: ThumbsUp, color: "text-emerald-500" },
    expense_rejected: { icon: ThumbsDown, color: "text-rose-500" },
    timesheet_approved: { icon: ThumbsUp, color: "text-emerald-500" },
    timesheet_rejected: { icon: ThumbsDown, color: "text-rose-500" },
  };
  const defaultNotifIcon = { icon: Bell, color: "text-slate-500" };

  function formatNotifTime(createdAt: Date | string | null): string {
    if (!createdAt) return "";
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await logout();
      if (res.success) {
        router.push("/login");
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(notifications.map((n) => ({ ...n, read: 1 })));
  };

  return (
    <>
      <header className="z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-5 flex h-14 sm:h-16 shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-soft px-3 sm:px-4">
        
        {/* ── LEFT: Mobile Profile Avatar (replaces hamburger) ── */}
        <div className="lg:hidden relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="rounded-full transition-all cursor-pointer hover:opacity-80 active:scale-95 active:opacity-70 ring-2 ring-transparent hover:ring-brand-500/30"
            aria-label="Profile menu"
          >
            <Avatar name={user?.name || "User"} status="online" size="sm" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute left-0 mt-2.5 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-fadeIn">
              {/* User info header */}
              <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                <Avatar name={user?.name || "User"} status="online" size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || "Team Member"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || "employee@thepiecraft.com"}</p>
                </div>
              </div>

              {/* Status chip */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active — Shift in progress
                </div>
              </div>

              {/* Logout button */}
              <div className="p-2">
                <button
                  onClick={() => { setShowProfileMenu(false); setShowLogoutModal(true); }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER: Page breadcrumb (desktop) / Page title (mobile) ── */}
        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
          {/* Desktop breadcrumb */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Workspace</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
          </div>
          {/* Mobile page title */}
          <span className="lg:hidden text-sm font-extrabold text-slate-900 dark:text-white truncate">{title}</span>
        </div>

        {/* ── RIGHT: Action buttons ── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Search — desktop only bar, mobile icon */}
          <div
            onClick={() => setShowSearchModal(true)}
            className="relative hidden sm:block w-56 md:w-72 cursor-pointer group"
          >
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
            <div className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-12 text-sm text-slate-400 dark:text-slate-500 flex items-center select-none">
              Search…
            </div>
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>

          {/* Mobile Messages link — replaces search icon */}
          <Link
            href="/employee/messages"
            className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all cursor-pointer hover:bg-slate-50 active:scale-95"
            aria-label="Messages"
          >
            <MessageSquareText className="h-4 w-4" />
          </Link>

          {/* Dark mode toggle — desktop only */}
          <div className="hidden lg:flex">
            <ThemeToggle />
          </div>

          {/* Notifications bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(true);
                setShowProfileMenu(false);
              }}
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                showNotifications
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-brand-600"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 active:scale-95"
              }`}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {hasUnread && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 text-[9px] font-black text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications side panel (closes on backdrop / Esc) */}
          <NotificationPanel
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onMarkOneRead={async (id) => {
              await markAllNotificationsRead();
              setNotifications(notifications.map((item) => (item.id === id ? { ...item, read: 1 } : item)));
            }}
            onDismiss={(id) => {
              dismissNotification(id);
              setNotifications(notifications.filter((item) => item.id !== id));
            }}
          />

          {/* Desktop Avatar */}
          <div className="ml-1 hidden lg:block">
            <Avatar name={user?.name || "User"} status="online" size="sm" />
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-fadeIn"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-4 border-b border-slate-100 dark:border-slate-800/80">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Search pages, projects, clients…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 text-center text-xs text-slate-400">
              Type to search across your workspace
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Toast container */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-xl flex items-center justify-between gap-3 border animate-fadeIn ${
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500/20 text-indigo-800 dark:text-indigo-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Check className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts(toasts.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
