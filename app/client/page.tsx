"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { getCurrentUser } from "@/app/actions/auth";
import { getClientDashboardData, getClientInvoices } from "@/app/actions/crm";
import { getClientProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

export default function ClientOverviewPage() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<{ projects: any[]; actionItems: any[]; upcomingMilestones: any[] } | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, dashRes, invRes] = await Promise.all([
        getCurrentUser(),
        getClientDashboardData(),
        getClientInvoices(),
      ]);
      if (u) setUser({ name: u.name as string, email: u.email as string });
      if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      if (invRes.success) setInvoices(invRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const projects = dashboardData?.projects || [];
  const actionItems = dashboardData?.actionItems || [];
  const upcomingMilestones = dashboardData?.upcomingMilestones || [];

  const activeProjects = projects.filter((p: any) => p.status !== "completed").length;
  const completedProjects = projects.filter((p: any) => p.status === "completed").length;
  const nextMilestone = upcomingMilestones[0];
  const pendingInvoices = invoices.filter((i: any) => i.status === "pending" || i.status === "overdue");
  const firstName = (user?.name || "there").split(" ")[0];

  const getProgressByStatus = (status: string) => {
    if (status === "planning") return 15;
    if (status === "in_progress" || status === "in-progress") return 55;
    if (status === "in_review" || status === "review") return 85;
    if (status === "completed") return 100;
    return 30;
  };

  const progressData = projects.map((p: any) => ({
    name: (p.name || "Project").length > 12 ? p.name.slice(0, 12) + "…" : (p.name || "Project"),
    progress: typeof p.progress === "number" && p.progress > 0 ? p.progress : getProgressByStatus(p.status),
  }));

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-portal-hero p-6 sm:p-8 text-white">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/80 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Your Portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-white/85 max-w-xl">
              Here&apos;s how your engagements with ThePieCraft are tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              className="bg-white/15 text-white hover:bg-white/25 shadow-none border-0"
              onClick={() => window.location.href = "/client/messages"}
            >
              <MessageSquare className="h-4 w-4" />
              Message team
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="bg-white text-portal-700 hover:bg-slate-100 shadow-none"
              onClick={() => window.location.href = "/client/documents"}
            >
              <Download className="h-4 w-4" />
              Documents
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Projects"
          value={loading ? "—" : `${activeProjects}`}
          change="Live engagements"
          changeType="neutral"
          accent="portal"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Completed"
          value={loading ? "—" : `${completedProjects}`}
          change={completedProjects > 0 ? `${completedProjects} delivered` : "None yet"}
          changeType={completedProjects > 0 ? "positive" : "neutral"}
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Next Milestone"
          value={loading ? "—" : nextMilestone?.date || "None"}
          change={nextMilestone?.title || "No upcoming tasks"}
          changeType="neutral"
          accent="amber"
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Invoices"
          value={loading ? "—" : `${pendingInvoices.length}`}
          change={pendingInvoices.length > 0 ? "Awaiting payment" : "All settled"}
          changeType={pendingInvoices.length > 0 ? "negative" : "positive"}
          accent="brand"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* Engagement chart + milestones */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Project Progress</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Completion across your active engagements
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64 sm:h-72">
              {progressData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                  <Target className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs text-slate-400">No active projects yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid rgba(20,184,166,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12 }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                      itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                      formatter={(value: number) => `${value}%`}
                    />
                    <Area type="monotone" dataKey="progress" stroke="#14B8A6" strokeWidth={2.5} fill="url(#progGrad)" name="Progress" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-portal-700 dark:text-portal-300"
              onClick={() => window.location.href = "/client/projects"}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMilestones.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Target className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                <p className="text-xs text-slate-500">No upcoming milestones tracked.</p>
              </div>
            ) : (
              upcomingMilestones.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="h-8 w-8 rounded-lg bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.project}</p>
                    <p className="text-xs font-semibold text-portal-600 dark:text-portal-400 mt-1 tabular-nums">{m.date}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active projects + Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Active Projects</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-portal-700 dark:text-portal-300"
              onClick={() => window.location.href = "/client/projects"}
            >
              All projects <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 border-2 border-slate-200 border-t-portal-500 rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No active engagements yet — your account team will assign new projects here.</p>
              </div>
            ) : (
              projects.slice(0, 4).map((p: any) => {
                const progress = getProgressByStatus(p.status);
                return (
                  <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Deadline {p.deadline || "TBD"}
                        </p>
                      </div>
                      <Badge dot variant={getClientProjectStatusVariant(p.status)}>
                        {getProjectStatusLabel(p.status)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress
                        value={progress}
                        size="sm"
                        className="flex-1"
                        barClassName="bg-gradient-to-r from-portal-500 to-portal-600"
                      />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                        {progress}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Action Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                <p className="text-xs text-slate-500">All caught up — no pending actions.</p>
              </div>
            ) : (
              actionItems.map((a: any) => (
                <div
                  key={a.id}
                  className={
                    a.tone === "warning"
                      ? "rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3"
                      : a.tone === "info"
                      ? "rounded-lg border border-portal-200 dark:border-portal-500/20 bg-portal-50 dark:bg-portal-500/5 p-3"
                      : "rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3"
                  }
                >
                  <p
                    className={
                      a.tone === "warning"
                        ? "text-sm font-semibold text-amber-900 dark:text-amber-300"
                        : a.tone === "info"
                        ? "text-sm font-semibold text-portal-900 dark:text-portal-200"
                        : "text-sm font-semibold text-slate-900 dark:text-white"
                    }
                  >
                    {a.title}
                  </p>
                  <p
                    className={
                      a.tone === "warning"
                        ? "text-xs text-amber-700 dark:text-amber-400 mt-0.5"
                        : a.tone === "info"
                        ? "text-xs text-portal-700 dark:text-portal-300 mt-0.5"
                        : "text-xs text-slate-500 dark:text-slate-400 mt-0.5"
                    }
                  >
                    {a.detail}
                  </p>
                  <div className="mt-2.5">
                    <Button
                      size="sm"
                      variant={a.tone === "warning" ? "primary" : a.tone === "info" ? "portal" : "outline"}
                      onClick={() => window.location.href = "/client/invoices"}
                    >
                      {a.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Milestones timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMilestones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Calendar className="h-7 w-7 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No milestones scheduled.</p>
              <p className="text-xs text-slate-400">Upcoming deliverables will appear here once tasks are created.</p>
            </div>
          ) : (
            <ol className="relative space-y-6">
              {upcomingMilestones.map((m: any, i: number) => (
                <li key={m.id} className="relative pl-8 sm:pl-10">
                  {i !== upcomingMilestones.length - 1 && (
                    <span className="absolute left-3 sm:left-4 top-6 bottom-[-1.5rem] w-px bg-slate-200 dark:bg-slate-800" />
                  )}
                  <span className={`absolute left-0 top-0 inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${i === 0 ? "bg-portal-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                    <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</p>
                      {i === 0 && <Badge variant="portal">Next up</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.project} · Due {m.date}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
