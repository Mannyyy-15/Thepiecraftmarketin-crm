"use client";

import { useState, useEffect } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getReports } from "@/app/actions/crm";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportsData = async () => {
    setIsLoading(true);
    const response = await getReports();

    if (response?.success && response.data) {
      setReports(response.data);
    } else {
      setReports([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleOpenReport = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold tracking-wide uppercase">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((report) => {
            const category = report.name?.toLowerCase().includes("monthly") ? "Monthly" :
              report.name?.toLowerCase().includes("quarterly") ? "Quarterly" :
              report.name?.toLowerCase().includes("seo") || report.name?.toLowerCase().includes("audit") ? "Audit" : "Custom";

            return (
              <div key={report.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{report.name}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="brand">{category}</Badge>
                    <span>{report.clientName || "Internal"}</span>
                    {report.createdAt && (
                      <>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </>
                    )}
                    {report.size && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{report.size}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!report.url}
                  title={report.url ? "Open report" : "No report file is attached"}
                  onClick={() => report.url && handleOpenReport(report.url)}
                >
                  <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Open</span>
                </Button>
              </div>
            );
          })}
          {reports.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No reports are available yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
