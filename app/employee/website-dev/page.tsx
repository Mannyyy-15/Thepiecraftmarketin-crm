"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  GitBranch,
  GitCommit,
  Globe,
  Plus,
  RefreshCw,
  Server,
  Zap,
  Trash2,
  X,
  Loader2,
  Activity,
  ShieldCheck,
  Cpu,
  BarChart3,
  Search,
  CheckCircle,
  Eye,
  PieChart,
  GaugeCircle
} from "lucide-react";
import { WebsiteDevPageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWebDevDashboardData } from "@/app/actions/crm";
import { useActionCache } from "@/hooks/useActionCache";
import { cn } from "@/components/ui/cn";

const priorityVariant = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
} as const;

const statusColor = {
  operational: "success",
  degraded: "warning",
  outage: "danger",
} as const;

interface WebsiteTask {
  id: string;
  title: string;
  repo: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in-progress" | "in-review" | "blocked" | "done";
  assignee: string;
}

export default function WebsiteDevPage() {
  const { toast, confirmDialog } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WebsiteTask[]>([]);
  const [sitesList, setSitesList] = useState<any[]>([]);

  // Drawer toggles
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);

  // New Ticket Form states
  const [tTitle, setTTitle] = useState("");
  const [tRepo, setTRepo] = useState("");
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [tStatus, setTStatus] = useState<"todo" | "in-progress" | "in-review" | "blocked" | "done">("todo");
  const [tAssignee, setTAssignee] = useState("");

  // GitHub commits
  // GitHub commits & Site Inspector
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [commits, setCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [commitsError, setCommitsError] = useState("");

  const fetchCommits = async (repo: string) => {
    if (!repo) return;
    setCommitsLoading(true);
    setCommitsError("");
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=8`);
      if (res.status === 404 || res.status === 403) throw new Error("Private repository or not found. A GitHub API Token is required.");
      if (!res.ok) throw new Error("Repo not found or rate limited");
      const data = await res.json();
      setCommits(data);
    } catch (err: any) {
      setCommitsError(err.message || "Failed to fetch commits.");
      setCommits([]);
    } finally {
      setCommitsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch not needed unless site is selected
  }, []);

  // New Site Form states
  const [sName, setSName] = useState("");
  const [sUptime, setSUptime] = useState(99.9);
  const [sResponse, setSResponse] = useState(150);
  const [sStatus, setSStatus] = useState<"operational" | "degraded" | "outage">("operational");

  const { data: cachedDashboard, isLoading: actionCacheLoading } = useActionCache<any>("employee:website_dev", getWebDevDashboardData);

  useEffect(() => {
    const dataObj = cachedDashboard?.data || cachedDashboard;
    if (dataObj && (Array.isArray(dataObj.projects) || Array.isArray(dataObj.tasks))) {
      const mappedDomains = (dataObj.projects || []).map((p: any) => {
        let sd: any = {};
        try { sd = JSON.parse(p.serviceDetails || "{}"); } catch(e) {}
        return {
          id: p.id,
          name: p.name,
          url: sd.domain || "",
          client: p.clientName || "Unknown Client",
          status: sd.status || (Number.isFinite(Number(sd.uptime)) ? "operational" : "unconfigured"),
          uptime: Number.isFinite(Number(sd.uptime)) ? Number(sd.uptime) : null,
          response: Number.isFinite(Number(sd.response)) ? Number(sd.response) : null,
          lastChecked: null,
          githubRepo: String(sd.repoLink || "").replace(/^https?:\/\/github\.com\//, "").replace(/\.git\/?$/, ""),
          isLive: sd.isLive === true,
          domainExpiry: sd.domainExpiry || "Not Set",
        };
      });

      const mappedTasks: WebsiteTask[] = (dataObj.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        repo: "",
        status: (t.done || t.status === "done") ? "done"
          : t.status === "in-progress" || t.status === "in_progress" ? "in-progress"
          : t.status === "in-review" ? "in-review"
          : "todo",
        priority: ["low", "medium", "high", "critical"].includes(t.priority) ? t.priority : "medium",
        assignee: "Lead Dev",
      }));

      setSitesList(mappedDomains);
      setTasks(mappedTasks);
      setLoading(false);
    } else if (!actionCacheLoading) {
      setLoading(false);
    }
  }, [cachedDashboard, actionCacheLoading]);

  // Live calculated metrics
  const totalSites = sitesList.length;
  const knownUptime = sitesList.filter((s) => typeof s.uptime === "number");
  const avgUptime = knownUptime.length > 0
    ? (knownUptime.reduce((acc, s) => acc + s.uptime, 0) / knownUptime.length).toFixed(2)
    : null;
  const openTicketsCount = tasks.filter((t) => t.status !== "done").length;
  const knownResponse = sitesList.filter((s) => typeof s.response === "number");
  const avgResponse = knownResponse.length > 0
    ? Math.round(knownResponse.reduce((acc, s) => acc + s.response, 0) / knownResponse.length)
    : null;

  // Handlers
  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle) return;

    const newTicket = {
      id: `task-${Date.now()}`,
      title: tTitle,
      repo: tRepo,
      priority: tPriority,
      status: tStatus,
      assignee: tAssignee,
    };

    setTasks([newTicket, ...tasks]);
    setTTitle("");
    setShowTicketForm(false);
    toast(`Successfully created engineering backlog ticket: "${tTitle}"!`, "success");
  };

  const handleRegisterSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName) return;

    const newSite = {
      name: sName,
      uptime: Number(sUptime),
      response: Number(sResponse),
      status: sStatus as any,
    };

    setSitesList([...sitesList, newSite]);
    setSName("");
    setShowSiteForm(false);
    toast(`Successfully registered domain under management: "${sName}"!`, "success");
  };

  const handleToggleTaskDone = (id: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === "done" ? "todo" : "done";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleInlineStatusChange = (id: string, newStatus: any) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (await confirmDialog(`Are you sure you want to delete ticket "${title}"?`)) {
      setTasks(tasks.filter((t) => t.id !== id));
      toast(`Deleted ticket "${title}"`, "info");
    }
  };

  const handleDeleteSite = async (name: string) => {
    if (await confirmDialog(`Are you sure you want to stop monitoring domain "${name}"?`)) {
      setSitesList(sitesList.filter((s) => s.name !== name));
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-12"
    >
      <PageHeader
        eyebrow="Engineering"
        title="Web Operations"
        actions={
          <Button 
            size="md" 
            disabled
            title="Tickets are managed by an administrator"
            className="font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Ticket
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030]/60 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <p><span className="font-semibold">Read-only view.</span> Tickets, domains, and monitoring settings are managed by an administrator.</p>
      </div>

      <AnimatePresence>
        {/* Slideout New Ticket Form */}
        {showTicketForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="border border-brand-500/30 bg-gradient-to-br from-brand-50/50 to-indigo-50/50 dark:from-brand-500/10 dark:to-indigo-500/5 backdrop-blur-xl shadow-lg">
              <CardHeader className="py-5 border-b border-white/20 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-brand-900 dark:text-brand-100">
                      <div className="h-6 w-6 rounded-md bg-white dark:bg-[#303030] flex items-center justify-center shadow-sm">
                        <Code2 className="h-3.5 w-3.5 text-brand-500" />
                      </div>
                      Create Engineering Ticket
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-brand-700/70 dark:text-brand-300/60">Define the engineering task and commit to the backlog.</CardDescription>
                  </div>
                  <button onClick={() => setShowTicketForm(false)} className="h-8 w-8 rounded-full bg-white/50 dark:bg-[#303030]/50 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <form onSubmit={handleAddTicket} className="grid grid-cols-1 md:grid-cols-5 gap-x-6 gap-y-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Ticket Title</label>
                    <input type="text" required placeholder="e.g. Integrate Stripe Checkout" value={tTitle} onChange={(e) => setTTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Code Repository</label>
                    <input type="text" required value={tRepo} onChange={(e) => setTRepo(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Severity Priority</label>
                    <select value={tPriority} onChange={(e) => setTPriority(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Assign Lead Dev</label>
                    <select value={tAssignee} onChange={(e) => setTAssignee(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      <option value="">Assigned by administrator</option>
                    </select>
                  </div>
                  <div className="flex md:col-span-5 justify-end mt-2">
                    <Button type="submit" className="h-11 px-8 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md border-none">
                      Log Ticket to Backlog
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Slideout Register Site Form */}
        {showSiteForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-500/10 dark:to-teal-500/5 backdrop-blur-xl shadow-lg">
              <CardHeader className="py-5 border-b border-white/20 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                      <div className="h-6 w-6 rounded-md bg-white dark:bg-[#303030] flex items-center justify-center shadow-sm">
                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      Register Domain Monitor
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-emerald-700/70 dark:text-emerald-300/60">Initialize tracking for a new client site.</CardDescription>
                  </div>
                  <button onClick={() => setShowSiteForm(false)} className="h-8 w-8 rounded-full bg-white/50 dark:bg-[#303030]/50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <form onSubmit={handleRegisterSite} className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-end">
                  {/* Form fields styled similarly to above */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Domain URL</label>
                    <input type="text" required value={sName} onChange={(e) => setSName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Target Response (ms)</label>
                    <input type="number" required value={sResponse} onChange={(e) => setSResponse(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Expected Uptime (%)</label>
                    <input type="number" step="0.01" required value={sUptime} onChange={(e) => setSUptime(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Ping Status</label>
                      <select value={sStatus} onChange={(e) => setSStatus(e.target.value as any)}
                        className="h-11 w-full rounded-xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                        <option value="operational">Operational</option>
                        <option value="degraded">Degraded</option>
                        <option value="outage">Outage</option>
                      </select>
                    </div>
                    <Button type="submit" className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md border-none">
                      Deploy
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Glassmorphic KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard 
          title="Sites Managed" 
          value={totalSites.toString()} 
          icon={<Globe className="h-5 w-5" />} 
          gradient="from-indigo-500/20 to-violet-500/20"
          iconColor="text-indigo-500"
        />
        <StatsCard 
          title="Avg Uptime" 
          value={avgUptime === null ? "Not monitored" : `${avgUptime}%`}
          icon={<Server className="h-5 w-5" />} 
          gradient="from-emerald-500/20 to-teal-500/20"
          iconColor="text-emerald-500"
        />
        <StatsCard 
          title="Open Tickets" 
          value={openTicketsCount.toString()} 
          icon={<AlertTriangle className="h-5 w-5" />} 
          gradient="from-amber-500/20 to-orange-500/20"
          iconColor="text-amber-500"
        />
        <StatsCard 
          title="Avg. Response" 
          value={avgResponse === null ? "Not monitored" : `${avgResponse} ms`}
          icon={<Zap className="h-5 w-5" />} 
          gradient="from-blue-500/20 to-cyan-500/20"
          iconColor="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Engineering Backlog */}
        <Card className="xl:col-span-2 overflow-hidden shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#303030]/60 pb-4">
            <div>
              <CardTitle className="text-lg">Engineering Backlog</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                <p className="text-xs font-bold text-slate-500">{tasks.length} active tickets</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled title="Tickets are managed by an administrator" className="text-xs font-bold rounded-xl bg-white dark:bg-[#1f1f1f] shadow-sm border-slate-200 dark:border-[#303030]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Ticket
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-[#303030]/60 p-2 sm:p-4 bg-slate-50/50 dark:bg-[#303030]/20">
            {tasks.map((t) => {
              const isCompleted = t.status === "done";
              return (
                <motion.div 
                  key={t.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "group flex items-center gap-4 p-4 rounded-xl border mb-2 transition-all duration-200 bg-white dark:bg-[#1f1f1f] shadow-sm hover:shadow-md",
                    isCompleted ? "opacity-60 border-slate-200/50 dark:border-[#303030]/50" : "border-slate-200 dark:border-[#303030] hover:border-brand-300 dark:hover:border-brand-700/50"
                  )}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      disabled
                      title="Task status is managed by an administrator"
                      className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-[#3f3f3f] text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-not-allowed transition-all"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className={cn("text-sm font-bold truncate", isCompleted ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>
                        {t.title}
                      </p>
                      <Badge variant={priorityVariant[t.priority]} className="text-[9px] uppercase font-extrabold tracking-wider">{t.priority}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-[#303030] px-2 py-0.5 rounded-md text-[10px]">
                        <GitBranch className="h-3 w-3" /> {t.repo}
                      </span>
                      
                      {/* Premium Status Select */}
                      <select
                        value={t.status}
                        disabled
                        title="Task status is managed by an administrator"
                        className={cn(
                          "rounded-md border bg-transparent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide focus:outline-none transition-colors cursor-pointer",
                          isCompleted ? "border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400" : "border-slate-200 text-slate-600 dark:border-[#3f3f3f] dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700"
                        )}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="in-review">In Review</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Assignee Avatar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Avatar name={t.assignee} size="sm" />
                  </div>

                  <button
                    disabled
                    className="h-8 w-8 rounded-full bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#3f3f3f] text-slate-400 flex items-center justify-center cursor-not-allowed transition-all shadow-sm opacity-40 shrink-0"
                    title="Tickets are managed by an administrator"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
            {tasks.length === 0 && (
              <EmptyState icon={<Code2 className="h-5 w-5" />} title="Backlog is clear" description="Add a new ticket to start tracking engineering work." />
            )}
          </div>
        </Card>

        {/* Site Health Tracker */}
        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#303030]/60 pb-4">
              <div>
                <CardTitle className="text-lg">Network Health</CardTitle>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Live Managed Domains</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled
                  title="Monitoring sync is managed by an administrator"
                  className="h-8 px-3 rounded-full flex items-center justify-center bg-white dark:bg-[#1f1f1f] shadow-sm border-slate-200 dark:border-[#303030] text-xs font-bold"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Admin sync only
                </Button>
                <Button variant="outline" size="sm" disabled title="Domains are managed by an administrator" className="h-8 w-8 p-0 rounded-full flex items-center justify-center bg-white dark:bg-[#1f1f1f] shadow-sm border-slate-200 dark:border-[#303030]">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 bg-slate-50/30 dark:bg-[#303030]/10">
              {sitesList.map((s) => (
                <div key={s.name} className="rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-4 group relative hover:border-brand-500/30 transition-all shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                        {s.name}
                        {s.status === "operational" && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums mt-1">
                        {s.response === null ? "Response not monitored" : `${s.response} ms`} <span className="mx-1 text-slate-300 dark:text-slate-700">•</span> {s.uptime === null ? "Uptime not monitored" : `${s.uptime}% SLA`}
                        <span className="mx-1 text-slate-300 dark:text-slate-700">•</span> Expiry: <span className="font-bold text-slate-700 dark:text-slate-300">{s.domainExpiry}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.isLive && (
                        <Badge variant="success" className="shadow-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Live</span>
                        </Badge>
                      )}
                      <Badge variant={statusColor[s.status as keyof typeof statusColor] || "neutral"} className="shadow-sm">
                        {s.status === "operational" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        <span className="capitalize">{s.status}</span>
                      </Badge>
                      
                      <button
                        disabled
                        title="Domains are managed by an administrator"
                        className="h-8 w-8 rounded-full bg-white dark:bg-[#303030] border border-slate-200 dark:border-[#3f3f3f] text-slate-400 flex items-center justify-center cursor-not-allowed transition-all shadow-sm opacity-40 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {sitesList.length === 0 && (
                <EmptyState icon={<Globe className="h-5 w-5" />} title="No domains registered" description="Register a client domain to start monitoring." />
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* -------------------- SITE INSPECTOR -------------------- */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#303030] pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="h-6 w-6 text-brand-500" />
              Site Inspector
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Deep-dive into a specific project&apos;s performance and infrastructure.</p>
          </div>
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              const selected = sitesList.find(s => String(s.id) === e.target.value);
              if (selected?.githubRepo) fetchCommits(selected.githubRepo);
            }}
            className="h-11 rounded-xl border-2 border-brand-500/20 bg-brand-50/50 dark:bg-brand-900/10 px-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-brand-500 w-full sm:w-72"
          >
            <option value="">Select a Project to Inspect...</option>
            {sitesList.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {selectedSiteId ? (
          <SiteInspectorView 
            site={sitesList.find(s => String(s.id) === selectedSiteId)} 
            commits={commits} 
            commitsLoading={commitsLoading} 
            commitsError={commitsError} 
            fetchCommits={fetchCommits}
          />
        ) : (
          <EmptyState icon={<Eye className="h-8 w-8" />} title="No project selected" description="Select a project from the dropdown above to view its detailed Lighthouse scores, infrastructure, and traffic." />
        )}
      </div>
    </motion.div>
  );
}

function SiteInspectorView({ site, commits, commitsLoading, commitsError, fetchCommits }: any) {
  if (!site) return null;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Lighthouse Scores */}
      <Card className="shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-[#303030]/60">
          <CardTitle className="text-lg flex items-center gap-2"><GaugeCircle className="h-4.5 w-4.5 text-emerald-500" /> PageSpeed Scores</CardTitle>
          <CardDescription className="text-xs">Connect PageSpeed Insights to collect verified metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <EmptyState icon={<GaugeCircle className="h-8 w-8" />} title="PageSpeed not connected" description="No score is shown until a real PageSpeed Insights integration returns data." />
        </CardContent>
      </Card>
      
      {/* Infrastructure & Security */}
      <Card className="shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-[#303030]/60">
          <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-4.5 w-4.5 text-blue-500" /> Infrastructure</CardTitle>
          <CardDescription className="text-xs">Hosting and security details</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
            <span className="text-xs font-bold text-slate-500">Tech Stack</span>
            <span className="text-sm font-black text-slate-500">Not recorded</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
            <span className="text-xs font-bold text-slate-500">Hosting</span>
            <span className="text-sm font-black text-slate-500">Not recorded</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
            <span className="text-xs font-bold text-slate-500">SSL Expiry</span>
            <span className="text-sm font-black text-slate-500">Not monitored</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#303030] border border-slate-100 dark:border-[#303030]">
            <span className="text-xs font-bold text-slate-500">Domain Expiry</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">{site.domainExpiry}</span>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring & Traffic */}
      <Card className="shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-[#303030]/60">
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-4.5 w-4.5 text-rose-500" /> Monitoring</CardTitle>
          <CardDescription className="text-xs">Traffic & Application Health</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <EmptyState icon={<Activity className="h-8 w-8" />} title="Monitoring not connected" description="Connect uptime, analytics, and error monitoring before health data is displayed." />
        </CardContent>
      </Card>

      {/* GitHub Commits Feed (Moved into Site Inspector) */}
      <Card className="xl:col-span-3 shadow-sm border-slate-200/60 dark:border-[#303030]/60 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#303030]/60 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCommit className="h-4.5 w-4.5 text-brand-500" />
              GitHub Commits Feed
            </CardTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{site.githubRepo ? `Live from repository: ${site.githubRepo}` : "No repository connected"}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => site.githubRepo && fetchCommits(site.githubRepo)}
            disabled={!site.githubRepo}
            className="h-9 w-9 p-0 rounded-xl flex items-center justify-center"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${commitsLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {commitsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030]/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : commitsError ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-4 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {commitsError}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {commits.map((c: any, idx: number) => (
                <div key={c.sha || idx} className="rounded-xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030] p-3 hover:border-brand-300 dark:hover:border-brand-700/50 transition-all group">
                  <div className="flex items-start gap-2.5 mb-2">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt={c.author?.login} className="h-7 w-7 rounded-full border-2 border-brand-200 dark:border-brand-900 shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center shrink-0">
                        <GitCommit className="h-3.5 w-3.5 text-brand-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                        {c.author?.login || c.commit?.author?.name || "Unknown"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        {c.sha?.slice(0, 7)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-medium">
                    {c.commit?.message?.split("\n")[0] || "—"}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-2">
                    {c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              ))}
              {commits.length === 0 && (
                <div className="col-span-4 text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-[#303030] rounded-2xl">
                  No commits found for this repository.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRing({ label, score }: { label: string; score: number }) {
  const color = score >= 90 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#303030] rounded-2xl border border-slate-100 dark:border-[#303030] hover:shadow-md transition-all">
      <div className="relative h-16 w-16 flex items-center justify-center">
        <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
          <path className="text-slate-200 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
          <path className={color} strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        <span className="absolute text-lg font-black text-slate-900 dark:text-white">{score}</span>
      </div>
      <span className="text-[10px] font-extrabold text-slate-500 mt-3 uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}
  
  // Internal component for the premium glassmorphic KPI cards
function StatsCard({ title, value, icon, gradient, iconColor }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-[#303030]/60 bg-white/60 dark:bg-[#303030]/40 p-5 shadow-lg backdrop-blur-xl group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} blur-3xl opacity-50 group-hover:opacity-70 transition-opacity`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={cn("rounded-xl bg-white dark:bg-[#1f1f1f] p-2.5 shadow-sm border border-slate-100 dark:border-[#303030]", iconColor)}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
