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
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { getCurrentUser } from "@/app/actions/auth";
import { getClientDashboardData } from "@/app/actions/crm";
import { getClientProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

// Local helper logic kept intact

const engagementData = [
  { week: "W1", sessions: 4.2, conversions: 1.1 },
  { week: "W2", sessions: 5.1, conversions: 1.4 },
  { week: "W3", sessions: 6.4, conversions: 2.0 },
  { week: "W4", sessions: 7.8, conversions: 2.6 },
  { week: "W5", sessions: 8.9, conversions: 3.1 },
  { week: "W6", sessions: 9.4, conversions: 3.5 },
];

const updates = [
  {
    id: "u1",
    title: "Landing page mockups approved",
    detail:
      "The design team has finalized the UI mockups based on your feedback. Moving into development this week.",
    time: "Today at 10:45 AM",
    who: "Lena Park",
    accent: true,
  },
  {
    id: "u2",
    title: "Meta Ads Q4 launch — live",
    detail:
      "Campaigns are now live. We will monitor the learning phase over the next 48 hours and report back.",
    time: "Yesterday",
    who: "Mateo Alvarez",
  },
  {
    id: "u3",
    title: "Brand audit delivered",
    detail:
      "Audit report uploaded to your Files. Two priority recommendations attached.",
    time: "May 18, 2026",
    who: "Priya Shah",
  },
];

export default function ClientOverviewPage() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<{ projects: any[], actionItems: any[], upcomingMilestones: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (u) setUser({ name: u.name as string, email: u.email as string });
      const res = await getClientDashboardData();
      if (res.success && res.data) setDashboardData(res.data);
      setLoading(false);
    })();
  }, []);

  const projects = dashboardData?.projects || [];
  const actionItems = dashboardData?.actionItems || [];
  const upcomingMilestones = dashboardData?.upcomingMilestones || [];

  const activeProjects = projects.filter((p: any) => p.status !== "completed").length;
  const completedProjects = projects.filter((p: any) => p.status === "completed").length;
  const nextMilestone = upcomingMilestones[0];
  const firstName = (user?.name || "there").split(" ")[0];

  const getProgressByStatus = (status: string) => {
    if (status === "planning") return 15;
    if (status === "in_progress" || status === "in-progress") return 55;
    if (status === "in_review" || status === "review") return 85;
    if (status === "completed") return 100;
    return 30;
  };

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-3xl bg-portal-hero p-6 sm:p-8 text-white shadow-soft">
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/80 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Your Portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/85 max-w-xl">
              Here&apos;s how your engagements with ThePieCraft are tracking. Your active package is{" "}
              <span className="font-semibold text-white">Enterprise Retainer</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="md" className="bg-white/15 text-white hover:bg-white/25 shadow-none">
              <MessageSquare className="h-4 w-4" />
              Message team
            </Button>
            <Button variant="secondary" size="md" className="bg-white text-portal-700 hover:bg-slate-100 shadow-none">
              <Download className="h-4 w-4" />
              Latest report
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Projects"
          value={`${activeProjects}`}
          change={loading ? "—" : "Live engagements"}
          changeType="neutral"
          accent="portal"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Completed"
          value={`${completedProjects}`}
          change="+1 this quarter"
          changeType="positive"
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Next Milestone"
          value={nextMilestone?.date || "—"}
          change={nextMilestone?.title || ""}
          changeType="neutral"
          accent="amber"
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="Hours Logged"
          value="148.5"
          change="+12.4h this week"
          changeType="positive"
          accent="brand"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Engagement chart + milestones */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Engagement Snapshot</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Site sessions (k) and conversions (k) — last 6 weeks
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-portal-500" /> Sessions
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> Conversions
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(value: number) => `${value}k`}
                  />
                  <Area type="monotone" dataKey="sessions" stroke="#14B8A6" strokeWidth={2.5} fill="url(#sessGrad)" name="Sessions" />
                  <Area type="monotone" dataKey="conversions" stroke="#6366F1" strokeWidth={2.5} fill="url(#convGrad)" name="Conversions" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <Button variant="ghost" size="sm" className="text-portal-700 dark:text-portal-300">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMilestones.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No upcoming milestones tracked.</p>
            ) : (
              upcomingMilestones.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                  <div className="h-10 w-10 rounded-xl bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300 flex items-center justify-center shrink-0">
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

      {/* Active projects + Updates + Action items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Active Projects</CardTitle>
            <Button variant="ghost" size="sm" className="text-portal-700 dark:text-portal-300">
              All projects <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">Loading your projects…</p>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">No active engagements yet — your account team will assign new projects here.</p>
              </div>
            ) : (
              projects.slice(0, 4).map((p) => {
                const progress = getProgressByStatus(p.status);
                return (
                  <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-glow transition-shadow">
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
               <p className="text-xs text-slate-500 py-4 text-center">You are all caught up! No pending actions.</p>
            ) : (
              actionItems.map((a: any) => (
                <div
                  key={a.id}
                  className={
                    a.tone === "warning"
                      ? "rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3"
                      : a.tone === "info"
                      ? "rounded-xl border border-portal-200 dark:border-portal-500/20 bg-portal-50 dark:bg-portal-500/5 p-3"
                      : "rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3"
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

      {/* Recent updates timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <Button variant="ghost" size="sm" className="text-portal-700 dark:text-portal-300">
            All updates <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6">
            {updates.map((u, i) => (
              <li key={u.id} className="relative pl-8 sm:pl-10">
                {/* connector */}
                {i !== updates.length - 1 && (
                  <span className="absolute left-3 sm:left-4 top-6 bottom-[-1.5rem] w-px bg-slate-200 dark:bg-slate-800" />
                )}
                <span
                  className={`absolute left-0 top-0 inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-950 ${
                    u.accent ? "bg-portal-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.title}</p>
                    {u.accent && <Badge variant="portal">New</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Avatar name={u.who} size="xs" />
                    {u.who} • {u.time}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{u.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
