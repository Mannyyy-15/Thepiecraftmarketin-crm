"use client";

import { useState } from "react";
import {
  WalletCards,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  Building,
  TrendingUp,
  Percent,
  X,
  MessageSquare,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { RoyaltyStatement } from "@/lib/mock-data";

export default function RoyaltiesPage() {
  const { filteredRoyalties, updateRoyaltyStatus, role } = useFranchise();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [selectedInvoice, setSelectedInvoice] = useState<RoyaltyStatement | null>(null);
  const [disputeInvoice, setDisputeInvoice] = useState<RoyaltyStatement | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const totalPayableAll = filteredRoyalties.reduce((acc, r) => acc + r.totalPayable, 0);
  const totalPaid = filteredRoyalties.filter((r) => r.status === "paid").reduce((acc, r) => acc + r.totalPayable, 0);
  const totalPending = filteredRoyalties.filter((r) => r.status === "pending" || r.status === "disputed").reduce((acc, r) => acc + r.totalPayable, 0);

  const handleAcknowledgePay = (id: string) => {
    updateRoyaltyStatus(id, "paid");
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({ ...selectedInvoice, status: "paid" });
    }
  };

  const handleRaiseDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeInvoice) return;
    updateRoyaltyStatus(disputeInvoice.id, "disputed", disputeReason);
    setDisputeInvoice(null);
    setDisputeReason("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-[#b8b8c5]/60 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <WalletCards className="w-3.5 h-3.5 text-amber-500" />
            <span>Franchise Financial Ledger</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Royalty Statements & Agreement Dues
          </h1>
          <p className="text-xs sm:text-sm text-[#b8b8c5]/60 mt-0.5">
            6.5% Brand Fee &middot; 2.0% Marketing Fund &middot; 18% GST &middot; Central Commissary Meat Invoicing.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#b8b8c5]/70 block">
              Total Invoiced Dues
            </span>
            <p className="text-2xl font-black text-white font-mono mt-1">
              ₹{totalPayableAll.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              {filteredRoyalties.length} Monthly Statements
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block">
              Settled & Remitted
            </span>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
              ₹{totalPaid.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-emerald-400/80 block mt-1">
              {((totalPaid / (totalPayableAll || 1)) * 100).toFixed(0)}% Remittance Rate
            </span>
          </CardContent>
        </Card>

        <Card className="border-[#303030] bg-[#1f1f1f]">
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
              Pending / Under Review
            </span>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">
              ₹{totalPending.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-[#b8b8c5]/50 block mt-1">
              Due by 10th of every month
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Royalty Statements Table */}
      <Card className="border-[#303030] bg-[#1f1f1f] overflow-hidden">
        <CardHeader className="border-b border-[#303030] pb-4">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Monthly Invoices & Commissary Statements</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#303030] bg-[#161618] text-[#b8b8c5]/60 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice # & Month</th>
                  <th className="py-3 px-4">Franchise Outlet</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">Brand Fee (6.5%)</th>
                  <th className="py-3 px-4">Marketing (2%)</th>
                  <th className="py-3 px-4">Commissary Supplies</th>
                  <th className="py-3 px-4">Total Payable</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303030]">
                {filteredRoyalties.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#303030]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-amber-400 font-mono block">{inv.invoiceNumber}</span>
                      <span className="text-[10px] text-[#b8b8c5]/50">{inv.month}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{inv.outletName}</span>
                      <span className="text-[10px] text-[#b8b8c5]/60">Due: {inv.dueDate}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      ₹{inv.grossSales.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#b8b8c5]">
                      ₹{inv.royaltyAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#b8b8c5]">
                      ₹{inv.marketingFeeAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-orange-400">
                      ₹{inv.centralKitchenSupplyCost.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-black text-white font-mono text-sm">
                      ₹{inv.totalPayable.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" :
                          inv.status === "disputed" ? "bg-rose-500/10 text-rose-400" :
                          "bg-amber-500/10 text-amber-400"
                        )}>
                          {inv.status}
                        </span>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Invoice Statement Modal */}
      {selectedInvoice && (
        <Dialog open={true} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-xl bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-2xl">
            <div className="space-y-4">
              <div className="border-b border-[#303030] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Brand Central HQ</span>
                  <h3 className="text-lg font-black text-white">Franchise Tax Invoice</h3>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-amber-400 block">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-[10px] text-[#b8b8c5]/60">{selectedInvoice.month}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#161618] p-3 rounded-xl border border-[#303030]">
                <div>
                  <span className="text-[10px] text-[#b8b8c5]/60 block">Billed To Outlet:</span>
                  <span className="font-bold text-white block">{selectedInvoice.outletName}</span>
                  <span className="text-[10px] text-[#b8b8c5]/50">GSTIN: 27AABCZ0000A1Z5</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#b8b8c5]/60 block">Payment Status:</span>
                  <span className={cn(
                    "font-bold uppercase tracking-wider text-xs",
                    selectedInvoice.status === "paid" ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#303030] text-[#b8b8c5]/70">
                  <span>Gross Sales Reported:</span>
                  <span className="text-white font-bold">₹{selectedInvoice.grossSales.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#303030] text-[#b8b8c5]/70">
                  <span>Franchise Royalty Fee (6.5%):</span>
                  <span className="text-white">₹{selectedInvoice.royaltyAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#303030] text-[#b8b8c5]/70">
                  <span>Marketing & Tech Fund (2.0%):</span>
                  <span className="text-white">₹{selectedInvoice.marketingFeeAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#303030] text-orange-400">
                  <span>Marinated Meat Commissary Supplies:</span>
                  <span>₹{selectedInvoice.centralKitchenSupplyCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#303030] text-[#b8b8c5]/70">
                  <span>GST (18% on Royalty):</span>
                  <span>₹{selectedInvoice.gstAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-black text-amber-400">
                  <span>Total Amount Payable:</span>
                  <span>₹{selectedInvoice.totalPayable.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#303030]">
                <div className="flex gap-2">
                  {selectedInvoice.status !== "paid" && (
                    <Button
                      size="sm"
                      onClick={() => handleAcknowledgePay(selectedInvoice.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Acknowledge Payment Received
                    </Button>
                  )}
                  {selectedInvoice.status !== "disputed" && !isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDisputeInvoice(selectedInvoice);
                        setSelectedInvoice(null);
                      }}
                      className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                    >
                      Raise Dispute
                    </Button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedInvoice(null)}
                  className="border-[#303030] text-[#b8b8c5]"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dispute Modal */}
      {disputeInvoice && (
        <Dialog open={true} onOpenChange={() => setDisputeInvoice(null)}>
          <DialogContent className="max-w-md bg-[#1f1f1f] border border-[#303030] text-white p-6 rounded-2xl">
            <form onSubmit={handleRaiseDisputeSubmit} className="space-y-3">
              <div className="border-b border-[#303030] pb-2">
                <h3 className="text-base font-black text-white">Raise Royalty Statement Dispute</h3>
                <p className="text-xs text-[#b8b8c5]/60">Invoice #{disputeInvoice.invoiceNumber}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b8b8c5] mb-1">Dispute Reason / Discrepancy Details</label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain commissary meat weight variance or calculation discrepancy..."
                  className="w-full p-2.5 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-[#b8b8c5]/40 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDisputeInvoice(null)} className="border-[#303030] text-[#b8b8c5]">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-500 text-white font-bold">
                  Submit Dispute for Review
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
