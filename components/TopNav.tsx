"use client";

import {
  Bell,
  Search,
  Menu,
  Plus,
  X,
  Flame,
  Store,
  Receipt,
  ShieldCheck,
  WalletCards,
  ChevronDown,
  UserCheck,
  Sparkles,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Building,
  RefreshCw,
  LogOut,
  ShoppingBag,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFranchise } from "@/lib/franchise-context";
import { cn } from "@/components/ui/cn";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { logout } from "@/app/actions/auth";

function titleFromPath(pathname: string): string {
  const segs = pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "overview";
  switch (last) {
    case "admin":
      return "Franchise Management Overview";
    case "pos":
      return "Counter POS & Ordering Terminal";
    case "outlets":
      return "Franchise Outlets & Stores";
    case "yield":
      return "Shawarma Batch & Meat Yield";
    case "sales":
      return "Daily Sales & Shift Registers";
    case "royalties":
      return "Franchise Royalty Statements";
    case "menu":
      return "Master Recipe BOM & Portion Standards";
    case "compliance":
      return "Food Safety & Quality Compliance";
    case "audit":
      return "Operational & System Audit Trail";
    case "settings":
      return "System Settings & Franchise Configuration";
    default:
      return last.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFromPath(pathname);

  const {
    role,
    selectedOutletId,
    setSelectedOutletId,
    outlets,
    activeOutlet,
    addMeatBatch,
    closeShift,
    updateCompliance,
  } = useFranchise();

  // Quick Action Modal
  const [quickActionModal, setQuickActionModal] = useState<"meat" | "shift" | "temp" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Quick Action
  const [spitMeatType, setSpitMeatType] = useState<"Koyla Marinated Chicken" | "Smoked Charcoal Mutton">("Koyla Marinated Chicken");
  const [spitWeightKg, setSpitWeightKg] = useState("32.5");
  const [spitOutletId, setSpitOutletId] = useState(selectedOutletId === "all" ? "bandra-west" : selectedOutletId);

  const [shiftGrossSales, setShiftGrossSales] = useState("58400");
  const [shiftCashActual, setShiftCashActual] = useState("16500");
  const [shiftUpi, setShiftUpi] = useState("24800");
  const [shiftSwiggy, setShiftSwiggy] = useState("9800");
  const [shiftZomato, setShiftZomato] = useState("7300");

  const [tempFreezer, setTempFreezer] = useState("-18.5");
  const [tempSpitCore, setTempSpitCore] = useState("78.0");
  const [tempOilTpm, setTempOilTpm] = useState("16.2");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickAddMeat = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === spitOutletId) || outlets[0];
    const weight = parseFloat(spitWeightKg) || 30;
    const batchNum = `IK-${targetO.code.split("-")[1]}-${Date.now().toString().slice(-4)}`;
    
    addMeatBatch({
      batchNumber: batchNum,
      outletId: targetO.id,
      outletName: targetO.name,
      meatType: spitMeatType,
      spitId: "Spit-01 (Main Spit)",
      timeLoaded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawMeatReceivedKg: Number((weight * 1.05).toFixed(1)),
      marinationLossKg: Number((weight * 0.04).toFixed(1)),
      skewerWeightKg: weight,
      cookedWeightKg: Number((weight * 0.85).toFixed(1)),
      wrapsProduced: Math.round(weight * 8.2),
      jumboWrapsProduced: Math.round(weight * 2.1),
      plattersProduced: Math.round(weight * 0.8),
      wasteScrapsKg: Number((weight * 0.03).toFixed(1)),
      targetYieldKg: Number((weight * 0.90).toFixed(1)),
      coreTempCelsius: 78.5,
      loggedBy: "Quick Action Roaster",
      notes: "Logged via fast header toolbar.",
    });

    setQuickActionModal(null);
    showToast(`Logged Spit Batch ${batchNum} (${weight} kg) for ${targetO.name}!`);
  };

  const handleQuickCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === spitOutletId) || outlets[0];
    const gross = parseFloat(shiftGrossSales) || 50000;
    const cash = parseFloat(shiftCashActual) || 15000;
    const upi = parseFloat(shiftUpi) || 20000;
    const swiggy = parseFloat(shiftSwiggy) || 9000;
    const zomato = parseFloat(shiftZomato) || 6000;

    closeShift({
      outletId: targetO.id,
      outletName: targetO.name,
      date: new Date().toISOString().split("T")[0],
      shiftType: "Evening Shift (05:00 PM - 01:00 AM)",
      cashierName: "Aman Siddiqui",
      openingCash: 5000,
      cashSalesExpected: gross - (upi + swiggy + zomato),
      cashInDrawerActual: cash,
      cashDifference: cash - (gross - (upi + swiggy + zomato)),
      upiSales: upi,
      swiggySales: swiggy,
      zomatoSales: zomato,
      posCardSales: 0,
      pettyCashExpenses: 650,
      totalOrders: Math.round(gross / 295),
      totalGrossSales: gross,
      discountsGiven: 1200,
      netRevenue: gross - 1200,
    });

    setQuickActionModal(null);
    showToast(`Reconciled & closed Evening Shift for ${targetO.name} (Gross: ₹${gross.toLocaleString()})!`);
  };

  const handleQuickTempAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === spitOutletId) || outlets[0];

    updateCompliance({
      outletId: targetO.id,
      outletName: targetO.name,
      inspectedBy: "Manager On-Duty",
      deepFreezerTemp: parseFloat(tempFreezer) || -18.5,
      chillerTemp: 3.5,
      spitCoreTemp: parseFloat(tempSpitCore) || 78.0,
      oilPolarCompoundPercent: parseFloat(tempOilTpm) || 16.0,
      fssaiDisplayVerified: true,
      staffHairnetsGloves: true,
      pestControlVerified: true,
      waterQualityTested: true,
      remarks: "Logged via Quick Header Toolbar.",
    });

    setQuickActionModal(null);
    showToast(`Logged food safety temperature check for ${targetO.name}!`);
  };

  return (
    <>
      <header className="z-30 mx-3 mt-3 sm:mx-4 sm:mt-4 lg:mx-6 lg:mt-5 flex h-14 sm:h-16 shrink-0 items-center gap-3 rounded-[20px] bg-white/90 dark:bg-[#1f1f1f]/95 backdrop-blur-xl px-4 sm:px-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-none dark:border dark:border-[#303030]">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden -ml-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#303030] cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Role & Outlet Switcher */}
        {role === "SUPER_ADMIN" ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl bg-[#161618] border border-orange-500/40 text-xs font-bold text-orange-400 focus:outline-none focus:border-orange-500 cursor-pointer appearance-none shadow-sm"
              >
                <option value="all">🏢 Brand HQ (All Outlets)</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    📍 {o.name} ({o.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-orange-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <span className="hidden md:inline-flex text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-md">
              HQ Super Admin
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-white bg-[#161618] border border-[#303030] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-orange-500" />
              <span>{activeOutlet?.name || "Bandra West"}</span>
            </span>

            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-black text-white shadow-sm transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Counter POS</span>
            </Link>
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-2 relative">
          {/* Global Search Bar */}
          <div className="group relative hidden w-48 text-left md:block lg:w-64">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search network, batches…"
              className="h-9 w-full rounded-xl border border-[#303030] bg-[#161618] pl-9 pr-4 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Quick Action + */}
          <button
            type="button"
            onClick={() => setQuickActionModal("meat")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#303030] bg-[#161618] text-zinc-300 hover:text-white hover:border-orange-500/50 transition-all cursor-pointer"
            title="Quick Action Toolbar"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#303030] bg-[#161618] text-zinc-300 hover:text-white hover:border-orange-500/50 transition-all cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
          </button>

          {/* User Profile Avatar & Logout */}
          <button
            type="button"
            onClick={async () => {
              try {
                await logout();
              } catch {}
              router.push("/login");
            }}
            title="Sign out of FranchiseOS"
            className="inline-flex h-9 px-2.5 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer gap-1"
          >
            <span>{role === "SUPER_ADMIN" ? "HQ Admin" : "Partner"}</span>
            <LogOut className="w-3 h-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-xl">
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Quick Action Dialog */}
      {quickActionModal && (
        <Dialog open={true} onOpenChange={() => setQuickActionModal(null)}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-3xl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b border-[#303030] pb-3">
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <span>Franchise Operational Entry</span>
                </DialogTitle>
                <button
                  onClick={() => setQuickActionModal(null)}
                  className="p-1 text-[#b8b8c5]/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            {/* Sub-tab picker */}
            <div className="grid grid-cols-3 gap-2 mt-4 p-1 bg-[#161618] border border-[#303030] rounded-xl">
              <button
                type="button"
                onClick={() => setQuickActionModal("meat")}
                className={cn(
                  "py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
                  quickActionModal === "meat" ? "bg-amber-600 text-white shadow" : "text-[#b8b8c5]/70 hover:text-white"
                )}
              >
                Spit Batch
              </button>
              <button
                type="button"
                onClick={() => setQuickActionModal("shift")}
                className={cn(
                  "py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
                  quickActionModal === "shift" ? "bg-amber-600 text-white shadow" : "text-[#b8b8c5]/70 hover:text-white"
                )}
              >
                Shift Tender
              </button>
              <button
                type="button"
                onClick={() => setQuickActionModal("temp")}
                className={cn(
                  "py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
                  quickActionModal === "temp" ? "bg-amber-600 text-white shadow" : "text-[#b8b8c5]/70 hover:text-white"
                )}
              >
                Food Safety
              </button>
            </div>

            {/* Form: Meat Batch */}
            {quickActionModal === "meat" && (
              <form onSubmit={handleQuickAddMeat} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Franchise Outlet</label>
                  <select
                    value={spitOutletId}
                    onChange={(e) => setSpitOutletId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Meat Recipe Selection</label>
                  <select
                    value={spitMeatType}
                    onChange={(e) => setSpitMeatType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Koyla Marinated Chicken">Koyla Marinated Chicken (Signature)</option>
                    <option value="Smoked Charcoal Mutton">Smoked Charcoal Mutton (Prime Cut)</option>
                    <option value="Special Spiced Chicken">Special Spiced Chicken (Spicy Blend)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Net Loaded Spit Cone Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={spitWeightKg}
                    onChange={(e) => setSpitWeightKg(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 32.5"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Expected Yield: ~{Math.round(parseFloat(spitWeightKg || "0") * 8.2)} wraps</span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickActionModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                    🔥 Start Spit Roasting
                  </Button>
                </div>
              </form>
            )}

            {/* Form: Shift Closing */}
            {quickActionModal === "shift" && (
              <form onSubmit={handleQuickCloseShift} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Franchise Outlet</label>
                  <select
                    value={spitOutletId}
                    onChange={(e) => setSpitOutletId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Total Gross Sales (₹)</label>
                    <input
                      type="number"
                      value={shiftGrossSales}
                      onChange={(e) => setShiftGrossSales(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Cash in Drawer (₹)</label>
                    <input
                      type="number"
                      value={shiftCashActual}
                      onChange={(e) => setShiftCashActual(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">UPI (GPay/PhonePe)</label>
                    <input
                      type="number"
                      value={shiftUpi}
                      onChange={(e) => setShiftUpi(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Swiggy Orders</label>
                    <input
                      type="number"
                      value={shiftSwiggy}
                      onChange={(e) => setShiftSwiggy(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Zomato Orders</label>
                    <input
                      type="number"
                      value={shiftZomato}
                      onChange={(e) => setShiftZomato(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickActionModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                    Reconcile & Close Shift
                  </Button>
                </div>
              </form>
            )}

            {/* Form: Temp Audit */}
            {quickActionModal === "temp" && (
              <form onSubmit={handleQuickTempAudit} className="space-y-3.5 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Franchise Outlet</label>
                  <select
                    value={spitOutletId}
                    onChange={(e) => setSpitOutletId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Spit Core (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempSpitCore}
                      onChange={(e) => setTempSpitCore(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-bold text-amber-400"
                    />
                    <span className="text-[9px] text-slate-500">Min 75°C</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Freezer (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempFreezer}
                      onChange={(e) => setTempFreezer(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-bold text-cyan-400"
                    />
                    <span className="text-[9px] text-slate-500">Max -18°C</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Oil TPM (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempOilTpm}
                      onChange={(e) => setTempOilTpm(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-[#38383f] bg-slate-50 dark:bg-[#1f1f1f] text-xs font-bold text-emerald-400"
                    />
                    <span className="text-[9px] text-slate-500">Max 24%</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setQuickActionModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                    🛡️ Record QA Compliance
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
