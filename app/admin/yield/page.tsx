"use client";

import { useState } from "react";
import {
  Flame,
  Plus,
  Search,
  Scale,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  TrendingUp,
  UtensilsCrossed,
  X,
  Thermometer,
  ShieldCheck,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export default function MeatYieldPage() {
  const { filteredMeatBatches, outlets, addMeatBatch, selectedOutletId, role, activeOutlet } = useFranchise();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [showAddModal, setShowAddModal] = useState(false);
  const [meatTypeFilter, setMeatTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [outletId, setOutletId] = useState(selectedOutletId === "all" ? "bandra-west" : selectedOutletId);
  const [meatType, setMeatType] = useState<"Koyla Marinated Chicken" | "Smoked Charcoal Mutton" | "Special Spiced Chicken">("Koyla Marinated Chicken");
  const [spitId, setSpitId] = useState("Spit-01 (Front Roaster)");
  const [rawMeatKg, setRawMeatKg] = useState("35.0");
  const [marinationLossKg, setMarinationLossKg] = useState("1.2");
  const [skewerWeightKg, setSkewerWeightKg] = useState("33.8");
  const [cookedWeightKg, setCookedWeightKg] = useState("31.0");
  const [wasteScrapsKg, setWasteScrapsKg] = useState("0.8");
  const [wrapsCount, setWrapsCount] = useState("250");
  const [jumboCount, setJumboCount] = useState("60");
  const [plattersCount, setPlattersCount] = useState("20");
  const [coreTemp, setCoreTemp] = useState("78.5");
  const [loggedBy, setLoggedBy] = useState("Master Carver Farhan");
  const [notes, setNotes] = useState("Optimal spit rotational heat and charcoal smokiness.");

  const totalRawReceived = filteredMeatBatches.reduce((acc, b) => acc + b.rawMeatReceivedKg, 0);
  const totalCookedYield = filteredMeatBatches.reduce((acc, b) => acc + b.cookedWeightKg, 0);
  const totalWaste = filteredMeatBatches.reduce((acc, b) => acc + b.wasteScrapsKg, 0);
  const totalWrapsProduced = filteredMeatBatches.reduce((acc, b) => acc + b.wrapsProduced + b.jumboWrapsProduced, 0);

  const avgEfficiency =
    filteredMeatBatches.length > 0
      ? (filteredMeatBatches.reduce((acc, b) => acc + b.actualYieldPercent, 0) / filteredMeatBatches.length).toFixed(1)
      : "92.4";

  const displayedBatches = filteredMeatBatches.filter((b) => {
    const matchesFilter = meatTypeFilter === "all" || b.meatType.includes(meatTypeFilter);
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.loggedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Batch Yield chart data
  const yieldChartData = displayedBatches.slice(0, 7).reverse().map((b) => ({
    name: b.batchNumber.split("-").slice(-2).join("-"),
    yield: b.actualYieldPercent,
    target: 92.0,
    spit: b.spitId,
    weight: b.cookedWeightKg,
  }));

  // Portion distribution data
  const portionData = [
    { name: "Classic Wraps", value: filteredMeatBatches.reduce((acc, b) => acc + b.wrapsProduced, 0), color: "#ffb703" },
    { name: "Jumbo Wraps", value: filteredMeatBatches.reduce((acc, b) => acc + b.jumboWrapsProduced, 0), color: "#ff5500" },
    { name: "Meat Platters", value: filteredMeatBatches.reduce((acc, b) => acc + b.plattersProduced, 0), color: "#3b82f6" },
  ];

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === outletId) || outlets[0];
    const skewer = parseFloat(skewerWeightKg) || 30;
    const cooked = parseFloat(cookedWeightKg) || 27;
    const batchNum = `IK-${targetO.code.split("-")[2] || "MUM"}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now().toString().slice(-2)}`;

    addMeatBatch({
      batchNumber: batchNum,
      outletId: targetO.id,
      outletName: targetO.name,
      meatType,
      spitId,
      timeLoaded: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      rawMeatReceivedKg: parseFloat(rawMeatKg) || skewer + 1.5,
      marinationLossKg: parseFloat(marinationLossKg) || 1.0,
      skewerWeightKg: skewer,
      cookedWeightKg: cooked,
      wrapsProduced: parseInt(wrapsCount) || 200,
      jumboWrapsProduced: parseInt(jumboCount) || 40,
      plattersProduced: parseInt(plattersCount) || 15,
      wasteScrapsKg: parseFloat(wasteScrapsKg) || 0.8,
      targetYieldKg: Number((skewer * 0.92).toFixed(1)),
      coreTempCelsius: parseFloat(coreTemp) || 78.0,
      loggedBy,
      notes,
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-[#b8b8c5]/60 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Spit Efficiency & Portion Control</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Shawarma Batch Production & Meat Yield
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/60 mt-0.5">
            Standard: 110g regular wrap &middot; 160g jumbo wrap &middot; Minimum 92.0% cooked yield efficiency.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2 shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Spit Batch</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Raw Meat Loaded */}
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Raw Skewers Loaded
              </span>
              <Scale className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {totalRawReceived.toFixed(1)} <span className="text-xs text-[#b8b8c5]/60 font-sans">kg</span>
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Cooked: {totalCookedYield.toFixed(1)} kg carved
            </span>
          </CardContent>
        </Card>

        {/* Avg Spit Yield Efficiency */}
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Yield Efficiency
              </span>
              <Percent className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {avgEfficiency}%
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              Threshold: &ge; 92.0% target
            </span>
          </CardContent>
        </Card>

        {/* Wraps Produced */}
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Portions Produced
              </span>
              <UtensilsCrossed className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {totalWrapsProduced.toLocaleString()}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Avg 110g meat per roll
            </span>
          </CardContent>
        </Card>

        {/* Trimming & Waste */}
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Trimming & Scrap Waste
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-400 font-mono">
              {totalWaste.toFixed(1)} <span className="text-xs text-[#b8b8c5]/60 font-sans">kg</span>
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              {( (totalWaste / (totalRawReceived || 1)) * 100 ).toFixed(1)}% scrap ratio
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts (Yield Trend & Portion Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield Efficiency by Batch Bar Chart */}
        <Card className="lg:col-span-2 border-[#303030] bg-[#1f1f1f]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Batch Yield Efficiency vs 92% Benchmark</span>
            </CardTitle>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Target &ge; 92.0%
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yieldChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#303030" vertical={false} />
                  <XAxis dataKey="name" stroke="#b8b8c5" opacity={0.5} fontSize={11} tickLine={false} />
                  <YAxis domain={[80, 100]} stroke="#b8b8c5" opacity={0.5} fontSize={11} tickLine={false} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f1f1f", borderColor: "#303030", borderRadius: "12px", fontSize: "12px", color: "#fff" }}
                    formatter={(val: any) => [`${val}%`, "Yield Efficiency"]}
                  />
                  <ReferenceLine y={92.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Target 92%", fill: "#f59e0b", fontSize: 10, position: "top" }} />
                  <Bar dataKey="yield" radius={[6, 6, 0, 0]}>
                    {yieldChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.yield >= 92 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portion Mix Output */}
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Portions Produced Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portionData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value">
                    {portionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f1f1f", borderColor: "#303030", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(val: any) => [`${val} units`, "Produced"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-2 border-t border-[#303030]">
              {portionData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[#b8b8c5]/70">{item.name}</span>
                  <span className="font-bold text-white ml-auto font-mono">{item.value.toLocaleString()} units</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Spit Batch History Table */}
      <Card className="border-[#303030] bg-[#1f1f1f] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-4">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Batch Logs & Skewer Calibration Trail</span>
            </CardTitle>
            <p className="text-xs text-[#b8b8c5]/60 mt-0.5">
              Historical batches loaded on roasters with temperature and yield flags
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#b8b8c5]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batch, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white placeholder-[#b8b8c5]/40 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={meatTypeFilter}
              onChange={(e) => setMeatTypeFilter(e.target.value)}
              className="h-8 px-2 rounded-lg bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Meat Recipes</option>
              <option value="Chicken">Chicken</option>
              <option value="Mutton">Mutton</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#303030] bg-[#161618] text-[#b8b8c5]/60 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Outlet & Spit</th>
                  <th className="py-3 px-4">Recipe Blend</th>
                  <th className="py-3 px-4">Skewer / Carved</th>
                  <th className="py-3 px-4">Wraps</th>
                  <th className="py-3 px-4">Yield %</th>
                  <th className="py-3 px-4">Core Temp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {displayedBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-[#303030]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white font-mono block">{batch.batchNumber}</span>
                      <span className="text-[10px] text-[#b8b8c5]/50">{batch.date} &middot; {batch.timeLoaded}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{batch.outletName}</span>
                      <span className="text-[10px] text-[#b8b8c5]/60">{batch.spitId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      {batch.meatType}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className="text-white">{batch.cookedWeightKg} kg</span>
                      <span className="text-[10px] text-[#b8b8c5]/50 block">/ {batch.skewerWeightKg} kg</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-mono">
                      {batch.wrapsProduced + batch.jumboWrapsProduced}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-mono font-bold text-xs",
                        batch.actualYieldPercent >= 92 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                      )}>
                        {batch.actualYieldPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-400">
                      {batch.coreTempCelsius}&deg;C
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        batch.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                        batch.status === "roasting" ? "bg-amber-500/10 text-amber-400" :
                        "bg-rose-500/10 text-rose-400"
                      )}>
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log Batch Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg bg-[#1f1f1f] border border-[#303030] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Log Spit Skewer Batch</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBatch} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#b8b8c5] mb-1">Franchise Hub</label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="w-full h-9 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#b8b8c5] mb-1">Meat Recipe Blend</label>
                <select
                  value={meatType}
                  onChange={(e: any) => setMeatType(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Koyla Marinated Chicken">Koyla Marinated Chicken</option>
                  <option value="Smoked Charcoal Mutton">Smoked Charcoal Mutton</option>
                  <option value="Special Spiced Chicken">Special Spiced Chicken</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Skewer Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={skewerWeightKg}
                  onChange={(e) => setSkewerWeightKg(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Carved Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={cookedWeightKg}
                  onChange={(e) => setCookedWeightKg(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Core Temp (&deg;C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={coreTemp}
                  onChange={(e) => setCoreTemp(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Regular Wraps</label>
                <input
                  type="number"
                  value={wrapsCount}
                  onChange={(e) => setWrapsCount(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Jumbo Wraps</label>
                <input
                  type="number"
                  value={jumboCount}
                  onChange={(e) => setJumboCount(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Meat Platters</label>
                <input
                  type="number"
                  value={plattersCount}
                  onChange={(e) => setPlattersCount(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#303030]">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="border-[#303030] text-[#b8b8c5]">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                Save Batch Log
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
