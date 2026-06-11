"use client";

import {
  Activity,
  DollarSign,
  Eye,
  MousePointerClick,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
import { adsCampaigns } from "@/lib/mock";
import { getCampaignStatusVariant } from "@/lib/statusHelpers";

const campaignPerformance = [
  { day: "Mon", impressions: 320, clicks: 8.2 },
  { day: "Tue", impressions: 380, clicks: 9.6 },
  { day: "Wed", impressions: 410, clicks: 11.1 },
  { day: "Thu", impressions: 350, clicks: 9.8 },
  { day: "Fri", impressions: 480, clicks: 13.4 },
  { day: "Sat", impressions: 520, clicks: 14.2 },
  { day: "Sun", impressions: 460, clicks: 12.8 },
];

const roasByCampaign = adsCampaigns
  .filter((c) => c.status !== "draft")
  .map((c) => ({ name: c.name.split(" ")[0], roas: c.roas }));

export default function AdsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Spend" value="₹124.5k" change="+12.5%" changeType="positive" accent="brand" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard title="Impressions" value="5.3M" change="+18.2%" changeType="positive" accent="amber" icon={<Eye className="h-5 w-5" />} />
        <KpiCard title="Clicks" value="115.9k" change="+9.4%" changeType="positive" accent="emerald" icon={<MousePointerClick className="h-5 w-5" />} />
        <KpiCard title="Avg. ROAS" value="3.2×" change="-0.4×" changeType="negative" accent="rose" icon={<Target className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Weekly Performance</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Impressions (k) vs clicks (k) — last 7 days
              </p>
            </div>
            <Badge variant="success" dot>Live</Badge>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignPerformance} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Line type="monotone" dataKey="impressions" name="Impressions (k)" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366F1" }} />
                  <Line type="monotone" dataKey="clicks" name="Clicks (k)" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3, fill: "#14B8A6" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROAS by Campaign</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roasByCampaign} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} width={60} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(15,23,42,0.9)", color: "white", fontSize: 12 }}
                    formatter={(v: number) => `${v}×`}
                  />
                  <Bar dataKey="roas" fill="#6366F1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <Button variant="ghost" size="sm">
            <TrendingUp className="h-3.5 w-3.5" /> Sort by ROAS
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Campaign</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Client</th>
                <th className="px-5 py-3 text-right font-semibold">Spend</th>
                <th className="px-5 py-3 text-right font-semibold hidden sm:table-cell">Impr.</th>
                <th className="px-5 py-3 text-right font-semibold hidden sm:table-cell">CTR</th>
                <th className="px-5 py-3 text-right font-semibold">ROAS</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {adsCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.platform}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{c.client}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-white">${c.spend.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{(c.impressions / 1000).toFixed(0)}k</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{c.ctr.toFixed(1)}%</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                    <span className={c.roas >= 3 ? "text-emerald-600 dark:text-emerald-400" : c.roas >= 1.5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                      {c.roas}×
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge dot variant={getCampaignStatusVariant(c.status)}>{c.status[0].toUpperCase() + c.status.slice(1)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
