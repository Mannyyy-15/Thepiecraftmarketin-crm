"use client";

import { useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  Smartphone,
  CreditCard,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  FileText,
  Calendar,
  X,
  Printer,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { ShiftRegister } from "@/lib/mock-data";

export default function DailySalesPage() {
  const { filteredShifts, outlets, closeShift, selectedOutletId, role, activeOutlet } = useFranchise();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShiftView, setSelectedShiftView] = useState<ShiftRegister | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [outletId, setOutletId] = useState(selectedOutletId === "all" ? "bandra-west" : selectedOutletId);
  const [shiftType, setShiftType] = useState<"Morning Shift (11:00 AM - 05:00 PM)" | "Evening Shift (05:00 PM - 01:00 AM)">("Evening Shift (05:00 PM - 01:00 AM)");
  const [cashierName, setCashierName] = useState("Imran Shaikh");
  const [openingCash, setOpeningCash] = useState("5000");
  const [grossSales, setGrossSales] = useState("64500");
  const [upiSales, setUpiSales] = useState("28500");
  const [swiggySales, setSwiggySales] = useState("10200");
  const [zomatoSales, setZomatoSales] = useState("7600");
  const [posCardSales, setPosCardSales] = useState("0");
  const [pettyCash, setPettyCash] = useState("650");
  const [discounts, setDiscounts] = useState("1200");
  const [varianceReason, setVarianceReason] = useState("");

  // Denomination notes counter
  const [denom500, setDenom500] = useState("25");
  const [denom200, setDenom200] = useState("15");
  const [denom100, setDenom100] = useState("22");
  const [denom50, setDenom50] = useState("10");
  const [denomCoins, setDenomCoins] = useState("200");

  const countedPhysicalCash =
    (parseInt(denom500) || 0) * 500 +
    (parseInt(denom200) || 0) * 200 +
    (parseInt(denom100) || 0) * 100 +
    (parseInt(denom50) || 0) * 50 +
    (parseInt(denomCoins) || 0);

  const totalGross = filteredShifts.reduce((acc, s) => acc + s.totalGrossSales, 0);
  const totalUpi = filteredShifts.reduce((acc, s) => acc + s.upiSales, 0);
  const totalCash = filteredShifts.reduce((acc, s) => acc + s.cashInDrawerActual, 0);
  const totalAggregators = filteredShifts.reduce((acc, s) => acc + s.swiggySales + s.zomatoSales, 0);

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetO = outlets.find((o) => o.id === outletId) || outlets[0];
    const gross = parseFloat(grossSales) || 50000;
    const upi = parseFloat(upiSales) || 20000;
    const swiggy = parseFloat(swiggySales) || 9000;
    const zomato = parseFloat(zomatoSales) || 6000;
    const pos = parseFloat(posCardSales) || 0;
    const petty = parseFloat(pettyCash) || 0;
    const disc = parseFloat(discounts) || 0;
    const open = parseFloat(openingCash) || 5000;

    const expectedCashSales = gross - (upi + swiggy + zomato + pos);
    const expectedDrawerTotal = open + expectedCashSales - petty;
    const diff = countedPhysicalCash - expectedDrawerTotal;

    closeShift({
      outletId: targetO.id,
      outletName: targetO.name,
      date: new Date().toISOString().split("T")[0],
      shiftType,
      cashierName,
      openingCash: open,
      cashSalesExpected: expectedCashSales,
      cashInDrawerActual: countedPhysicalCash,
      cashDifference: diff,
      upiSales: upi,
      swiggySales: swiggy,
      zomatoSales: zomato,
      posCardSales: pos,
      pettyCashExpenses: petty,
      totalOrders: Math.round(gross / 295),
      totalGrossSales: gross,
      discountsGiven: disc,
      netRevenue: gross - disc,
      varianceReason: Math.abs(diff) > 20 ? (varianceReason || "End of day cash register discrepancy.") : undefined,
    });

    setShowShiftModal(false);
  };

  const displayedShifts = filteredShifts.filter((s) => {
    return (
      s.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.date.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-[#b8b8c5]/60 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            <span>Shift Cash & Tender Reconciliation</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Daily Register Shifts & Cash Reconcile
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/60 mt-0.5">
            Physical drawer cash denomination count vs. expected POS register collections.
          </p>
        </div>

        <Button
          onClick={() => setShowShiftModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2 shadow-md self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Close & Reconcile Shift</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Total Gross Sales
              </span>
              <Receipt className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-white font-mono">
              ₹{totalGross.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              All reconciled shifts
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                UPI & QR Collections
              </span>
              <Smartphone className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-400 font-mono">
              ₹{totalUpi.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Direct settlement
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Physical Cash in Hand
              </span>
              <Banknote className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              ₹{totalCash.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Counted drawer cash
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#b8b8c5]/70 uppercase tracking-wider">
                Food Aggregators
              </span>
              <Truck className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-400 font-mono">
              ₹{totalAggregators.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Zomato + Swiggy payout
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Shift Cards (Morning vs Evening) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Morning Shift */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-white text-sm">Morning Shift (11:00 AM – 05:00 PM)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Reconciled
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#303030] text-xs">
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Cashier</span>
              <span className="font-bold text-white">Imran Shaikh</span>
            </div>
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Gross Sales</span>
              <span className="font-bold text-white font-mono">₹68,500</span>
            </div>
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Cash Discrepancy</span>
              <span className="font-bold text-emerald-400 font-mono">₹0.00 (Zero)</span>
            </div>
          </div>
        </div>

        {/* Evening Shift */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="font-bold text-white text-sm">Evening Shift (05:00 PM – 01:00 AM)</span>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Live / In Progress
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#303030] text-xs">
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Active Cashier</span>
              <span className="font-bold text-white">Sameer Khan</span>
            </div>
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Running Sales</span>
              <span className="font-bold text-amber-400 font-mono">₹48,750</span>
            </div>
            <div>
              <span className="text-[10px] text-[#b8b8c5]/60 block">Drawer Float</span>
              <span className="font-bold text-white font-mono">₹5,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Reconciled Shift Register Archive */}
      <Card className="border-[#303030] bg-[#1f1f1f] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-4">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Shift Register Reconciliation Logs</span>
            </CardTitle>
            <p className="text-xs text-[#b8b8c5]/60 mt-0.5">
              Closed shift statements with cash differences and variance audits
            </p>
          </div>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#b8b8c5]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shift, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white placeholder-[#b8b8c5]/40 focus:outline-none focus:border-amber-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#303030] bg-[#161618] text-[#b8b8c5]/60 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Shift</th>
                  <th className="py-3 px-4">Outlet & Cashier</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">UPI / Digital</th>
                  <th className="py-3 px-4">Cash in Drawer</th>
                  <th className="py-3 px-4">Difference</th>
                  <th className="py-3 px-4 text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {displayedShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-[#303030]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{shift.date}</span>
                      <span className="text-[10px] text-[#b8b8c5]/50">{shift.shiftType}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{shift.outletName}</span>
                      <span className="text-[10px] text-[#b8b8c5]/60">{shift.cashierName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-white font-mono">
                      ₹{shift.totalGrossSales.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-blue-400 font-mono font-bold">
                      ₹{shift.upiSales.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-mono font-bold">
                      ₹{shift.cashInDrawerActual.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-mono font-bold text-[10px]",
                        shift.cashDifference === 0
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-rose-400 bg-rose-500/10"
                      )}>
                        {shift.cashDifference === 0 ? "₹0.00 Reconciled" : `₹${shift.cashDifference > 0 ? "+" : ""}${shift.cashDifference}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedShiftView(shift)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Statement</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reconcile Shift Modal */}
      <Dialog open={showShiftModal} onOpenChange={setShowShiftModal}>
        <DialogContent className="max-w-lg bg-[#1f1f1f] border border-[#303030] text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              <span>Shift Register Closing & Cash Reconcile</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCloseShiftSubmit} className="space-y-3.5 pt-2">
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
                <label className="block text-[11px] font-bold text-[#b8b8c5] mb-1">Shift Type</label>
                <select
                  value={shiftType}
                  onChange={(e: any) => setShiftType(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Morning Shift (11:00 AM - 05:00 PM)">Morning Shift (11 AM - 5 PM)</option>
                  <option value="Evening Shift (05:00 PM - 01:00 AM)">Evening Shift (5 PM - 1 AM)</option>
                </select>
              </div>
            </div>

            {/* Sales Totals Inputs */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Gross Sales (₹)</label>
                <input
                  type="number"
                  value={grossSales}
                  onChange={(e) => setGrossSales(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">UPI Sales (₹)</label>
                <input
                  type="number"
                  value={upiSales}
                  onChange={(e) => setUpiSales(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#b8b8c5]/70 mb-1">Petty Cash (₹)</label>
                <input
                  type="number"
                  value={pettyCash}
                  onChange={(e) => setPettyCash(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#161618] border border-[#303030] text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Physical Denominations Counter */}
            <div className="p-3 rounded-xl bg-[#161618] border border-[#303030] space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#b8b8c5]/60 block">
                Physical Cash Denomination Count
              </span>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block font-mono">₹500</span>
                  <input
                    type="number"
                    value={denom500}
                    onChange={(e) => setDenom500(e.target.value)}
                    className="w-full h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block font-mono">₹200</span>
                  <input
                    type="number"
                    value={denom200}
                    onChange={(e) => setDenom200(e.target.value)}
                    className="w-full h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block font-mono">₹100</span>
                  <input
                    type="number"
                    value={denom100}
                    onChange={(e) => setDenom100(e.target.value)}
                    className="w-full h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block font-mono">₹50</span>
                  <input
                    type="number"
                    value={denom50}
                    onChange={(e) => setDenom50(e.target.value)}
                    className="w-full h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block font-mono">Coins</span>
                  <input
                    type="number"
                    value={denomCoins}
                    onChange={(e) => setDenomCoins(e.target.value)}
                    className="w-full h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#b8b8c5]/60">Physical Cash Counted:</span>
                <span className="font-black text-emerald-400 font-mono">₹{countedPhysicalCash.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#303030]">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowShiftModal(false)} className="border-[#303030] text-[#b8b8c5]">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                Reconcile & Close Shift
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Shift Statement Modal */}
      {selectedShiftView && (
        <Dialog open={true} onOpenChange={() => setSelectedShiftView(null)}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-2xl">
            <div className="space-y-4">
              <div className="border-b border-[#303030] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Irani Koyla Shawarma</span>
                  <h3 className="text-base font-black text-white">Shift Register Statement</h3>
                </div>
                <button onClick={() => setSelectedShiftView(null)} className="text-[#b8b8c5]/50 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Outlet:</span>
                  <span className="font-bold text-white">{selectedShiftView.outletName}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Shift / Date:</span>
                  <span className="font-bold text-white">{selectedShiftView.date} &middot; {selectedShiftView.shiftType}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Cashier On Duty:</span>
                  <span className="font-bold text-white">{selectedShiftView.cashierName}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#161618] border border-[#303030] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Gross Sales:</span>
                  <span className="font-bold text-white">₹{selectedShiftView.totalGrossSales.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-blue-400">
                  <span>UPI / Digital Settlement:</span>
                  <span>- ₹{selectedShiftView.upiSales.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-orange-400">
                  <span>Aggregator Sales (Zomato/Swiggy):</span>
                  <span>- ₹{(selectedShiftView.swiggySales + selectedShiftView.zomatoSales).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Opening Float:</span>
                  <span>+ ₹{selectedShiftView.openingCash.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Petty Cash Expenses:</span>
                  <span>- ₹{selectedShiftView.pettyCashExpenses.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#303030] text-emerald-400 font-bold text-sm">
                  <span>Actual Cash Reconciled:</span>
                  <span>₹{selectedShiftView.cashInDrawerActual.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" onClick={() => setSelectedShiftView(null)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
