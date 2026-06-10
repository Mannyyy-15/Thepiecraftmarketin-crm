"use client";

import {
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const performanceData = [
  { month: "Dec", roas: 2.4, ctr: 1.6 },
  { month: "Jan", roas: 2.8, ctr: 1.9 },
  { month: "Feb", roas: 3.1, ctr: 2.2 },
  { month: "Mar", roas: 3.6, ctr: 2.8 },
  { month: "Apr", roas: 3.9, ctr: 3.1 },
  { month: "May", roas: 4.2, ctr: 3.4 },
];

const reports = [
  { id: "r1", name: "May 2026 — Performance Report", type: "Monthly", date: "Jun 01, 2026", size: "2.4 MB", featured: true },
  { id: "r2", name: "Q2 Brand Health Snapshot", type: "Quarterly", date: "May 28, 2026", size: "5.8 MB" },
  { id: "r3", name: "Meta Ads — Q2 Deep Dive", type: "Custom", date: "May 22, 2026", size: "1.2 MB" },
  { id: "r4", name: "Website Launch — Recap", type: "Project", date: "May 15, 2026", size: "3.6 MB" },
  { id: "r5", name: "SEO Audit & Roadmap", type: "Audit", date: "May 06, 2026", size: "1.8 MB" },
  { id: "r6", name: "April 2026 — Performance Report", type: "Monthly", date: "May 01, 2026", size: "2.2 MB" },
];

const typeVariant: Record<string, "portal" | "brand" | "warning" | "info" | "neutral"> = {
  Monthly: "portal",
  Quarterly: "brand",
  Custom: "warning",
  Project: "info",
  Audit: "neutral",
};

export default function ClientReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Performance reports, audits, and deep-dives delivered by your account team."
        actions={
          <>
            <Button variant="outline" size="md">
              <Sparkles className="h-4 w-4" />
              Request analysis
            </Button>
            <Button variant="portal" size="md">
              <Download className="h-4 w-4" />
              Latest PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Avg ROAS"
          value="4.2×"
          change="+0.3× MoM"
          changeType="positive"
          accent="portal"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="CTR"
          value="3.4%"
          change="+0.3%"
          changeType="positive"
          accent="brand"
        />
        <KpiCard
          title="Conv. Rate"
          value="2.8%"
          change="+0.1%"
          changeType="positive"
          accent="emerald"
        />
        <KpiCard
          title="Reports YTD"
          value={`${reports.length}`}
          change="6 delivered"
          changeType="neutral"
          accent="amber"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Performance Trend</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ROAS (×) and CTR (%) across the last six months
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-portal-500" /> ROAS
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> CTR
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                  itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                <Line type="monotone" dataKey="roas" name="ROAS (×)" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3, fill: "#14B8A6" }} />
                <Line type="monotone" dataKey="ctr" name="CTR (%)" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366F1" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Featured + list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="relative h-32 bg-portal-hero">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute bottom-4 left-5">
              <Badge variant="portal" className="bg-white/15 text-white border border-white/20">
                Featured this month
              </Badge>
            </div>
          </div>
          <CardContent>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {reports[0].name}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Delivered {reports[0].date} • {reports[0].size}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-portal-500 shrink-0" />
                ROAS climbed to 4.2× (+0.3× MoM)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-portal-500 shrink-0" />
                Top campaign: Spring Sale Lookalike — 6.1× ROAS
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-portal-500 shrink-0" />
                Recommend +18% budget shift to retargeting
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <Button variant="portal" size="sm">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button variant="outline" size="sm">
                Read online <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative max-w-xs hidden sm:block">
                <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search reports…"
                  className="h-9 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40 focus:border-portal-500"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5" /> Filter
              </Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant={typeVariant[r.type] ?? "neutral"}>{r.type}</Badge>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {r.date}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline tabular-nums">{r.size}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
