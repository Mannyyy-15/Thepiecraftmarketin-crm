"use client";

import {
  Bell,
  Search,
  Menu,
  Command,
  Plus,
  X,
  Briefcase,
  MessageSquare,
  FileText,
  Check,
  Sparkles,
  Upload,
  ArrowRight,
  DollarSign
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUserCached } from "@/lib/currentUserClient";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, dismissNotification, sendMessage, getClientMessagingContacts } from "@/app/actions/crm";
import NotificationPanel from "@/components/NotificationPanel";

interface SearchItem {
  title: string;
  category: "Project" | "Invoice" | "Document" | "Page";
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
  return last.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function PortalTopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFromPath(pathname);
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string | null } | null>(null);

  useEffect(() => {
    getCurrentUserCached().then((res) => {
      if (res) {
        setUser({ name: res.name as string, email: res.email as string, avatarUrl: res.avatarUrl || null });
      }
    });
  }, []);

  // Notification states (real, from the database)
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const hasUnread = notifications.some((n) => !n.read);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let running = false;
    const fetchNotifs = async () => {
      const res = await getMyNotifications();
      if (res.success && res.data) setNotifications(res.data);
    };
    const poll = async () => {
      if (stopped || running || document.visibilityState !== "visible") return;
      running = true;
      try { await fetchNotifs(); } catch { /* keep polling resilient */ } finally { running = false; }
      if (!stopped && document.visibilityState === "visible") timeout = setTimeout(poll, 30_000);
    };
    const handleVisibilityChange = () => {
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
      if (document.visibilityState === "visible") void poll();
    };
    void poll();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(notifications.map((n) => ({ ...n, read: 1 })));
  };

  // Global Search
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Floating Actions Dropdowns & Modals
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [activeModal, setActiveModal] = useState<"project" | "message" | "upload" | null>(null);

  // Forms states
  const [qProjName, setQProjName] = useState("");
  const [qProjDesc, setQProjDesc] = useState("");
  const [qMsgText, setQMsgText] = useState("");
  const [qDocName, setQDocName] = useState("");

  // Stateful Toast Notification Center
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "info" = "success") => {
    const id = `ctoast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
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

  const handleDismissNotification = async (id: number) => {
    await dismissNotification(id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  // Search Items optimized for client view
  const searchItems: SearchItem[] = [
    { title: "Projects", category: "Page", url: "/client/projects", details: "Track milestones, deliverables, approvals and progress" },
    { title: "Invoices", category: "Page", url: "/client/invoices", details: "Review issued invoices and payment status" },
    { title: "Documents", category: "Page", url: "/client/documents", details: "Open your private files and deliverables" },
    { title: "Messages", category: "Page", url: "/client/messages", details: "Contact your agency team" },
    { title: "Reports", category: "Page", url: "/client/reports", details: "Review shared performance reports" },
    { title: "Website Dev", category: "Page", url: "/client/website-dev", details: "Domain, uptime, and site health status" },
    { title: "Security", category: "Page", url: "/client/security", details: "MFA and device sessions" },
    { title: "Profile", category: "Page", url: "/client/profile", details: "Update your photo and contact details" },
  ];

  const filteredSearch = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [submittingQuickAction, setSubmittingQuickAction] = useState(false);

  // Resolves the client's agency contact (an active admin) and delivers a real
  // message to them — there is no separate "project request" or "asset intake"
  // entity in the schema, so these quick actions route into the same messaging
  // system as "Send Account Message", just pre-formatted per intent.
  const sendToAgency = async (text: string) => {
    const contacts = await getClientMessagingContacts();
    const target = contacts.success ? contacts.data?.[0] : null;
    if (!target) {
      addToast("No agency contact is available right now. Try again shortly.", "info");
      return false;
    }
    const res = await sendMessage(target.id, text);
    if (!res.success) {
      addToast(res.error || "Could not send your request.", "info");
      return false;
    }
    return true;
  };

  // Submission handles
  const handleRequestProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qProjName) return;
    setSubmittingQuickAction(true);
    const text = `New project request: "${qProjName}"${qProjDesc ? `\n\n${qProjDesc}` : ""}`;
    const ok = await sendToAgency(text);
    setSubmittingQuickAction(false);
    if (ok) {
      addToast("Project request sent to your account team.", "success");
      setQProjName(""); setQProjDesc("");
      setActiveModal(null);
      router.push("/client/messages");
    }
  };

  const handleQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qMsgText) return;
    setSubmittingQuickAction(true);
    const ok = await sendToAgency(qMsgText);
    setSubmittingQuickAction(false);
    if (ok) {
      addToast("Message sent to your account team.", "success");
      setQMsgText("");
      setActiveModal(null);
      router.push("/client/messages");
    }
  };

  const handleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qDocName) return;
    setSubmittingQuickAction(true);
    const text = `I have a file to share: "${qDocName}". Please send me an upload link or let me know how to deliver it.`;
    const ok = await sendToAgency(text);
    setSubmittingQuickAction(false);
    if (ok) {
      addToast("Your account team has been notified — they'll follow up on how to receive the file.", "success");
      setQDocName("");
      setActiveModal(null);
      router.push("/client/messages");
    }
  };

  return (
    <header className="z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-5 flex h-14 sm:h-16 shrink-0 items-center gap-3 rounded-[20px] bg-white/90 dark:bg-[#1f1f1f]/95 backdrop-blur-xl px-4 sm:px-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-none dark:border dark:border-[#303030]">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden -ml-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#303030] cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="hidden md:flex items-center gap-2 text-sm">
        <span className="max-w-44 truncate text-slate-500 dark:text-slate-400">{user?.name || "Client workspace"}</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 relative">
        
        {/* Help Message Shortcut */}
        <button
          onClick={() => setActiveModal("message")}
          className="hidden sm:inline-flex items-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#303030] transition-colors cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-portal-600 dark:text-portal-400" />
          Message Lead
        </button>

        {/* Global Search Bar (Trigger) */}
        <div 
          onClick={() => setShowSearchModal(true)}
          className="relative hidden sm:block w-48 md:w-64 cursor-pointer group"
        >
          <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
          <div className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030] pl-9 pr-12 text-xs text-slate-450 dark:text-slate-500 flex items-center select-none">
            Search projects, invoicesâ€¦
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:text-slate-400">
            <Command className="h-2 w-2" />K
          </kbd>
        </div>

        {/* Search toggle mobile */}
        <button
          type="button"
          onClick={() => setShowSearchModal(true)}
          className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#303030] cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Client Request Actions Toggle Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowQuickActions(!showQuickActions);
              setShowNotifications(false);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${
              showQuickActions 
                ? "bg-indigo-600 text-white shadow-glow border-indigo-600" 
                : "bg-white dark:bg-[#303030] hover:bg-slate-50 dark:hover:bg-[#303030]"
            }`}
            title="Submit Briefs & Requests"
          >
            <Plus className={`h-4 w-4 transition-transform duration-250 ${showQuickActions ? "rotate-45" : ""}`} />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] p-2.5 shadow-xl z-50 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">Actions</p>
              
              <button
                onClick={() => { setActiveModal("project"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5" /> Request Project
              </button>

              <button
                onClick={() => { setActiveModal("upload"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Submit Document / Asset
              </button>

              <button
                onClick={() => { setActiveModal("message"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Send Account Message
              </button>
            </div>
          )}
        </div>

        {/* Bell Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(true);
              setShowQuickActions(false);
            }}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#303030] transition-all cursor-pointer ${
              showNotifications
                ? "bg-slate-100 dark:bg-[#303030] text-indigo-600"
                : "bg-white dark:bg-[#303030] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#303030]"
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
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
            await markNotificationRead(id);
            setNotifications(notifications.map((item) => (item.id === id ? { ...item, read: 1 } : item)));
          }}
          onDismiss={handleDismissNotification}
        />

        <div className="ml-1 hidden sm:block">
          <Avatar name={user?.name || "Client"} src={user?.avatarUrl || undefined} size="sm" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ðŸ” CLIENT SEARCH MODAL */}
      {/* ========================================================================= */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-[#1f1f1f]/70 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-fadeIn"
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#303030] rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-4 border-b border-slate-100 dark:border-[#303030]/80">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Search active projects, pending invoices, brand assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#303030] rounded-xl pl-11 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">
                {searchQuery ? `Search Results (${filteredSearch.length})` : "Client workspace index"}
              </p>

              {filteredSearch.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setShowSearchModal(false);
                    router.push(item.url);
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-[#303030]/60 hover:text-indigo-600 dark:hover:text-white flex items-center justify-between cursor-pointer group transition-all"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0">
                      {item.category === "Project" && <Briefcase className="h-3.5 w-3.5 text-emerald-500" />}
                      {item.category === "Invoice" && <DollarSign className="h-3.5 w-3.5 text-blue-500" />}
                      {item.category === "Document" && <FileText className="h-3.5 w-3.5 text-amber-500" />}
                      {item.category === "Page" && <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.title}</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate leading-snug">{item.details}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-[#303030] text-slate-500 shrink-0 select-none">
                    {item.category}
                  </span>
                </div>
              ))}

              {filteredSearch.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching deliverables found for &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ðŸŽ CLIENT MODALS */}
      {/* ========================================================================= */}
      
      {/* 1. Request Project */}
      {activeModal === "project" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-[#1f1f1f]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#303030] rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-[#303030]">
              <span className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-500" /> Request Creative Project
              </span>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-650">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={handleRequestProject} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Campaign Goal</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Performance Landing Page"
                  value={qProjName}
                  onChange={(e) => setQProjName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Strategic Requirements</label>
                <textarea
                  placeholder="Specify key parameters, audience groups, and assets..."
                  value={qProjDesc}
                  onChange={(e) => setQProjDesc(e.target.value)}
                  className="w-full h-20 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white resize-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">This sends a message to your account team — they&apos;ll follow up to scope the project.</p>
              <button type="submit" disabled={submittingQuickAction} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md">
                {submittingQuickAction ? "Sending…" : "Submit Campaign Proposal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Message Account Manager */}
      {activeModal === "message" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-[#1f1f1f]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#303030] rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-[#303030]">
              <span className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-indigo-500" /> Send Account Message
              </span>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-650">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={handleQuickMessage} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Direct Message</label>
                <textarea
                  required
                  placeholder="Type a message or brief update to your account team..."
                  value={qMsgText}
                  onChange={(e) => setQMsgText(e.target.value)}
                  className="w-full h-24 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white resize-none"
                />
              </div>
              <button type="submit" disabled={submittingQuickAction} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md">
                {submittingQuickAction ? "Sending…" : "Send Account Message"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Submit Document / Asset */}
      {activeModal === "upload" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-[#1f1f1f]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#303030] rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-[#303030]">
              <span className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4.5 w-4.5 text-indigo-500" /> Submit Brand Deliverable
              </span>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-650">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={handleQuickUpload} className="space-y-4 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Document File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brand assets.zip"
                  value={qDocName}
                  onChange={(e) => setQDocName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-slate-400">This notifies your account team you have a file to share — they&apos;ll send you a secure upload link.</p>
              <button type="submit" disabled={submittingQuickAction} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md">
                {submittingQuickAction ? "Sending…" : "Notify Account Team"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ðŸš€ CLIENT TOAST MESSAGING POPUP NOTIFIER */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between gap-3 border transition-all animate-slideIn bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
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

    </header>
  );
}
