"use client";

import { useState } from "react";
import {
  Receipt,
  Search,
  Printer,
  X,
  FileText,
  CreditCard,
  ShoppingBag,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { LiveOrder } from "@/lib/mock-data";

export default function PosOrderHistoryPage() {
  const { liveOrders, activeOutlet } = useFranchise();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [selectedReceipt, setSelectedReceipt] = useState<LiveOrder | null>(null);
  const [voidOrder, setVoidOrder] = useState<LiveOrder | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const filteredOrders = liveOrders.filter((ord) => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(search.toLowerCase())) ||
      ord.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchesChannel = channelFilter === "all" || ord.channel === channelFilter;
    const matchesPayment = paymentFilter === "all" || ord.paymentMethod === paymentFilter;
    return matchesSearch && matchesChannel && matchesPayment;
  });

  const totalSales = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030]">
        <div>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none block">
            Terminal Sales Register
          </span>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
            Order History & Receipt Reprints
          </h1>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#b8b8c5]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search order, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-[#b8b8c5]/40 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Channels</option>
            <option value="Walk-in Counter">Walk-in</option>
            <option value="Zomato">Zomato</option>
            <option value="Swiggy">Swiggy</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-8 px-2 rounded-xl bg-[#161618] border border-[#303030] text-xs text-[#b8b8c5] focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="GPay / UPI">GPay / UPI</option>
            <option value="Card / POS">Card POS</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#1f1f1f] border border-[#303030] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#303030] bg-[#161618] text-[#b8b8c5]/60 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Order ID & Time</th>
              <th className="py-3 px-4">Items Ordered</th>
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-4">Payment Tender</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-right">Receipt Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#303030]">
            {filteredOrders.map((ord) => (
              <tr key={ord.id} className="hover:bg-[#303030]/40 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="font-bold text-amber-400 font-mono block">{ord.orderNumber}</span>
                  <span className="text-[10px] text-[#b8b8c5]/50">{ord.time} &middot; {ord.customerName}</span>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="text-slate-200">
                    {ord.items.map((it, idx) => (
                      <span key={idx} className="block truncate">
                        <strong className="text-amber-400 font-mono">{it.quantity}x</strong> {it.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      ord.channel === "Walk-in Counter"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : ord.channel === "Zomato"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                    )}
                  >
                    {ord.channel}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold font-mono",
                      ord.paymentMethod === "Cash"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : ord.paymentMethod === "GPay / UPI"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    )}
                  >
                    {ord.paymentMethod}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-black text-white font-mono text-sm">
                  ₹{ord.totalAmount.toLocaleString("en-IN")}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedReceipt(ord)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold gap-1 h-7 px-2.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reprint</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Reprint Dialog */}
      {selectedReceipt && (
        <Dialog open={true} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-sm bg-[#1f1f1f] border border-[#303030] text-white p-5 rounded-2xl text-center">
            <div className="space-y-3">
              <div className="border-b border-[#303030] pb-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Irani Koyla Shawarma</span>
                <h3 className="text-base font-black text-white">Customer Tax Receipt</h3>
                <span className="font-mono text-xs font-bold text-amber-400 block mt-0.5">Order #{selectedReceipt.orderNumber}</span>
              </div>

              <div className="flex justify-between text-xs text-[#b8b8c5]/70 border-b border-[#303030] pb-2 text-left">
                <span>{selectedReceipt.channel} &middot; {selectedReceipt.customerName}</span>
                <span className="font-mono">{selectedReceipt.time}</span>
              </div>

              <div className="space-y-1 text-xs text-left">
                {selectedReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-[#303030]/50">
                    <span><strong className="text-amber-400 font-mono">{it.quantity}x</strong> {it.name}</span>
                    <span className="font-mono text-white">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="p-2 rounded-xl bg-[#161618] border border-[#303030] space-y-1 text-xs font-mono text-left">
                <div className="flex justify-between font-black text-amber-400">
                  <span>Grand Total:</span>
                  <span>₹{selectedReceipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#b8b8c5]/60 text-[10px]">
                  <span>Payment Tender: {selectedReceipt.paymentMethod}</span>
                  <span className="text-emerald-400 font-bold">Paid & Settled</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Print Thermal Receipt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
