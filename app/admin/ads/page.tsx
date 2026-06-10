"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState } from "react";
import {
  Activity,
  DollarSign,
  Eye,
  MousePointerClick,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  X,
  Pause,
  Play
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { adsCampaigns } from "@/lib/mock";
import { getCampaignStatusVariant } from "@/lib/statusHelpers";

const campaignPerformance = [
  { day: "Mon", impressions: 320, clicks: 8.2 },
  { day: "Tue", impressions: 380, clicks: 9.6 },
  { day: "Wed", impressions: 410, clicks: 11.1 },
  { day: "Thu", impressions: 350, clicks: 9.8 },
  { day: "Fri", impressions: 480, clicks: 13.4 },
  { day: "Sat", impressions: 520, opacity: 14.2 },
  { day: "Sun", impressions: 460, clicks: 12.8 },
];

export default function AdsPage() {
  const { toast, confirmDialog } = useToast();

  const [campaigns, setCampaigns] = useState(adsCampaigns);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortByRoas, setSortByRoas] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [client, setClient] = useState("Acme Corp");
  const [platform, setPlatform] = useState("Meta Ads");
  const [spend, setSpend] = useState(12500);
  const [impressions, setImpressions] = useState(550000);
  const [clicks, setClicks] = useState(12000);
  const [roas, setRoas] = useState(3.4);
  const [status, setStatus] = useState<"active" | "paused" | "draft">("active");

  // Dynamic KPI Calculations
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const avgRoas = campaigns.length > 0 ? (campaigns.reduce((acc, c) => acc + c.roas, 0) / campaigns.length) : 0;

  // Formatting helpers
  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // Calculate CTR dynamically
    const calculatedCtr = clicks > 0 && impressions > 0 ? (clicks / impressions) * 100 : 0.2;

    const newCampaign = {
      id: `c-${Date.now()}`,
      name,
      client,
      platform,
      spend: Number(spend),
      impressions: Number(impressions),
      clicks: Number(clicks),
      ctr: calculatedCtr,
      roas: Number(roas),
      status,
    };

    setCampaigns([newCampaign, ...campaigns]);
    setName("");
    setShowAddForm(false);
    toast(`Successfully launched campaign "${name}" for client "${client}"!`, "success");
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (await confirmDialog(`Are you sure you want to completely delete the campaign "${name}"?`)) {
      setCampaigns(campaigns.filter((c) => c.id !== id));
    }
  };

  const toggleCampaignStatus = (id: string) => {
    setCampaigns(
      campaigns.map((c) => {
        if (c.id === id) {
          const nextStatus: "active" | "paused" | "draft" =
            c.status === "active" ? "paused" : "active";
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const processedCampaigns = [...campaigns].sort((a, b) => {
    if (sortByRoas) return b.roas - a.roas;
    return 0; // maintain default
  });

  const roasChartData = campaigns
    .filter((c) => c.status !== "draft")
    .map((c) => ({ name: c.name.split(" ")[0], roas: c.roas }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance Marketing"
        title="Meta Ads"
        description="Live campaign performance across every managed account."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => toast(`AI Insight: Campaigns overall ROAS is ${avgRoas.toFixed(2)}x. Total budget utilization is high. Keep scale on best performer.`, "info")}
            >
              <Sparkles className="h-4 w-4" />
              AI insights
            </Button>
            <Button size="md" onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </>
        }
      />

      {/* Slideout/Collapsible New Campaign form */}
      {showAddForm && (
        <Card className="border border-brand-500/30 bg-brand-50/10 dark:bg-brand-500/5 animate-fadeIn">
          <CardHeader className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-indigo-500" /> Start Brand Marketing Campaign
                </CardTitle>
                <CardDescription className="text-xs">Name, client, platform, budget, and launch status.</CardDescription>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <form onSubmit={handleAddCampaign} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Peak Conversion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Associated Client
                </label>
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Stark Industries">Stark Industries</option>
                  <option value="Wayne Enterprises">Wayne Enterprises</option>
                  <option value="Globex SaaS">Globex SaaS</option>
                  <option value="Initech">Initech</option>
                  <option value="Hooli">Hooli</option>
                  <option value="Pied Piper">Pied Piper</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Media Route / Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                >
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="LinkedIn Ads">LinkedIn Ads</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Allocated Spend (USD)
                </label>
                <input
                  type="number"
                  required
                  value={spend}
                  onChange={(e) => setSpend(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Impressions
                </label>
                <input
                  type="number"
                  required
                  value={impressions}
                  onChange={(e) => setImpressions(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Clicks
                </label>
                <input
                  type="number"
                  required
                  value={clicks}
                  onChange={(e) => setClicks(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Target ROAS
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={roas}
                  onChange={(e) => setRoas(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Launch Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <Button type="submit" className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-sm">
                  Launch Ads
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reactive KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Spend" value={`$${formatCompact(totalSpend)}`} change="+12.5%" changeType="positive" accent="brand" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard title="Impressions" value={formatCompact(totalImpressions)} change="+18.2%" changeType="positive" accent="amber" icon={<Eye className="h-5 w-5" />} />
        <KpiCard title="Clicks" value={formatCompact(totalClicks)} change="+9.4%" changeType="positive" accent="emerald" icon={<MousePointerClick className="h-5 w-5" />} />
        <KpiCard title="Avg. ROAS" value={`${avgRoas.toFixed(1)}×`} change="-0.1×" changeType="negative" accent="rose" icon={<Target className="h-5 w-5" />} />
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
              {roasChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roasChartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} width={60} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                      itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                      formatter={(v: number) => `${v}×`}
                    />
                    <Bar dataKey="roas" fill="#6366F1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No campaigns with ROAS metrics</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Campaigns</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setSortByRoas(!sortByRoas)} className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> {sortByRoas ? "Default Sort" : "Sort by ROAS"}
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
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.platform}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{c.client}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900 dark:text-white">${c.spend.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{formatCompact(c.impressions)}</td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell tabular-nums text-slate-600 dark:text-slate-300">{c.ctr.toFixed(1)}%</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                    <span className={c.roas >= 3 ? "text-emerald-600 dark:text-emerald-400" : c.roas >= 1.5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>
                      {c.roas.toFixed(1)}×
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleCampaignStatus(c.id)}
                      className="cursor-pointer hover:scale-105 active:scale-95 transition-all text-left block"
                      title="Click to toggle Status"
                    >
                      <Badge dot variant={getCampaignStatusVariant(c.status)}>{c.status[0].toUpperCase() + c.status.slice(1)}</Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleCampaignStatus(c.id)}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                        title={c.status === "active" ? "Pause Campaign" : "Activate Campaign"}
                      >
                        {c.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id, c.name)}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all"
                        title="Delete Campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

