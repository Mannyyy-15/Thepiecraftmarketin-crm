"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Code2,
  Globe,
  Server,
  Zap,
  Loader2,
  Layers,
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTaskStatusVariant, getClientStatusVariant } from "@/lib/statusHelpers";
import { getWebDevDashboardData } from "@/app/actions/crm";

const priorityVariant: Record<string, any> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export default function WebsiteDevPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getWebDevDashboardData();
        if (res.success && res.data) {
          setProjects((res.data as any).projects || []);
          setTasks((res.data as any).tasks || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== "done" && !t.done).length;
    const activeProjects = projects.filter(p => p.status !== "completed").length;
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
      : 0;
    return { openTasks, activeProjects, avgProgress };
  }, [projects, tasks]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Web Projects" value={`${projects.length}`} change={`${stats.activeProjects} active`} changeType="neutral" accent="brand" icon={<Globe className="h-5 w-5" />} />
        <KpiCard title="Active Projects" value={`${stats.activeProjects}`} change="in progress" changeType="neutral" accent="emerald" icon={<Server className="h-5 w-5" />} />
        <KpiCard title="Open Tasks" value={`${stats.openTasks}`} change={`${tasks.length} total`} changeType="neutral" accent="amber" icon={<Code2 className="h-5 w-5" />} />
        <KpiCard title="Avg Progress" value={`${stats.avgProgress}%`} change={stats.avgProgress > 60 ? "On track" : "Ramping"} changeType={stats.avgProgress > 60 ? "positive" : "neutral"} accent="portal" icon={<Zap className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Engineering Backlog</CardTitle>
            <Badge variant="brand">{tasks.length} task{tasks.length === 1 ? "" : "s"}</Badge>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Code2 className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No backlog tasks.</p>
                <p className="text-xs text-slate-400">Tasks on web-dev projects will appear here.</p>
              </div>
            ) : tasks.map((t) => {
              const proj = projects.find(p => p.id === t.projectId);
              return (
              <div key={t.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.title}</p>
                    <Badge variant={priorityVariant[t.priority] || "neutral"} dot>{t.priority}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {proj && <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {proj.name}</span>}
                    <Badge variant={getTaskStatusVariant(t.status)}>{(t.status || "todo").replace("-", " ")}</Badge>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Web Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Globe className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No web-dev projects yet.</p>
              </div>
            ) : projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {p.deadline ? `Due ${p.deadline}` : "No deadline"}{typeof p.progress === "number" ? ` • ${p.progress}%` : ""}
                    </p>
                  </div>
                  <Badge variant={getClientStatusVariant(p.status)} dot>{(p.status || "planning").replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
