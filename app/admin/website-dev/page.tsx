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
  Loader2
} from "lucide-react";
import { WebsiteDevPageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { websiteTasks } from "@/lib/mock";
import { EmptyState } from "@/components/ui/EmptyState";
import { getWebDevDashboardData } from "@/app/actions/crm";
import { cn } from "@/components/ui/cn";

const priorityVariant = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
} as const;

const initialSites = [
  { name: "acme.com", uptime: 99.98, response: 142, status: "operational" as const },
  { name: "stark-industries.com", uptime: 99.74, response: 312, status: "degraded" as const },
  { name: "wayne-enterprises.com", uptime: 100, response: 98, status: "operational" as const },
  { name: "hooli.com", uptime: 99.99, response: 184, status: "operational" as const },
  { name: "massive.dynamic", uptime: 97.21, response: 514, status: "outage" as const },
];

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
  const [isUsingMock, setIsUsingMock] = useState(false);

  // Drawer toggles
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);

  // New Ticket Form states
  const [tTitle, setTTitle] = useState("");
  const [tRepo, setTRepo] = useState("github.com/client/repo");
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [tStatus, setTStatus] = useState<"todo" | "in-progress" | "in-review" | "blocked" | "done">("todo");
  const [tAssignee, setTAssignee] = useState("Priya Shah");

  // GitHub commits
  const [commits, setCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [githubRepo, setGithubRepo] = useState("vercel/next.js");
  const [commitsError, setCommitsError] = useState("");

  const fetchCommits = async (repo: string) => {
    setCommitsLoading(true);
    setCommitsError("");
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=8`);
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

  useEffect(() => { fetchCommits(githubRepo); }, []);

  // New Site Form states
  const [sName, setSName] = useState("");
  const [sUptime, setSUptime] = useState(99.9);
  const [sResponse, setSResponse] = useState(150);
  const [sStatus, setSStatus] = useState<"operational" | "degraded" | "outage">("operational");

  useEffect(() => {
    (async () => {
      const res = await getWebDevDashboardData();
      if (res.success && res.data && (res.data.projects.length > 0 || res.data.tasks.length > 0)) {
        
        // Map DB Web Dev Projects -> Domains
        const mappedDomains = res.data.projects.map((p: any) => {
          let sd: any = {};
          try { sd = JSON.parse(p.serviceDetails || "{}"); } catch(e) {}
          return {
            name: sd.websiteUrl || p.name,
            uptime: sd.uptime || 100,
            response: sd.response || 100,
            status: sd.siteStatus || "operational"
          };
        });

        // Map DB Tasks -> Engineering Backlog
        const mappedTasks = res.data.tasks.map((t: any) => ({
          id: String(t.id),
          title: t.title,
          repo: "github.com/repo",
          priority: t.priority as any,
          status: t.status as any,
          assignee: "Lead Dev",
        }));

        setSitesList(mappedDomains.length > 0 ? mappedDomains : initialSites);
        setTasks(mappedTasks.length > 0 ? mappedTasks : (websiteTasks as WebsiteTask[]));
        setIsUsingMock(false);

      } else {
        // Fallback to beautiful mock data
        setSitesList(initialSites);
        setTasks(websiteTasks as WebsiteTask[]);
        setIsUsingMock(true);
      }
      setLoading(false);
    })();
  }, []);

  // Live calculated metrics
  const totalSites = sitesList.length;
  const avgUptime = sitesList.length > 0
    ? (sitesList.reduce((acc, s) => acc + s.uptime, 0) / sitesList.length).toFixed(2)
    : "0.00";
  const openTicketsCount = tasks.filter((t) => t.status !== "done").length;
  const avgResponse = sitesList.length > 0
    ? Math.round(sitesList.reduce((acc, s) => acc + s.response, 0) / sitesList.length)
    : 0;

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

  if (loading) return <WebsiteDevPageSkeleton />;

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
        description={isUsingMock ? "Currently displaying rich mock data (database returned 0 active web dev projects)." : "Monitor sites under management and track active engineering tasks."}
        actions={
          <Button 
            size="md" 
            onClick={() => setShowTicketForm(!showTicketForm)} 
            className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-all border-none"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Ticket
          </Button>
        }
      />

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
                      <div className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Code2 className="h-3.5 w-3.5 text-brand-500" />
                      </div>
                      Create Engineering Ticket
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-brand-700/70 dark:text-brand-300/60">Define the engineering task and commit to the backlog.</CardDescription>
                  </div>
                  <button onClick={() => setShowTicketForm(false)} className="h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <form onSubmit={handleAddTicket} className="grid grid-cols-1 md:grid-cols-5 gap-x-6 gap-y-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Ticket Title</label>
                    <input type="text" required placeholder="e.g. Integrate Stripe Checkout" value={tTitle} onChange={(e) => setTTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Code Repository</label>
                    <input type="text" required value={tRepo} onChange={(e) => setTRepo(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Severity Priority</label>
                    <select value={tPriority} onChange={(e) => setTPriority(e.target.value as any)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Assign Lead Dev</label>
                    <select value={tAssignee} onChange={(e) => setTAssignee(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      <option>Priya Shah</option>
                      <option>Sam Okafor</option>
                      <option>Mateo Alvarez</option>
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
                      <div className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      Register Domain Monitor
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-emerald-700/70 dark:text-emerald-300/60">Initialize tracking for a new client site.</CardDescription>
                  </div>
                  <button onClick={() => setShowSiteForm(false)} className="h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-sm">
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
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Target Response (ms)</label>
                    <input type="number" required value={sResponse} onChange={(e) => setSResponse(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Expected Uptime (%)</label>
                    <input type="number" step="0.01" required value={sUptime} onChange={(e) => setSUptime(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-emerald-900/60 dark:text-emerald-100/50 uppercase tracking-widest mb-1.5">Ping Status</label>
                      <select value={sStatus} onChange={(e) => setSStatus(e.target.value as any)}
                        className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
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
        <PremiumKpiCard 
          title="Sites Managed" 
          value={totalSites.toString()} 
          change="+1" 
          changeType="positive" 
          icon={<Globe className="h-5 w-5" />} 
          gradient="from-indigo-500/20 to-violet-500/20"
          iconColor="text-indigo-500"
        />
        <PremiumKpiCard 
          title="Avg Uptime" 
          value={`${avgUptime}%`} 
          change="+0.2%" 
          changeType="positive" 
          icon={<Server className="h-5 w-5" />} 
          gradient="from-emerald-500/20 to-teal-500/20"
          iconColor="text-emerald-500"
        />
        <PremiumKpiCard 
          title="Open Tickets" 
          value={openTicketsCount.toString()} 
          change="-3" 
          changeType="positive" 
          icon={<Code2 className="h-5 w-5" />} 
          gradient="from-amber-500/20 to-orange-500/20"
          iconColor="text-amber-500"
        />
        <PremiumKpiCard 
          title="Avg. Response" 
          value={`${avgResponse} ms`} 
          change="-12ms" 
          changeType="positive" 
          icon={<Zap className="h-5 w-5" />} 
          gradient="from-cyan-500/20 to-blue-500/20"
          iconColor="text-cyan-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Engineering Backlog */}
        <Card className="xl:col-span-2 overflow-hidden shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
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
            <Button variant="outline" size="sm" onClick={() => setShowTicketForm(true)} className="text-xs font-bold rounded-xl bg-white dark:bg-slate-950 shadow-sm border-slate-200 dark:border-slate-800">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Ticket
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-4 bg-slate-50/50 dark:bg-slate-900/20">
            {tasks.map((t) => {
              const isCompleted = t.status === "done";
              return (
                <motion.div 
                  key={t.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "group flex items-center gap-4 p-4 rounded-xl border mb-2 transition-all duration-200 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md",
                    isCompleted ? "opacity-60 border-slate-200/50 dark:border-slate-800/50" : "border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700/50"
                  )}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => handleToggleTaskDone(t.id)}
                      className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-slate-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer transition-all"
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
                      <span className="inline-flex items-center gap-1.5 font-medium bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-[10px]">
                        <GitBranch className="h-3 w-3" /> {t.repo}
                      </span>
                      
                      {/* Premium Status Select */}
                      <select
                        value={t.status}
                        onChange={(e) => handleInlineStatusChange(t.id, e.target.value as any)}
                        className={cn(
                          "rounded-md border bg-transparent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide focus:outline-none transition-colors cursor-pointer",
                          isCompleted ? "border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700"
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
                    onClick={() => handleDeleteTask(t.id, t.title)}
                    className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 flex items-center justify-center cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete Ticket"
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
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <div>
                <CardTitle className="text-lg">Network Health</CardTitle>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Live Managed Domains</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSiteForm(true)} className="h-8 w-8 p-0 rounded-full flex items-center justify-center bg-white dark:bg-slate-950 shadow-sm border-slate-200 dark:border-slate-800">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
              {sitesList.map((s) => (
                <div key={s.name} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 group relative hover:border-brand-500/30 transition-all shadow-sm">
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
                        {s.response} ms <span className="mx-1 text-slate-300 dark:text-slate-700">•</span> {s.uptime}% SLA
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColor[s.status as keyof typeof statusColor] || "neutral"} className="shadow-sm">
                        {s.status === "operational" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        <span className="capitalize">{s.status}</span>
                      </Badge>
                      
                      <button
                        onClick={() => handleDeleteSite(s.name)}
                        className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 flex items-center justify-center cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100 shrink-0"
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

      {/* GitHub Commits Feed */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCommit className="h-4.5 w-4.5 text-brand-500" />
              GitHub Commits Feed
            </CardTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Live from GitHub API</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-mono focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white w-44"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchCommits(githubRepo)}
              className="h-9 w-9 p-0 rounded-xl flex items-center justify-center"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${commitsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {commitsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-20" />
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
              {commits.map((c, idx) => (
                <div key={c.sha || idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 hover:border-brand-300 dark:hover:border-brand-700/50 transition-all group">
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
                <div className="col-span-4 text-center py-6 text-slate-400 text-sm">No commits found for this repository.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Internal component for the premium glassmorphic KPI cards
function PremiumKpiCard({ title, value, change, changeType, icon, gradient, iconColor }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-5 shadow-lg backdrop-blur-xl group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Background glow */}
      <div className={`absolute -inset-10 bg-gradient-to-br ${gradient} opacity-40 blur-2xl group-hover:opacity-60 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
          
          <div className="mt-3 flex items-center gap-1.5">
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              changeType === "positive" 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" 
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
            )}>
              {change}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">avg 30d</span>
          </div>
        </div>
        
        <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform">
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
