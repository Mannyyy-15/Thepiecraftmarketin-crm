"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  GitBranch,
  Globe,
  Plus,
  Server,
  Zap,
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { websiteTasks } from "@/lib/mock";
import { getTaskStatusVariant } from "@/lib/statusHelpers";

const priorityVariant = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
} as const;

const sites = [
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

export default function WebsiteDevPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Sites Managed" value="12" change="+1" changeType="positive" accent="brand" icon={<Globe className="h-5 w-5" />} />
        <KpiCard title="Avg Uptime" value="99.4%" change="+0.2%" changeType="positive" accent="emerald" icon={<Server className="h-5 w-5" />} />
        <KpiCard title="Open Tickets" value="14" change="-3" changeType="positive" accent="amber" icon={<Code2 className="h-5 w-5" />} />
        <KpiCard title="Avg Lighthouse" value="92" change="+4" changeType="positive" accent="portal" icon={<Zap className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Engineering Backlog</CardTitle>
            <Badge variant="brand">{websiteTasks.length} active</Badge>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {websiteTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 cursor-pointer" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.title}</p>
                    <Badge variant={priorityVariant[t.priority]} dot>{t.priority}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> {t.repo}
                    </span>
                    <Badge variant={getTaskStatusVariant(t.status)}>{t.status.replace("-", " ")}</Badge>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Avatar name={t.assignee} size="xs" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{t.assignee.split(" ")[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sites.map((s) => (
              <div key={s.name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {s.response} ms • {s.uptime}% uptime
                    </p>
                  </div>
                  <Badge variant={statusColor[s.status]} dot>
                    {s.status === "operational" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {s.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
