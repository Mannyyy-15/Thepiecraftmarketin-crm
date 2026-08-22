"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Store,
  Receipt,
  ShieldCheck,
  Building,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  UtensilsCrossed,
  DollarSign,
  Banknote,
  ShoppingBag,
  Plus,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Truck,
  Layers,
  Sparkles,
  UserCheck,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

const HOURLY_SALES_DATA = [
  { hour: "12 PM", sales: 8400 },
  { hour: "02 PM", sales: 16800 },
  { hour: "04 PM", sales: 12200 },
  { hour: "06 PM", sales: 24500 },
  { hour: "08 PM", sales: 48900 },
  { hour: "10 PM", sales: 68500 },
  { hour: "12 AM", sales: 34200 },
];

const MENU_SHARE_DATA = [
  { name: "Chicken Shawarma Wraps", value: 52, color: "#f97316" },
  { name: "Smoked Mutton Rolls", value: 24, color: "#ea580c" },
  { name: "Loaded Combo Meals", value: 16, color: "#fb923c" },
  { name: "Platters & Sides", value: 8, color: "#fed7aa" },
];

export default function AdminDashboardPage() {
  const {
    role,
    outlets,
    activeOutlet,
    selectedOutletId,
    setSelectedOutletId,
    networkTotals,
    meatBatches,
    shifts,
    royalties,
    complianceList,
    auditLogs,
    liveOrders,
    staffMembers,
    outletTenderTotals,
    shipments,
  } = useFranchise();

  const isSuperAdmin = role === "SUPER_ADMIN" && selectedOutletId === "all";
  const currentOutlet = activeOutlet || outlets[0];

  const [orderSearch, setOrderSearch] = useState("");
  const [orderChannelFilter, setOrderChannelFilter] = useState<"all" | "Walk-in Counter" | "Zomato" | "Swiggy">("all");
  const [showDrawerBreakdown, setShowDrawerBreakdown] = useState(false);

  // Filtered live orders for store view
  const filteredOrders = liveOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchesChannel = orderChannelFilter === "all" || o.channel === orderChannelFilter;
    return matchesSearch && matchesChannel;
  });

  const channelChartData = [
    { name: "Walk-in Counter", value: outletTenderTotals.walkInSales, color: "#f97316" },
    { name: "Zomato Online", value: outletTenderTotals.zomatoSales, color: "#ea580c" },
    { name: "Swiggy Delivery", value: outletTenderTotals.swiggySales, color: "#fb923c" },
  ];

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER AREA ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>
              {isSuperAdmin
                ? "Brand HQ Global • Multi-Branch Operations"
                : `${currentOutlet.name} • ${currentOutlet.code}`}
            </span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isSuperAdmin ? "Network Executive Command Center" : "Outlet Operations Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/70 mt-0.5">
            {isSuperAdmin
              ? `Real-time multi-unit performance across ${outlets.length} franchise locations.`
              : `Store management, daily cash float reconciliation, spit roasting yield, and KOT queue.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <Link href="/admin/outlets">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-orange-600/25 h-11 px-4 cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Onboard Franchise Hub</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/pos">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-orange-600/25 h-11 px-4 cursor-pointer">
                  <Flame className="w-4 h-4" />
                  <span>Open Counter POS</span>
                </Button>
              </Link>

              <Link href="/admin/sales">
                <Button variant="outline" className="h-11 px-3.5 text-xs font-bold border-[#303030] bg-[#1f1f1f] text-zinc-300 rounded-xl gap-1.5 hover:text-white">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Shift Close</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── SUPER ADMIN DASHBOARD VIEW ──────────────────────────────────── */}
      {isSuperAdmin ? (
        <div className="space-y-6">
          {/* Top 4 Network KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Network Gross Sales Today</span>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    ₹{networkTotals.totalSalesToday.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-[#b8b8c5]/60 block">{networkTotals.totalWrapsToday.toLocaleString()} Wraps Carved Today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Active Franchise Network</span>
                  <p className="text-xl font-black text-white font-mono mt-0.5">{outlets.length} Hubs</p>
                  <span className="text-[10px] text-emerald-400 font-semibold block">4 Live & Billing · 1 Launching</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Network Avg Spit Yield</span>
                  <p className="text-xl font-black text-amber-400 font-mono mt-0.5">{networkTotals.avgSpitEfficiency}%</p>
                  <span className="text-[10px] text-zinc-400 block">{networkTotals.activeSpitsCount} Live Spit Roasters</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Monthly Royalty Invoiced</span>
                  <p className="text-xl font-black text-white font-mono mt-0.5">
                    ₹{(networkTotals.totalRoyaltyCollected / 100000).toFixed(2)}L
                  </p>
                  <span className="text-[10px] text-zinc-400 block">Pending: ₹{networkTotals.totalRoyaltyPending.toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Multi-Branch Live Performance Matrix */}
          <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#303030] pb-3">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-orange-500" />
                  <span>Franchise Branch Performance Comparison Matrix</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live sales velocity, target realization %, spit carving yield, and compliance status across all hubs.
                </p>
              </div>

              <Link href="/admin/outlets">
                <Button size="sm" variant="outline" className="text-xs font-bold border-[#303030] bg-[#161618] text-orange-400 rounded-xl gap-1">
                  <span>Manage Outlets & Credentials</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {outlets.map((outlet) => {
                const targetPercent = Math.min(100, Math.round((outlet.currentDaySales / outlet.dailyTargetSales) * 100)) || 0;
                return (
                  <div
                    key={outlet.id}
                    className="p-4 rounded-2xl bg-[#161618] border border-[#303030] hover:border-orange-500/60 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-md">
                          {outlet.code}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                          outlet.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        )}>
                          {outlet.status === "active" ? "● Active & Billing" : "Onboarding"}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-white mt-2">{outlet.name}</h3>
                      <p className="text-xs text-zinc-400">{outlet.area}, {outlet.city}</p>

                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between items-baseline text-xs font-mono">
                          <span className="text-emerald-400 font-black text-base">₹{outlet.currentDaySales.toLocaleString("en-IN")}</span>
                          <span className="text-zinc-400 text-[11px]">Target: ₹{outlet.dailyTargetSales.toLocaleString("en-IN")} ({targetPercent}%)</span>
                        </div>
                        <Progress value={targetPercent} className="h-1.5 bg-[#1f1f1f]" />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#303030] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-zinc-400">Wraps: <strong className="text-white">{outlet.currentDayWraps}</strong></span>
                        <span className="text-zinc-400">Yield: <strong className="text-amber-400">{outlet.spitEfficiency}%</strong></span>
                      </div>

                      <button
                        onClick={() => setSelectedOutletId(outlet.id)}
                        className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Audit Hub</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hourly Sales Trend & Product Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 border-[#303030] bg-[#1f1f1f]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span>Hourly Network Velocity Curve (Today)</span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">Peak 08:00 PM - 11:30 PM</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={HOURLY_SALES_DATA}>
                      <defs>
                        <linearGradient id="hqSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                      <XAxis dataKey="hour" stroke="#b8b8c5" opacity={0.5} fontSize={11} tickLine={false} />
                      <YAxis stroke="#b8b8c5" opacity={0.5} fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#161618",
                          borderColor: "#303030",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#fff",
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Gross Sales"]}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#hqSalesGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                  <span>Category Revenue Share</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={MENU_SHARE_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={4} dataKey="value">
                        {MENU_SHARE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#161618", borderColor: "#303030", borderRadius: "12px", fontSize: "12px" }}
                        formatter={(val: any) => [`${val}%`, "Share"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-[#303030]">
                  {MENU_SHARE_DATA.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-zinc-300 text-[11px] truncate max-w-[140px]">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-white text-[11px]">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ── FRANCHISE PARTNER DASHBOARD VIEW ────────────────────────────── */
        <div className="space-y-6">
          {/* Top 4 Store KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Today's Gross Sales</span>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    ₹{outletTenderTotals.totalGrossRevenue.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-zinc-400 block">Target: ₹{currentOutlet.dailyTargetSales.toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => setShowDrawerBreakdown(!showDrawerBreakdown)}
              className="border-[#303030] bg-[#1f1f1f] hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Cash in Drawer</span>
                  <p className="text-xl font-black text-white font-mono mt-0.5">
                    ₹{outletTenderTotals.expectedCashInDrawer.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-orange-400 font-bold block">Float ₹{outletTenderTotals.openingCash.toLocaleString()} &middot; Breakdown</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Total Orders Today</span>
                  <p className="text-xl font-black text-white font-mono mt-0.5">{outletTenderTotals.totalOrdersToday}</p>
                  <span className="text-[10px] text-zinc-400 block">AOV: ₹{Math.round(outletTenderTotals.totalGrossRevenue / (outletTenderTotals.totalOrdersToday || 1))}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#b8b8c5]/70 uppercase tracking-wider block">Spit Roasting Yield</span>
                  <p className="text-xl font-black text-orange-400 font-mono mt-0.5">{currentOutlet.spitEfficiency}%</p>
                  <span className="text-[10px] text-zinc-400 block">{currentOutlet.activeSpits} Roasters Active</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Drawer Float Reconciliation Dropdown */}
          {showDrawerBreakdown && (
            <div className="p-4 rounded-2xl bg-[#161618] border border-emerald-500/30 text-xs font-mono space-y-2">
              <span className="text-xs font-bold text-emerald-300 block font-sans">Physical Register Cash Drawer Breakdown</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-zinc-300">
                <div className="p-2.5 rounded-xl bg-[#1f1f1f] border border-[#303030]">
                  <span className="text-[10px] text-zinc-500 block font-sans">Opening Float</span>
                  <span className="font-bold text-white">₹{outletTenderTotals.openingCash.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1f1f1f] border border-[#303030]">
                  <span className="text-[10px] text-zinc-500 block font-sans">+ Cash Sales</span>
                  <span className="font-bold text-emerald-400">₹{outletTenderTotals.cashSales.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1f1f1f] border border-[#303030]">
                  <span className="text-[10px] text-zinc-500 block font-sans">- Petty Cash</span>
                  <span className="font-bold text-rose-400">₹{outletTenderTotals.pettyCashExpenses.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1f1f1f] border border-[#303030]">
                  <span className="text-[10px] text-zinc-500 block font-sans">- Safe Drops</span>
                  <span className="font-bold text-blue-400">₹{outletTenderTotals.safeDropsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sales Channels Breakdown & Shift Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="border-[#303030] bg-[#1f1f1f]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-500" />
                    <span>Sales Channels</span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">{outletTenderTotals.totalOrdersToday} Orders</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#161618] border border-[#303030]">
                    <span className="text-[9px] text-orange-400 block font-sans font-bold">Counter</span>
                    <span className="font-black text-white mt-1 block">₹{outletTenderTotals.walkInSales.toLocaleString()}</span>
                    <span className="text-[9px] text-zinc-500 font-sans">{outletTenderTotals.walkInOrdersCount} ord</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161618] border border-[#303030]">
                    <span className="text-[9px] text-rose-400 block font-sans font-bold">Zomato</span>
                    <span className="font-black text-white mt-1 block">₹{outletTenderTotals.zomatoSales.toLocaleString()}</span>
                    <span className="text-[9px] text-zinc-500 font-sans">{outletTenderTotals.zomatoOrdersCount} ord</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#161618] border border-[#303030]">
                    <span className="text-[9px] text-amber-400 block font-sans font-bold">Swiggy</span>
                    <span className="font-black text-white mt-1 block">₹{outletTenderTotals.swiggySales.toLocaleString()}</span>
                    <span className="text-[9px] text-zinc-500 font-sans">{outletTenderTotals.swiggyOrdersCount} ord</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-[#303030] bg-[#1f1f1f]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-500" />
                    <span>Recent Punched Counter Orders</span>
                  </div>
                  <Link href="/pos" className="text-xs text-orange-400 hover:underline font-bold">
                    Open Full Terminal &rarr;
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#303030] bg-[#161618] text-zinc-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-4">Order #</th>
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-4">Payment</th>
                        <th className="py-2.5 px-4 text-right">Amount</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#303030] font-mono text-[11px]">
                      {filteredOrders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-[#303030]/40">
                          <td className="py-2.5 px-4 font-bold text-white">{order.orderNumber}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{order.time}</td>
                          <td className="py-2.5 px-4 font-sans text-zinc-300">{order.channel}</td>
                          <td className="py-2.5 px-4 text-zinc-400 font-sans">{order.paymentMethod}</td>
                          <td className="py-2.5 px-4 text-right font-black text-emerald-400">₹{order.totalAmount}</td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              ✓ {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
