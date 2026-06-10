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
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getCurrentUser } from "@/app/actions/auth";

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
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) {
        setUser({ name: res.name as string, email: res.email as string });
      }
    });
  }, []);

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [notifications, setNotifications] = useState([
    { id: "cn1", title: "Brand Brief Uploaded", message: "Lena Park uploaded 'Acme - Brand Guidelines v3.pdf'.", time: "10m ago", read: false, icon: <FileText className="h-3.5 w-3.5 text-indigo-500" /> },
    { id: "cn2", title: "Invoice Released", message: "INV-2026-0144 for $22,000 has been issued.", time: "1h ago", read: false, icon: <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> },
    { id: "cn3", title: "Project Stage Shifted", message: "Website Redesign moved to In-Progress stage.", time: "Yesterday", read: true, icon: <Briefcase className="h-3.5 w-3.5 text-amber-500" /> },
  ]);

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

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setHasUnread(false);
    addToast("All client alerts marked as read", "info");
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter((n) => n.id !== id));
    if (notifications.filter((n) => n.id !== id && !n.read).length === 0) {
      setHasUnread(false);
    }
  };

  // Search Items optimized for client view
  const searchItems: SearchItem[] = [
    { title: "Website Redesign Progress", category: "Project", url: "/client/projects", details: "View staging columns, milestones & team" },
    { title: "Brand Identity Refresh", category: "Project", url: "/client/projects", details: "Completed deliverables & design specs" },
    { title: "Invoice INV-2026-0144", category: "Invoice", url: "/client/invoices", details: "$22,000 • Issued May 12, 2026 • Status: Pending" },
    { title: "Invoice INV-2026-0142", category: "Invoice", url: "/client/invoices", details: "$8,400 • Issued May 01, 2026 • Status: Paid" },
    { title: "Acme — Brand Guidelines v3.pdf", category: "Document", url: "/client/documents", details: "4.2 MB • Updated May 18, 2026 by Lena Park" },
    { title: "Stark Q3 Campaign Brief.docx", category: "Document", url: "/client/documents", details: "1.1 MB • Updated May 17, 2026 by Priya Shah" },
    { title: "Timesheet & Billing History", category: "Page", url: "/client/invoices", details: "Verify hours billed & payment schedules" },
    { title: "Brand Resources & Contracts", category: "Page", url: "/client/documents", details: "Download legal agreements, logos & guides" },
    { title: "Project Deliverables Board", category: "Page", url: "/client/projects", details: "Track agile sprints, approvals & stage status" },
  ];

  const filteredSearch = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Submission handles
  const handleRequestProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qProjName) return;
    addToast(`Successfully submitted creative project request: "${qProjName}"!`);
    setQProjName("");
    setQProjDesc("");
    setActiveModal(null);
  };

  const handleQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qMsgText) return;
    addToast("Message successfully sent to Priya Shah (Account Lead)!");
    setQMsgText("");
    setActiveModal(null);
  };

  const handleQuickUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qDocName) return;
    addToast(`Uploaded brand document "${qDocName}" to shared vault!`);
    setQDocName("");
    setActiveModal(null);
  };

  return (
    <header className="z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-5 flex h-14 sm:h-16 shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl shadow-soft px-3 sm:px-4">
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

      <div className="hidden md:flex items-center gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Acme Corp</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 relative">
        
        {/* Help Message Shortcut */}
        <button
          onClick={() => setActiveModal("message")}
          className="hidden sm:inline-flex items-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
          <div className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-12 text-xs text-slate-450 dark:text-slate-500 flex items-center select-none">
            Search projects, invoices…
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:text-slate-400">
            <Command className="h-2 w-2" />K
          </kbd>
        </div>

        {/* Search toggle mobile */}
        <button
          type="button"
          onClick={() => setShowSearchModal(true)}
          className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
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
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ${
              showQuickActions 
                ? "bg-indigo-600 text-white shadow-glow border-indigo-600" 
                : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            title="Submit Briefs & Requests"
          >
            <Plus className={`h-4 w-4 transition-transform duration-250 ${showQuickActions ? "rotate-45" : ""}`} />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl z-50 animate-fadeIn">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">Actions</p>
              
              <button
                onClick={() => { setActiveModal("project"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5" /> Request Project
              </button>

              <button
                onClick={() => { setActiveModal("upload"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Submit Document / Asset
              </button>

              <button
                onClick={() => { setActiveModal("message"); setShowQuickActions(false); }}
                className="w-full text-left px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Send Account Message
              </button>
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* Bell Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowQuickActions(false);
            }}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer ${
              showNotifications 
                ? "bg-slate-100 dark:bg-slate-800 text-indigo-600" 
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/10">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Workspace Alerts</span>
                {hasUnread && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      setNotifications(notifications.map(item => item.id === n.id ? { ...item, read: true } : item));
                      if (notifications.filter(item => item.id !== n.id && !item.read).length === 0) setHasUnread(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      n.read ? "hover:bg-slate-50/40 dark:hover:bg-slate-900/10" : "bg-indigo-500/5 hover:bg-indigo-500/10"
                    }`}
                  >
                    <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {n.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-bold truncate ${n.read ? "text-slate-800 dark:text-slate-200" : "text-indigo-600 dark:text-indigo-400"}`}>{n.title}</p>
                        <span className="text-[9px] text-slate-400 font-medium tabular-nums">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">{n.message}</p>
                    </div>
                    <button 
                      onClick={(e) => handleDismissNotification(n.id, e)}
                      className="text-slate-450 hover:text-rose-600 p-0.5 rounded transition-colors"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Check className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    All caught up! No notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-1 hidden sm:block">
          <Avatar name={user?.name || "Client"} size="sm" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔍 CLIENT SEARCH MODAL */}
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
            <div className="relative p-4 border-b border-slate-100 dark:border-slate-800/80">
              <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Search active projects, pending invoices, brand assets..."
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

            <div className="max-h-[420px] overflow-y-auto p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">
                {searchQuery ? `Search Results (${filteredSearch.length})` : "Acme Client Vault Index"}
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
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 select-none">
                    {item.category}
                  </span>
                </div>
              ))}

              {filteredSearch.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching deliverables found for "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎁 CLIENT MODALS */}
      {/* ========================================================================= */}
      
      {/* 1. Request Project */}
      {activeModal === "project" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
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
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Strategic Requirements</label>
                <textarea
                  placeholder="Specify key parameters, audience groups, and assets..."
                  value={qProjDesc}
                  onChange={(e) => setQProjDesc(e.target.value)}
                  className="w-full h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white resize-none"
                />
              </div>
              <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md">
                Submit Campaign Proposal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Message Account Manager */}
      {activeModal === "message" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
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
                  placeholder="Type a message or brief updates to Priya Shah (Account Lead)..."
                  value={qMsgText}
                  onChange={(e) => setQMsgText(e.target.value)}
                  className="w-full h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white resize-none"
                />
              </div>
              <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md">
                Send Account Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Submit Document / Asset */}
      {activeModal === "upload" && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
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
                  placeholder="e.g. Acme Logo Vectors highres.zip"
                  value={qDocName}
                  onChange={(e) => setQDocName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md">
                Publish Document
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 CLIENT TOAST MESSAGING POPUP NOTIFIER */}
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
