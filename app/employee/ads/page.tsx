"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Loader2,
  Megaphone,
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
import { getCampaignStatusVariant } from "@/lib/statusHelpers";
import { getMetaCampaigns, getClients } from "@/app/actions/crm";

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clientMap, setClientMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cr, clr] = await Promise.all([getMetaCampaigns(), getClients()]);
        if (cr.success && cr.data) setCampaigns(cr.data as any[]);
        if (clr.success && clr.data) {
          const m: Record<number, string> = {};
          (clr.data as any[]).forEach(c => { m[c.id] = c.name; });
          setClientMap(m);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derive KPIs + chart data from real campaigns.
  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const impressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
    const clicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const roasVals = campaigns.filter(c => c.roas > 0).map(c => c.roas);
    const avgRoas = roasVals.length ? roasVals.reduce((a, b) => a + b, 0) / roasVals.length : 0;
    return { spend, impressions, clicks, avgRoas };
  }, [campaigns]);

  const roasByCampaign = useMemo(
    () => campaigns.filter(c => c.status !== "draft").map(c => ({ name: (c.name || "").split(" ")[0], roas: c.roas || 0 })).slice(0, 8),
    [campaigns]
  );

  const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Spend" value={`₹${fmtK(totals.spend)}`} change={`${campaigns.length} campaigns`} changeType="neutral" accent="brand" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard title="Impressions" value={fmtK(totals.impressions)} change="all time" changeType="neutral" accent="amber" icon={<Eye className="h-5 w-5" />} />
        <KpiCard title="Clicks" value={fmtK(totals.clicks)} change="all time" changeType="neutral" accent="emerald" icon={<MousePointerClick className="h-5 w-5" />} />
        <KpiCard title="Avg. ROAS" value={`${totals.avgRoas.toFixed(1)}×`} change={totals.avgRoas >= 3 ? "Strong" : "Monitor"} changeType={totals.avgRoas >= 3 ? "positive" : "neutral"} accent="rose" icon={<Target className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Spend vs Clicks by Campaign</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spend (₹k) and clicks (k) per active campaign
              </p>
            </div>
            <Badge variant="success" dot>Live</Badge>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64">
              {campaigns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                  <Megaphone className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs text-slate-400">No campaigns yet.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaigns.map(c => ({ name: (c.name || "").split(" ")[0], spend: Math.round((c.spend || 0) / 1000), clicks: Math.round((c.clicks || 0) / 1000) }))} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Line type="monotone" dataKey="spend" name="Spend (₹k)" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366F1" }} />
                  <Line type="monotone" dataKey="clicks" name="Clicks (k)" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 3, fill: "#14B8A6" }} />
                </LineChart>
              </ResponsiveContainer>
              )}
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
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No campaigns yet.</p>
                      <p className="text-xs text-slate-400">Meta Ads campaigns will appear here once created.</p>
                    </div>
                  </td>
                </tr>
              ) : campaigns.map((c) => {
                const clientName = c.clientName || (c.clientId ? clientMap[c.clientId] : "") || "—";
                const ctr = c.ctr || (c.impressions ? (c.clicks / c.impressions) * 100 : 0);
                return (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.platform || "Meta Ads"}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{clientName}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-white">₹{(c.spend || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{((c.impressions || 0) / 1000).toFixed(0)}k</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{ctr.toFixed(1)}%</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                    <span className={c.roas >= 3 ? "text-emerald-600 dark:text-emerald-400" : c.roas >= 1.5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                      {(c.roas || 0).toFixed(1)}×
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge dot variant={getCampaignStatusVariant(c.status)}>{(c.status || "active")[0].toUpperCase() + (c.status || "active").slice(1)}</Badge>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
