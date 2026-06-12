"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";
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
  Play,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { AdsPageSkeleton } from "@/components/ui/Skeleton";
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
  Cell
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCampaignStatusVariant } from "@/lib/statusHelpers";
import { 
  getMetaCampaigns, 
  createMetaCampaign, 
  deleteMetaCampaign, 
  toggleMetaCampaignStatus, 
  triggerMetaAPISync,
  getClients
} from "@/app/actions/crm";
import { cn } from "@/components/ui/cn";

const campaignPerformance = [
  { day: "Mon", impressions: 320, clicks: 8.2 },
  { day: "Tue", impressions: 380, clicks: 9.6 },
  { day: "Wed", impressions: 410, clicks: 11.1 },
  { day: "Thu", impressions: 350, clicks: 9.8 },
  { day: "Fri", impressions: 480, clicks: 13.4 },
  { day: "Sat", impressions: 520, clicks: 14.2 },
  { day: "Sun", impressions: 460, clicks: 12.8 },
];

export default function AdsPage() {
  const { toast, confirmDialog } = useToast();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

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

  const loadData = async () => {
    const clientsRes = await getClients();
    if (clientsRes.success && clientsRes.data) {
      setClientsList(clientsRes.data);
      if (clientsRes.data.length > 0) {
        setClient(clientsRes.data[0].name);
      }
    }

    const res = await getMetaCampaigns();
    if (res.success && res.data && res.data.length > 0) {
      setCampaigns(res.data);
    } else {
      // No real campaigns yet — show an empty table
      setCampaigns([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, []);

  // Previously this seeded demo campaigns into the DB; now it simply returns the
  // current real campaigns (no fake data is ever written).
  const ensureSeededCampaigns = async () => {
    return campaigns;
  };

  // Dynamic KPI Calculations
  const totalSpend = campaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const avgRoas = campaigns.length > 0 ? (campaigns.reduce((acc, c) => acc + Number(c.roas || 0), 0) / campaigns.length) : 0;

  // Formatting helpers
  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    await ensureSeededCampaigns();

    const newCampaign = {
      name,
      clientName: client,
      platform,
      spend: Number(spend),
      impressions: Number(impressions),
      clicks: Number(clicks),
      roas: Number(roas),
      status,
    };

    const res = await createMetaCampaign(newCampaign);
    if (res.success) {
      toast(`Successfully launched campaign "${name}" for client "${client}"!`, "success");
      const campaignsRes = await getMetaCampaigns();
      if (campaignsRes.success && campaignsRes.data) {
        setCampaigns(campaignsRes.data);
      }
      setName("");
      setShowAddForm(false);
    } else {
      toast(res.error || "Failed to create campaign", "error");
    }
    setLoading(false);
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (await confirmDialog(`Are you sure you want to completely delete the campaign "${name}"?`)) {
      setLoading(true);
      await ensureSeededCampaigns();
      
      const res = await deleteMetaCampaign(Number(id));
      if (res.success) {
        toast(`Deleted campaign "${name}"`, "info");
        const campaignsRes = await getMetaCampaigns();
        if (campaignsRes.success && campaignsRes.data) {
          setCampaigns(campaignsRes.data);
        }
      } else {
        toast(res.error || "Failed to delete campaign", "error");
      }
      setLoading(false);
    }
  };

  const toggleCampaignStatus = async (id: string) => {
    setLoading(true);
    const currentCampaigns = await ensureSeededCampaigns();
    const campaign = currentCampaigns.find((c: any) => String(c.id) === String(id));
    if (campaign) {
      const nextStatus = campaign.status === "active" ? "paused" : "active";
      const res = await toggleMetaCampaignStatus(Number(id), nextStatus);
      if (res.success) {
        toast(`Campaign status updated to ${nextStatus}`, "success");
        const campaignsRes = await getMetaCampaigns();
        if (campaignsRes.success && campaignsRes.data) {
          setCampaigns(campaignsRes.data);
        }
      } else {
        toast(res.error || "Failed to update campaign status", "error");
      }
    }
    setLoading(false);
  };

  const handleSyncAPI = async () => {
    setLoading(true);
    await ensureSeededCampaigns();
    const res = await triggerMetaAPISync();
    if (res.success) {
      toast("Successfully pulled fresh campaign metrics from Meta Graph API sync simulation!", "success");
      const campaignsRes = await getMetaCampaigns();
      if (campaignsRes.success && campaignsRes.data) {
        setCampaigns(campaignsRes.data);
      }
    } else {
      toast(res.error || "Failed to sync campaign metrics", "error");
    }
    setLoading(false);
  };

  const processedCampaigns = [...campaigns].sort((a, b) => {
    if (sortByRoas) return Number(b.roas || 0) - Number(a.roas || 0);
    return 0;
  });

  const roasChartData = campaigns
    .filter((c) => c.status !== "draft")
    .map((c) => ({ name: (c.name || "").split(" ")[0], roas: Number(c.roas || 0) }));

  if (loading) return <AdsPageSkeleton />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-12"
    >
      <PageHeader
        eyebrow="Performance Marketing"
        title="Meta Ads Engine"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-indigo-200/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm"
              onClick={handleSyncAPI}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Sync with Meta API
            </Button>
            <Button
              variant="outline"
              size="md"
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-indigo-200/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shadow-sm"
              onClick={() => toast(`AI Insight: Campaigns overall ROAS is ${avgRoas.toFixed(2)}x. Total budget utilization is high. Keep scale on best performer.`, "info")}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI insights
            </Button>
            <Button 
              size="md" 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold shadow-md hover:shadow-lg transition-all border-none"
            >
              <Plus className="h-4 w-4 mr-1" />
              New campaign
            </Button>
          </div>
        }
      />

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="border border-brand-500/30 bg-gradient-to-br from-brand-50/50 to-indigo-50/50 dark:from-brand-500/10 dark:to-indigo-500/5 backdrop-blur-xl shadow-lg mb-6">
              <CardHeader className="py-5 border-b border-white/20 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-brand-900 dark:text-brand-100">
                      <div className="h-6 w-6 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Activity className="h-3.5 w-3.5 text-brand-500" />
                      </div>
                      Start Brand Marketing Campaign
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-brand-700/70 dark:text-brand-300/60">Define the metrics and push to the live network.</CardDescription>
                  </div>
                  <button onClick={() => setShowAddForm(false)} className="h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <form onSubmit={handleAddCampaign} className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-end">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Campaign Title</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Client</label>
                    <select value={client} onChange={(e) => setClient(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      {clientsList.length > 0 ? (
                        clientsList.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))
                      ) : (
                        <>
                          <option>Acme Corp</option>
                          <option>Wayne Enterprises</option>
                          <option>Stark Industries</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Platform</label>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Google Ads">Google Ads</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Target ROAS</label>
                    <input type="number" step="0.1" required value={roas} onChange={(e) => setRoas(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Spend (USD)</label>
                    <input type="number" required value={spend} onChange={(e) => setSpend(Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all" />
                  </div>
                  <div className="flex gap-3 md:col-span-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-extrabold text-brand-900/60 dark:text-brand-100/50 uppercase tracking-widest mb-1.5">Launch Status</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                        className="h-11 w-full rounded-xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white backdrop-blur-md shadow-sm transition-all">
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <Button type="submit" className="h-11 px-6 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 text-white font-bold text-sm shadow-md border-none">
                      Launch Ads
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <PremiumKpiCard 
          title="Total Spend" 
          value={`₹${formatCompact(totalSpend)}`} 
          icon={<DollarSign className="h-5 w-5" />} 
          gradient="from-indigo-500/20 to-violet-500/20"
          iconColor="text-indigo-500"
        />
        <PremiumKpiCard 
          title="Impressions" 
          value={formatCompact(totalImpressions)} 
          icon={<Eye className="h-5 w-5" />} 
          gradient="from-amber-500/20 to-orange-500/20"
          iconColor="text-amber-500"
        />
        <PremiumKpiCard 
          title="Clicks" 
          value={formatCompact(totalClicks)} 
          icon={<MousePointerClick className="h-5 w-5" />} 
          gradient="from-emerald-500/20 to-teal-500/20"
          iconColor="text-emerald-500"
        />
        <PremiumKpiCard 
          title="Avg. ROAS" 
          value={`${avgRoas.toFixed(2)}x`} 
          icon={<Target className="h-5 w-5" />} 
          gradient="from-rose-500/20 to-pink-500/20"
          iconColor="text-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Network Performance</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Impressions vs Clicks over the last 7 days</p>
              </div>
              <Badge variant="success" dot className="px-3 py-1 shadow-sm">Live Network</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.5 }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.5 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,0.9)", fontSize: 12, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 700, padding: "2px 0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} iconType="circle" />
                  <Line type="monotone" dataKey="impressions" name="Impressions (k)" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, stroke: "#6366F1", strokeWidth: 2, fill: "#fff" }} />
                  <Line type="monotone" dataKey="clicks" name="Clicks (k)" stroke="#14B8A6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6, stroke: "#14B8A6", strokeWidth: 2, fill: "#fff" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <CardTitle className="text-lg">ROAS Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-72">
              {roasChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roasChartData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.06} horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.5 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.8, fontWeight: 500 }} width={80} />
                    <Tooltip
                      cursor={{ fill: 'currentColor', opacity: 0.04 }}
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,0.9)", fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                      itemStyle={{ color: "#ffffff", fontWeight: 700 }}
                      formatter={(v: number) => `${v.toFixed(2)}×`}
                    />
                    <Bar dataKey="roas" radius={[0, 6, 6, 0]}>
                      {roasChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#colorGradient-${index})`} />
                      ))}
                    </Bar>
                    <defs>
                      {roasChartData.map((entry, index) => (
                        <linearGradient key={`colorGradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#4F46E5" />
                          <stop offset="100%" stopColor="#818CF8" />
                        </linearGradient>
                      ))}
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No ROAS data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-md border-slate-200/80 dark:border-slate-800/80 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-5">
          <CardTitle className="text-lg">Active Campaigns</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSortByRoas(!sortByRoas)} className="text-xs font-bold rounded-xl bg-white dark:bg-slate-950 shadow-sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> {sortByRoas ? "Reset Sort" : "Sort by ROAS"}
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 bg-slate-100/50 dark:bg-slate-900/80">
              <tr>
                <th className="px-6 py-4 text-left">Campaign Name</th>
                <th className="px-6 py-4 text-left hidden md:table-cell">Client</th>
                <th className="px-6 py-4 text-right">Spend</th>
                <th className="px-6 py-4 text-right hidden sm:table-cell">Impressions</th>
                <th className="px-6 py-4 text-right hidden lg:table-cell">CTR</th>
                <th className="px-6 py-4 text-right">ROAS</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
              {processedCampaigns.map((c) => (
                <motion.tr 
                  key={c.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.03)" }}
                  className="group transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white mb-0.5">{c.name}</div>
                    <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">{c.platform}</div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {c.client}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold tabular-nums text-slate-900 dark:text-white">
                    ₹{c.spend.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell tabular-nums font-medium text-slate-500 dark:text-slate-400">
                    {formatCompact(c.impressions)}
                  </td>
                  <td className="px-6 py-4 text-right hidden lg:table-cell tabular-nums font-bold text-slate-500 dark:text-slate-400">
                    {c.ctr.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right font-black tabular-nums text-base">
                    <span className={cn(
                      c.roas >= 3 ? "text-emerald-500" : c.roas >= 1.5 ? "text-amber-500" : "text-rose-500",
                      "bg-opacity-10 px-2 py-0.5 rounded-lg"
                    )}>
                      {c.roas.toFixed(2)}×
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge dot variant={getCampaignStatusVariant(c.status)} className="shadow-sm py-1">
                      {c.status[0].toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleCampaignStatus(c.id)}
                        className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center cursor-pointer transition-all shadow-sm"
                        title={c.status === "active" ? "Pause Campaign" : "Activate Campaign"}
                      >
                        {c.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id, c.name)}
                        className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center cursor-pointer transition-all shadow-sm"
                        title="Delete Campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

// Internal component for the premium glassmorphic KPI cards
function PremiumKpiCard({ title, value, icon, gradient, iconColor }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 p-5 shadow-lg backdrop-blur-xl group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Background glow */}
      <div className={`absolute -inset-10 bg-gradient-to-br ${gradient} opacity-40 blur-2xl group-hover:opacity-60 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
        </div>
        
        <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform">
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
