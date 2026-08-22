"use client";

import { useState } from "react";
import {
  Banknote,
  Receipt,
  Plus,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  FileText,
  ArrowDownCircle,
  PlusCircle,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";

export default function PosShiftPage() {
  const { outletTenderTotals, activeOutlet, filteredPettyCash, filteredSafeDrops } = useFranchise();

  // Denomination notes state
  const [denom500, setDenom500] = useState("25");
  const [denom200, setDenom200] = useState("15");
  const [denom100, setDenom100] = useState("22");
  const [denom50, setDenom50] = useState("10");
  const [denomCoins, setDenomCoins] = useState("200");

  const [showZReport, setShowZReport] = useState(false);

  const countedPhysicalCash =
    (parseInt(denom500) || 0) * 500 +
    (parseInt(denom200) || 0) * 200 +
    (parseInt(denom100) || 0) * 100 +
    (parseInt(denom50) || 0) * 50 +
    (parseInt(denomCoins) || 0);

  const variance = countedPhysicalCash - outletTenderTotals.expectedCashInDrawer;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030]">
        <div>
          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest leading-none block">
            Terminal Drawer Audit
          </span>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
            Cashier Shift Register & Drawer Closing
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
            Shift Status: Open & Reconciling
          </span>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-[#b8b8c5]/60 uppercase tracking-wider block">Opening Float</span>
            <p className="text-lg font-black text-white font-mono mt-1">₹{outletTenderTotals.openingCash.toLocaleString("en-IN")}</p>
            <span className="text-[10px] text-[#b8b8c5]/50 block">Start balance</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">+ Cash Sales</span>
            <p className="text-lg font-black text-emerald-400 font-mono mt-1">₹{outletTenderTotals.cashSales.toLocaleString("en-IN")}</p>
            <span className="text-[10px] text-[#b8b8c5]/50 block">Drawer in</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">&minus; Petty Cash</span>
            <p className="text-lg font-black text-rose-400 font-mono mt-1">₹{outletTenderTotals.pettyCashExpenses.toLocaleString("en-IN")}</p>
            <span className="text-[10px] text-[#b8b8c5]/50 block">Ice & vegetables</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">&minus; Safe Drops</span>
            <p className="text-lg font-black text-blue-400 font-mono mt-1">₹{(outletTenderTotals.safeDropsTotal || 0).toLocaleString("en-IN")}</p>
            <span className="text-[10px] text-[#b8b8c5]/50 block">Vault transfer</span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f] col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">= Expected Drawer</span>
            <p className="text-lg font-black text-orange-400 font-mono mt-1">₹{outletTenderTotals.expectedCashInDrawer.toLocaleString("en-IN")}</p>
            <span className="text-[10px] text-[#b8b8c5]/50 block">Required cash</span>
          </CardContent>
        </Card>
      </div>

      {/* Denomination Counter & Closing Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Physical Notes Counter */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-4">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-500" />
              Physical Cash Denomination Count
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              ₹{countedPhysicalCash.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { val: "₹500 Note", state: denom500, set: setDenom500, mult: 500 },
              { val: "₹200 Note", state: denom200, set: setDenom200, mult: 200 },
              { val: "₹100 Note", state: denom100, set: setDenom100, mult: 100 },
              { val: "₹50 Note", state: denom50, set: setDenom50, mult: 50 },
              { val: "Coins & Change", state: denomCoins, set: setDenomCoins, mult: 1 },
            ].map((d) => (
              <div key={d.val} className="flex items-center justify-between p-2 rounded-xl bg-[#161618] border border-[#303030]">
                <span className="text-xs font-bold text-white">{d.val}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={d.state}
                    onChange={(e) => d.set(e.target.value)}
                    className="w-20 h-7 text-center rounded bg-[#1f1f1f] border border-[#303030] text-xs text-white font-mono"
                  />
                  <span className="w-24 text-right font-mono text-xs text-[#b8b8c5]/70 font-bold">
                    = ₹{((parseInt(d.state) || 0) * d.mult).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Variance Status */}
          <div className="p-3 rounded-xl bg-[#161618] border border-[#303030] flex items-center justify-between text-xs font-mono">
            <span className="text-[#b8b8c5]/70">Drawer Cash Variance:</span>
            <span className={cn(
              "font-black text-sm",
              variance === 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {variance === 0 ? "₹0.00 (Zero Discrepancy)" : `₹${variance > 0 ? "+" : ""}${variance} Variance`}
            </span>
          </div>
        </div>

        {/* Shift Summary & EOD Closing Action */}
        <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block border-b border-[#303030] pb-2">
              Shift Sales Tender Totals
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#b8b8c5]/70">
                <span>Total Orders Punched:</span>
                <span className="text-white font-bold">{outletTenderTotals.totalOrdersToday} orders</span>
              </div>
              <div className="flex justify-between text-[#b8b8c5]/70">
                <span>Total Gross Sales:</span>
                <span className="text-white font-bold">₹{outletTenderTotals.totalGrossRevenue.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-blue-400">
                <span>UPI / GPay Settlements:</span>
                <span>₹{outletTenderTotals.gpaySales.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>Card POS Terminal:</span>
                <span>₹{outletTenderTotals.cardSales.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Counter Cash Collections:</span>
                <span>₹{outletTenderTotals.cashSales.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#303030] space-y-2">
            <Button
              onClick={() => setShowZReport(true)}
              className="w-full h-11 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/25 gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Generate End of Day (Z-Report)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Petty Cash Outflows & Safe Drops Audit Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Petty Cash Outflows Log */}
        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-3">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-orange-500" />
              Petty Cash Drawer Outflows ({filteredPettyCash.length})
            </span>
            <span className="text-[10px] text-rose-400 font-mono font-bold">
              Total: -₹{filteredPettyCash.reduce((s, p) => s + p.amount, 0)}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredPettyCash.map((p) => (
              <div key={p.id} className="p-2.5 rounded-xl bg-[#161618] border border-[#303030] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{p.reason}</span>
                  <span className="text-[10px] text-zinc-400">{p.category} &middot; {p.timestamp} &middot; {p.paidBy}</span>
                </div>
                <span className="font-mono font-black text-rose-400">
                  -₹{p.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safe Drops Skims Log */}
        <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030] space-y-3">
          <div className="flex items-center justify-between border-b border-[#303030] pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ArrowDownCircle className="w-3.5 h-3.5 text-blue-400" />
              Safe Drops & Excess Cash Transfers ({filteredSafeDrops.length})
            </span>
            <span className="text-[10px] text-blue-400 font-mono font-bold">
              Total: -₹{filteredSafeDrops.reduce((s, d) => s + d.amount, 0)}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredSafeDrops.map((d) => (
              <div key={d.id} className="p-2.5 rounded-xl bg-[#161618] border border-[#303030] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{d.safeNumber}</span>
                  <span className="text-[10px] text-zinc-400">{d.notes} &middot; {d.timestamp} &middot; {d.authorizedBy}</span>
                </div>
                <span className="font-mono font-black text-blue-400">
                  -₹{d.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Z-Report Modal */}
      {showZReport && (
        <Dialog open={true} onOpenChange={setShowZReport}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-2xl text-center">
            <div className="space-y-3.5">
              <div className="border-b border-[#303030] pb-2">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block">Irani Koyla Shawarma</span>
                <h3 className="text-base font-black text-white">Daily Z-Report & Shift Statement</h3>
                <span className="text-[10px] text-[#b8b8c5]/60">{new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#161618] border border-[#303030] space-y-1.5 text-xs font-mono text-left">
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Gross Shift Revenue:</span>
                  <span className="text-white font-bold">₹{outletTenderTotals.totalGrossRevenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>UPI / GPay Collections:</span>
                  <span>₹{outletTenderTotals.gpaySales.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Physical Cash Counted:</span>
                  <span>₹{countedPhysicalCash.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Petty Cash Deductions:</span>
                  <span>-₹{outletTenderTotals.pettyCashExpenses.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/70">
                  <span>Safe Drops Skimmed:</span>
                  <span>-₹{(outletTenderTotals.safeDropsTotal || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-[#303030]">
                  <span>Cash Difference / Variance:</span>
                  <span>{variance === 0 ? "₹0.00 (Balanced)" : `₹${variance}`}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setShowZReport(false)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  Print Z-Report Slip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
