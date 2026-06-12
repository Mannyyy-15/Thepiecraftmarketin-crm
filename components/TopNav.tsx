"use client";

import {
  Bell,
  Search,
  Menu,
  Command,
  Plus,
  X,
  Briefcase,
  Users,
  MessageSquareText,
  FileText,
  Check,
  Sparkles,
  Clock,
  DollarSign,
  Globe,
  Zap,
  Sun,
  Moon,
  LogOut,
  Fingerprint,
  DoorOpen,
  Send,
  ThumbsUp,
  ThumbsDown,
  Receipt,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getCurrentUser, logout } from "@/app/actions/auth";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getMyNotifications, markAllNotificationsRead, dismissNotification, getGlobalSearchData, quickAddClient, quickAddEmployee, quickAddProject, quickAddTimesheet, quickAddExpense } from "@/app/actions/crm";
import type { Notification } from "@/lib/schema";
import NotificationPanel from "@/components/NotificationPanel";

interface SearchItem {
  title: string;
  category: "Client" | "Project" | "Team" | "Page";
  url: string;
  details: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info";
}

function titleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 1) return "Overview";
  const last = parts[parts.length - 1];
  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFromPath(pathname);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) {
        setUser({ name: res.name as string, email: res.email as string });
      }
    });
  }, []);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<(Notification & { _time?: string })[]>([]);

  // Global Search State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState<{ clients: any[], projects: any[], users: any[] }>({ clients: [], projects: [], users: [] });

  useEffect(() => {
    getGlobalSearchData().then(res => {
      if (res && res.success && res.data) {
        setSearchData(res.data);
      }
    });
  }, []);

  // Floating Quick Action dropdowns & modals
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [activeModal, setActiveModal] = useState<"client" | "employee" | "project" | "hours" | "expense" | null>(null);

  // Quick Forms Local states
  const [qClientName, setQClientName] = useState("");
  const [qClientIndustry, setQClientIndustry] = useState("SaaS");
  const [qEmpName, setQEmpName] = useState("");
  const [qEmpRole, setQEmpRole] = useState("Lead Strategist");
  const [qProjTitle, setQProjTitle] = useState("");
  const [qProjClient, setQProjClient] = useState("Acme Corp");
  const [qProjType, setQProjType] = useState<"Website" | "Meta Ads" | "Branding" | "SEO" | "Content">("Website");
  const [qHours, setQHours] = useState("8");
  const [qExpenseAmount, setQExpenseAmount] = useState("");
  const [qExpenseDesc, setQExpenseDesc] = useState("");

  // Profile dropdown + theme state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const res = await logout();
    if (res.success) {
      router.push("/login");
    }
    setIsLoggingOut(false);
  };

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  // Toast Messaging System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "info" = "success") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Listen for Ctrl+K / Cmd+K global shortcuts
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
      try {
        const res = await getMyNotifications();
        if (res && res.success && res.data) {
          setNotifications(res.data.map((n: Notification) => ({
            ...n,
            _time: formatNotifTime(n.createdAt),
          })));
        }
      } catch { /* silent — server not ready yet */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const hasUnread = notifications.some((n) => !n.read);

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

  // Notifications Actions
  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(notifications.map((n) => ({ ...n, read: 1 })));
    addToast("All notifications marked as read", "info");
  };

  const handleDismissNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await dismissNotification(id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  // Search Engine Database Feed
  const searchItems: SearchItem[] = [
    ...searchData.clients.map((c) => ({ title: c.name, category: "Client" as const, url: `/admin/clients/${c.id}`, details: `${c.industry || "Client"} • ID #${c.id}` })),
    ...searchData.projects.map((p) => ({ title: p.name, category: "Project" as const, url: `/admin/projects/${p.id}`, details: `${(p.projectType || 'standard').replace('_', ' ').toUpperCase()} • Budget: ₹${(p.budget || 0).toLocaleString()}` })),
    ...searchData.users.map((u) => ({ title: u.name, category: "Team" as const, url: `/admin/team?member=${u.id}`, details: `${u.systemRole || u.role || 'Member'} • ${u.email}` })),
    { title: "Team & Roster Attendance Tracker", category: "Page", url: "/admin/team", details: "View shifts, log leaves & customize work days" },
    { title: "Onboarding Funnel Board", category: "Page", url: "/admin/clients", details: "Kanban pipeline, checklists & custom clients" },
    { title: "Meta Ads Campaign Manager", category: "Page", url: "/admin/ads", details: "Track campaigns, ROAS, budgets & live charts" },
    { title: "Website Dev Sprint Backlog", category: "Page", url: "/admin/website-dev", details: "Backlog tickets, server health & domain pings" },
    { title: "Contractor Timesheets & Revenue", category: "Page", url: "/admin/finance", details: "Approve payouts, log transactions & view profits" },
    { title: "Studio AI Strategic Pitch Builder", category: "Page", url: "/admin/studio-ai", details: "Generate strategy pitchbooks, ad copy & project timelines" },
  ];

  const filteredSearch = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Quick Action Submission Handlers
  const handleQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qClientName) return;
    const res = await quickAddClient(qClientName, qClientIndustry);
    if (res.success) {
      addToast(`Successfully onboarded client "${qClientName}" to active CRM database!`);
      setQClientName("");
      setActiveModal(null);
    } else {
      addToast(`Failed to onboard client: ${res.error}`, "info");
    }
  };

  const handleQuickEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qEmpName) return;
    const res = await quickAddEmployee(qEmpName, qEmpRole);
    if (res.success) {
      addToast(`Successfully sent professional invite token to ${qEmpName} (${qEmpRole})!`);
      setQEmpName("");
      setActiveModal(null);
    } else {
      addToast(`Failed to add team member: ${res.error}`, "info");
    }
  };

  const handleQuickProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qProjTitle) return;
    const res = await quickAddProject(qProjTitle, qProjClient, qProjType);
    if (res.success) {
      addToast(`Successfully created project "${qProjTitle}" for ${qProjClient}!`);
      setQProjTitle("");
      setActiveModal(null);
    } else {
      addToast(`Failed to create project: ${res.error}`, "info");
    }
  };

  const handleQuickHours = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await quickAddTimesheet(Number(qHours));
    if (res.success) {
      addToast(`Logged ${qHours} billable hours to your active weekly timesheet!`);
      setActiveModal(null);
    } else {
      addToast(`Failed to log hours: ${res.error}`, "info");
    }
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qExpenseAmount) return;
    const res = await quickAddExpense(Number(qExpenseAmount), qExpenseDesc || "Quick expense");
    if (res.success) {
      addToast(`Expense claim for ₹${qExpenseAmount} submitted successfully.`);
      setQExpenseAmount("");
      setQExpenseDesc("");
      setActiveModal(null);
    } else {
      addToast(`Failed to submit expense: ${res.error}`, "info");
    }
  };

  return (
    <>
      <header className="z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-5 flex h-14 sm:h-16 shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-brand-900/50 bg-white/85 dark:bg-[#080d1e]/90 backdrop-blur-xl shadow-soft px-3 sm:px-4">
        {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden -ml-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Company name — visible on mobile, replaces breadcrumb on desktop */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">ThePieCraft</span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 relative">
        
        {/* Global Search Bar (Trigger) - Hidden on mobile, visible on desktop */}
        <div 
          onClick={() => setShowSearchModal(true)}
          className="relative hidden sm:block w-64 md:w-80 cursor-pointer group"
        >
          <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
          <div className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-12 text-sm text-slate-450 dark:text-slate-500 flex items-center select-none">
            Search clients, projects, settings…
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        {/* Global Quick Action "+" Toggle Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowQuickActions(!showQuickActions);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${
              showQuickActions 
                ? "bg-brand-600 text-white shadow-glow border-brand-600" 
                : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            title="Quick Action Toolbar"
          >
            <Plus className={`h-4 w-4 transition-transform duration-250 ${showQuickActions ? "rotate-45" : ""}`} />
          </button>

          {/* Quick Actions Dropdown Menu */}
          {showQuickActions && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl z-50 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">Quick Tools</p>
              
              <button
                onClick={() => { setActiveModal("client"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" /> Onboard New Client
              </button>
              
              <button
                onClick={() => { setActiveModal("employee"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-3.5 w-3.5" /> Invite Team Member
              </button>

              <button
                onClick={() => { setActiveModal("project"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5" /> Create Project
              </button>

              <div className="border-t border-slate-100 dark:border-slate-800/80 my-1.5" />

              <button
                onClick={() => { setActiveModal("hours"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" /> Log Billable Hours
              </button>

              <button
                onClick={() => { setActiveModal("expense"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <DollarSign className="h-3.5 w-3.5" /> Submit Expense Claim
              </button>
            </div>
          )}
        </div>

        {/* Messages Nav Button */}
        <button
          type="button"
          onClick={() => router.push('/admin/messages')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
          aria-label="Messages"
          title="Messages"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>

        {/* Bell Notifications Toggle Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(true);
              setShowQuickActions(false);
              setShowProfileMenu(false);
            }}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer ${
              showNotifications
                ? "bg-slate-100 dark:bg-slate-800 text-brand-600"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
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

        {/* Profile avatar + dropdown — visible on all screen sizes */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); setShowQuickActions(false); }}
            className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label="Profile menu"
          >
            <Avatar name={user?.name || "User"} status="online" size="sm" />
          </button>

          {showProfileMenu && (
            <>
              {/* backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-fadeIn">
                {/* User info */}
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email || ""}</p>
                </div>

                <div className="p-2 space-y-0.5">
                  {/* Theme toggle row */}
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark
                        ? <Sun className="h-4 w-4 text-amber-500" />
                        : <Moon className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                      }
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isDark ? "Light Mode" : "Dark Mode"}
                      </span>
                    </div>
                    {/* Toggle switch */}
                    <div className={`relative h-5 w-9 rounded-full border transition-colors ${isDark ? "bg-brand-600 border-brand-600" : "bg-slate-200 border-slate-300"}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${isDark ? "left-4" : "left-0.5"}`} />
                    </div>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => { setShowProfileMenu(false); setShowLogoutModal(true); }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </header>

      {/* ========================================================================= */}
      {/* 🔍 SEARCH PALETTE / COMMAND DIALOG OVERLAY */}
      {/* ========================================================================= */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-fadeIn"
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Box */}
            <div className="relative p-4 border-b border-slate-100 dark:border-slate-800/80">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Search resources, client brands, dev tickets, or team rosters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl pl-11 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Search Results List */}
            <div className="max-h-[420px] overflow-y-auto p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">
                {searchQuery ? `Search Results (${filteredSearch.length})` : "Workspace Index Shortcuts"}
              </p>

              {filteredSearch.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setShowSearchModal(false);
                    router.push(item.url);
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-indigo-600 dark:hover:text-white flex items-center justify-between cursor-pointer group transition-all"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {item.category === "Client" && <Globe className="h-3.5 w-3.5 text-blue-500" />}
                      {item.category === "Project" && <Briefcase className="h-3.5 w-3.5 text-emerald-500" />}
                      {item.category === "Team" && <Users className="h-3.5 w-3.5 text-amber-500" />}
                      {item.category === "Page" && <FileText className="h-3.5 w-3.5 text-indigo-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.title}</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate leading-snug">{item.details}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 select-none">
                    {item.category}
                  </span>
                </div>
              ))}

              {filteredSearch.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching files, clients, or team pages found for "{searchQuery}".
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 text-[10px] text-slate-450 dark:text-slate-500 flex justify-between">
              <span>Press <kbd className="bg-white dark:bg-slate-800 px-1 border rounded shadow-sm">Enter</kbd> to select</span>
              <span>Press <kbd className="bg-white dark:bg-slate-800 px-1 border rounded shadow-sm">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎁 FLOATING QUICK ACTION MODALS OVERLAYS */}
      {/* ========================================================================= */}
      
      {/* 1. Client Onboard Modal */}
      {activeModal === "client" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-brand-500/20 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-indigo-500" /> Quick Onboard Client
                </CardTitle>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleQuickClient} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Umbrella Corp"
                    value={qClientName}
                    onChange={(e) => setQClientName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Industry</label>
                  <select
                    value={qClientIndustry}
                    onChange={(e) => setQClientIndustry(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="SaaS">SaaS / Software</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Health">Healthcare & Biotech</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Defense">Aerospace & Defense</option>
                  </select>
                </div>
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Onboard Brand
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Invite Team Member Modal */}
      {activeModal === "employee" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-brand-500/20 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-indigo-500" /> Invite Team Member
                </CardTitle>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleQuickEmployee} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={qEmpName}
                    onChange={(e) => setQEmpName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Professional Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Engineer"
                    value={qEmpRole}
                    onChange={(e) => setQEmpRole(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Generate Invite Token
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Create Project Modal */}
      {activeModal === "project" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-brand-500/20 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4.5 w-4.5 text-indigo-500" /> Create Project
                </CardTitle>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleQuickProject} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. E-Commerce Redesign"
                    value={qProjTitle}
                    onChange={(e) => setQProjTitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client</label>
                    <select
                      value={qProjClient}
                      onChange={(e) => setQProjClient(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                    >
                      {searchData.clients.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
                    <select
                      value={qProjType}
                      onChange={(e) => setQProjType(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="Website">Website</option>
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Branding">Branding</option>
                      <option value="SEO">SEO</option>
                      <option value="Content">Content</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Create Project Card
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Log Billable Hours Modal */}
      {activeModal === "hours" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-brand-500/20 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-emerald-500" /> Log Billable Hours
                </CardTitle>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleQuickHours} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Hours Billed</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={qHours}
                    onChange={(e) => setQHours(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Associated Engagement</label>
                  <select className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40">
                    {searchData.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Submit Timesheet Hour
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Submit Expense Claim Modal */}
      {activeModal === "expense" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-brand-500/20 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-rose-500" /> Submit Expense Claim
                </CardTitle>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleQuickExpense} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (USD)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="e.g. 125"
                    value={qExpenseAmount}
                    onChange={(e) => setQExpenseAmount(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expense Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Team lunch with Stark Acme representatives"
                    value={qExpenseDesc}
                    onChange={(e) => setQExpenseDesc(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <button type="submit" className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Log Expense claim
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 GLOWING TOASTS NOTIFICATION MESSAGING CONTAINER */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between gap-3 border transition-all animate-slideIn ${
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20 text-indigo-800 dark:text-indigo-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
              }`}>
                <Check className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold leading-normal">{t.message}</span>
            </div>
            <button 
              onClick={() => setToasts(toasts.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
