"use client";

import { Calendar, Download, FileText, Filter, Plus, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const monthlyData = [
  { month: "Dec", clients: 8, projects: 14, hours: 320 },
  { month: "Jan", clients: 9, projects: 18, hours: 412 },
  { month: "Feb", clients: 10, projects: 16, hours: 388 },
  { month: "Mar", clients: 11, projects: 22, hours: 504 },
  { month: "Apr", clients: 12, projects: 24, hours: 540 },
  { month: "May", clients: 14, projects: 26, hours: 580 },
];

const recentReports = [
  { id: "r1", title: "Acme Corp — May 2026 Performance", type: "Monthly", client: "Acme Corp", generated: "May 20, 2026", size: "2.4 MB" },
  { id: "r2", title: "Q2 Agency Health Report", type: "Quarterly", client: "Internal", generated: "May 18, 2026", size: "8.1 MB" },
  { id: "r3", title: "Stark Industries — Ad ROAS Deep Dive", type: "Custom", client: "Stark Industries", generated: "May 17, 2026", size: "1.2 MB" },
  { id: "r4", title: "Wayne Enterprises — SEO Audit", type: "Audit", client: "Wayne Enterprises", generated: "May 14, 2026", size: "3.6 MB" },
  { id: "r5", title: "Hooli — Conversion Funnel Analysis", type: "Custom", client: "Hooli", generated: "May 10, 2026", size: "1.8 MB" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Agency Growth Trend</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clients, projects, billable hours — last 6 months
            </p>
          </div>
          <select className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
            <option>Last 6 months</option>
            <option>YTD</option>
            <option>Last year</option>
          </select>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                  itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                <Bar dataKey="clients" name="Clients" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="projects" name="Projects" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hours" name="Hours" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-3.5 w-3.5" /> Date
            </Button>
          </div>
        </CardHeader>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentReports.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
              <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.title}</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <Badge variant="brand">{r.type}</Badge>
                  <span>{r.client}</span>
                  <span>•</span>
                  <span>{r.generated}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{r.size}</span>
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
  );
}
