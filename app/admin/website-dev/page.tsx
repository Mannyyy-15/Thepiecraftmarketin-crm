"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  GitBranch,
  Globe,
  Plus,
  Server,
  Zap,
  Trash2,
  X,
  Check
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { websiteTasks } from "@/lib/mock";
import { EmptyState } from "@/components/ui/EmptyState";

const priorityVariant = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
} as const;

const statusVariant = {
  todo: "neutral",
  "in-progress": "brand",
  "in-review": "warning",
  blocked: "danger",
  done: "success",
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

  const [tasks, setTasks] = useState<WebsiteTask[]>(websiteTasks as WebsiteTask[]);
  const [sitesList, setSitesList] = useState(initialSites);

  // Drawer toggles
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);

  // New Ticket Form states
  const [tTitle, setTTitle] = useState("");
  const [tRepo, setTRepo] = useState("github.com/acme/landing");
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [tStatus, setTStatus] = useState<"todo" | "in-progress" | "in-review" | "blocked" | "done">("todo");
  const [tAssignee, setTAssignee] = useState("Priya Shah");

  // New Site Form states
  const [sName, setSName] = useState("");
  const [sUptime, setSUptime] = useState(99.9);
  const [sResponse, setSResponse] = useState(150);
  const [sStatus, setSStatus] = useState<"operational" | "degraded" | "outage">("operational");

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
      status: sStatus,
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
    }
  };

  const handleDeleteSite = async (name: string) => {
    if (await confirmDialog(`Are you sure you want to stop monitoring domain "${name}"?`)) {
      setSitesList(sitesList.filter((s) => s.name !== name));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engineering"
        title="Website Dev"
        description="Monitor sites under management and track engineering tasks."
        actions={
          <Button size="md" onClick={() => setShowTicketForm(!showTicketForm)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
            <Plus className="h-4 w-4 mr-1" />
            New ticket
          </Button>
        }
      />

      {/* Slideout New Ticket Form */}
      {showTicketForm && (
        <Card className="border border-brand-500/30 bg-brand-50/10 dark:bg-brand-500/5 animate-fadeIn">
          <CardHeader className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Code2 className="h-4.5 w-4.5 text-indigo-500" /> Create Engineering Ticket
                </CardTitle>
                <CardDescription className="text-xs">Title, repo, assignee, priority, and initial status.</CardDescription>
              </div>
              <button onClick={() => setShowTicketForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <form onSubmit={handleAddTicket} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Ticket Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Integrate Stripe Checkout SDK"
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Code Repository
                </label>
                <input
                  type="text"
                  required
                  placeholder="github.com/brand/repo"
                  value={tRepo}
                  onChange={(e) => setTRepo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Severity Priority
                </label>
                <select
                  value={tPriority}
                  onChange={(e) => setTPriority(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Initial Status
                </label>
                <select
                  value={tStatus}
                  onChange={(e) => setTStatus(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Completed (Done)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Assign Lead Dev
                </label>
                <select
                  value={tAssignee}
                  onChange={(e) => setTAssignee(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="Priya Shah">Priya Shah</option>
                  <option value="Sam Okafor">Sam Okafor</option>
                  <option value="Mateo Alvarez">Mateo Alvarez</option>
                  <option value="Jordan Wells">Jordan Wells</option>
                  <option value="Aisha Rahman">Aisha Rahman</option>
                  <option value="Yuki Tanaka">Yuki Tanaka</option>
                  <option value="Lena Park">Lena Park</option>
                </select>
              </div>
              <div className="flex md:col-span-5 justify-end">
                <Button type="submit" className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm px-6">
                  Log Ticket to Backlog
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Slideout Register Site Form */}
      {showSiteForm && (
        <Card className="border border-brand-500/30 bg-brand-50/10 dark:bg-brand-500/5 animate-fadeIn">
          <CardHeader className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="h-4.5 w-4.5 text-emerald-500" /> Register Domain under Management
                </CardTitle>
                <CardDescription className="text-xs">Domain URL, target response time, and initial ping status.</CardDescription>
              </div>
              <button onClick={() => setShowSiteForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <form onSubmit={handleRegisterSite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Domain URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. myclientdomain.com"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Target Response Time (ms)
                </label>
                <input
                  type="number"
                  required
                  value={sResponse}
                  onChange={(e) => setSResponse(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Expected Uptime (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sUptime}
                  onChange={(e) => setSUptime(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Ping Status
                  </label>
                  <select
                    value={sStatus}
                    onChange={(e) => setSStatus(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                  >
                    <option value="operational">Operational</option>
                    <option value="degraded">Degraded Health</option>
                    <option value="outage">Outage Alert</option>
                  </select>
                </div>
                <Button type="submit" className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-sm">
                  Register Domain
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stateful calculated KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Sites Managed" value={totalSites.toString()} change="+1" changeType="positive" accent="brand" icon={<Globe className="h-5 w-5" />} />
        <KpiCard title="Avg Uptime" value={`${avgUptime}%`} change="+0.2%" changeType="positive" accent="emerald" icon={<Server className="h-5 w-5" />} />
        <KpiCard title="Open Tickets" value={openTicketsCount.toString()} change="-3" changeType="positive" accent="amber" icon={<Code2 className="h-5 w-5" />} />
        <KpiCard title="Avg. Response" value={`${avgResponse} ms`} change="-12ms" changeType="positive" accent="portal" icon={<Zap className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        
        {/* Backlog Ticketing Board */}
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Engineering Backlog</CardTitle>
              <Badge variant="brand" className="mt-1">{tasks.length} active tickets</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTicketForm(true)} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Ticket
            </Button>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((t) => {
              const isCompleted = t.status === "done";
              return (
                <div key={t.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleTaskDone(t.id)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    title="Mark complete"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold truncate ${isCompleted ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                        {t.title}
                      </p>
                      <Badge variant={priorityVariant[t.priority]} dot>{t.priority}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <GitBranch className="h-3 w-3" /> {t.repo}
                      </span>
                      
                      {/* Inline Status Shifter Dropdown */}
                      <select
                        value={t.status}
                        onChange={(e) => handleInlineStatusChange(t.id, e.target.value as any)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-brand-500 font-bold"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="in-review">In Review</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Completed</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Lead developers */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Avatar name={t.assignee} size="xs" />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">{t.assignee.split(" ")[0]}</span>
                  </div>

                  {/* Delete Trigger */}
                  <button
                    onClick={() => handleDeleteTask(t.id, t.title)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all"
                    title="Delete Ticket"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <EmptyState icon={<Code2 className="h-5 w-5" />} title="Backlog is clear" description="Add a new ticket to start tracking engineering work." />
            )}
          </div>
        </Card>

        {/* Site Health Tracker */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Site Health</CardTitle>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">Managed Domains</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSiteForm(true)} className="h-8 w-8 p-0 rounded-full flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sitesList.map((s) => (
                <div key={s.name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 group relative hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        {s.response} ms • {s.uptime}% uptime
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor[s.status]} dot>
                        {s.status === "operational" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        <span className="capitalize">{s.status}</span>
                      </Badge>
                      
                      {/* Delete Domain trigger */}
                      <button
                        onClick={() => handleDeleteSite(s.name)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all shrink-0"
                        title="Deregister domain"
                      >
                        <Trash2 className="h-3 w-3" />
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
    </div>
  );
}

