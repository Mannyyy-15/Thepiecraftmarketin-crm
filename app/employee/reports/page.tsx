"use client";

import { useState, useEffect } from "react";
import { Download, FileText, Filter, Calendar, RefreshCw } from "lucide-react";
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
import { getReports, getReportsTrendAndAI } from "@/app/actions/crm";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportsData = async () => {
    setIsLoading(true);
    const repRes = await getReports();
    const trendRes = await getReportsTrendAndAI();
    
    if (repRes && repRes.success && repRes.data) {
      setReports(repRes.data);
    }
    if (trendRes && trendRes.success && trendRes.data) {
      setMonthlyData(trendRes.data.monthlyData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleDownloadPDF = (title: string) => {
    alert(`Initiating download for: ${title}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold tracking-wide uppercase">Compiling Insights...</p>
        </div>
      </div>
    );
  }

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
          {reports.map((r) => {
            const cat = r.name?.toLowerCase().includes("monthly") ? "Monthly" :
                        r.name?.toLowerCase().includes("quarterly") ? "Quarterly" :
                        r.name?.toLowerCase().includes("seo") || r.name?.toLowerCase().includes("audit") ? "Audit" : "Custom";
            return (
              <div key={r.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.name}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="brand">{cat}</Badge>
                    <span>{r.clientName || "Internal"}</span>
                    <span>•</span>
                    <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{r.size || "1.2 MB"}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(r.name)}>
                  <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">PDF</span>
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
