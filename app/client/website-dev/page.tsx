"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  GitBranch,
  GitCommit,
  Globe,
  RefreshCw,
  Server,
  Zap,
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
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WebsiteTask[]>([]);
  const [sitesList, setSitesList] = useState<any[]>([]);

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

  useEffect(() => {
    (async () => {
      const res = await getWebDevDashboardData();
      if (res.success && res.data && (res.data.projects.length > 0 || res.data.tasks.length > 0)) {
        // Map DB projects to frontend "domains/sites"
        const mappedDomains = res.data.projects.map((p: any) => {
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

        const mappedTasks: WebsiteTask[] = res.data.tasks.map((t: any) => ({
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
      } else {
        // No web-dev data yet - show empty states rather than fake data.
        setSitesList([]);
        setTasks([]);
      }
      setLoading(false);
    })();
  }, []);

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
        description="A read-only view of website delivery, monitoring, and engineering activity shared by your team."
      />

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
            <Badge variant="neutral">Read only</Badge>
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
                    {isCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Code2 className="h-5 w-5 text-slate-400" />}
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
                      
                      <Badge variant={isCompleted ? "success" : t.status === "blocked" ? "danger" : "neutral"}>
                        {t.status.replace(/-/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Assignee Avatar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Avatar name={t.assignee} size="sm" />
                  </div>

                </motion.div>
              );
            })}
            {tasks.length === 0 && (
              <EmptyState icon={<Code2 className="h-5 w-5" />} title="No shared tickets" description="Your account team has not shared any engineering tickets in the client portal." />
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
              <Badge variant="neutral">Managed by your account team</Badge>
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
                      
                    </div>
                  </div>
                </div>
              ))}
              {sitesList.length === 0 && (
                <EmptyState icon={<Globe className="h-5 w-5" />} title="No monitored domains" description="Your account team has not shared a monitored domain yet." />
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* -------------------- SITE INSPECTOR -------------------- */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
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
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="text-lg flex items-center gap-2"><GaugeCircle className="h-4.5 w-4.5 text-emerald-500" /> PageSpeed Scores</CardTitle>
          <CardDescription className="text-xs">Verified PageSpeed data</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <EmptyState icon={<GaugeCircle className="h-8 w-8" />} title="PageSpeed not connected" description="No score is shown until verified monitoring data is available." />
        </CardContent>
      </Card>
      
      {/* Infrastructure & Security */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-4.5 w-4.5 text-blue-500" /> Infrastructure</CardTitle>
          <CardDescription className="text-xs">Hosting and security details</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500">Tech Stack</span>
            <span className="text-sm font-black text-slate-500">Not shared</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500">Hosting</span>
            <span className="text-sm font-black text-slate-500">Not shared</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500">SSL Expiry</span>
            <span className="text-sm font-black text-slate-500">Not monitored</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500">Domain Expiry</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">{site.domainExpiry}</span>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring & Traffic */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-4.5 w-4.5 text-rose-500" /> Monitoring</CardTitle>
          <CardDescription className="text-xs">Traffic & Application Health</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <EmptyState icon={<Activity className="h-8 w-8" />} title="Monitoring not connected" description="Traffic and application-health data will appear after a verified integration is connected." />
        </CardContent>
      </Card>

      {/* GitHub Commits Feed (Moved into Site Inspector) */}
      <Card className="xl:col-span-3 shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
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
                <div className="col-span-4 text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
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
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
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
    <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-5 shadow-lg backdrop-blur-xl group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} blur-3xl opacity-50 group-hover:opacity-70 transition-opacity`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={cn("rounded-xl bg-white dark:bg-slate-950 p-2.5 shadow-sm border border-slate-100 dark:border-slate-800", iconColor)}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
