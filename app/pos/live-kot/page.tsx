"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Receipt,
  Printer,
  Search,
  Flame,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useFranchise } from "@/lib/franchise-context";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { LiveOrder } from "@/lib/mock-data";

export default function LiveKotQueuePage() {
  const { liveOrders, activeOutlet } = useFranchise();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<LiveOrder | null>(null);

  const filteredOrders = liveOrders.filter((ord) => {
    return (
      ord.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ord.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none">
              Counter Live Feed
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All Bills Delivered & Completed
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
            Live Counter Order Tickets Stream ({liveOrders.length} Completed)
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, shawarma…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#161618] border border-[#303030] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tickets Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#1f1f1f] border border-[#303030] text-center text-xs text-zinc-500">
          <span>No tickets found matching your search.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#303030] hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3 shadow-md"
            >
              <div>
                {/* Ticket Header */}
                <div className="flex items-start justify-between border-b border-[#303030] pb-2">
                  <div>
                    <span className="text-base font-black text-white font-mono block">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {order.customerName || "Counter Guest"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-mono block">
                      {order.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Delivered</span>
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 py-3">
                  {order.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="font-mono text-xs font-black text-amber-400 w-5 shrink-0">
                            {item.quantity}x
                          </span>
                          <span className="font-bold text-white leading-snug truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Footer & Actions */}
              <div className="pt-2 border-t border-[#303030] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Tender: {order.paymentMethod}</span>
                  <span className="font-mono text-sm font-black text-amber-400">
                    ₹{order.totalAmount.toFixed(2)}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTicket(order)}
                  className="border-[#303030] bg-[#161618] hover:bg-[#303030] text-zinc-300 hover:text-white text-[11px] font-bold h-7 px-2.5 gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3 text-amber-400" />
                  <span>Reprint KOT</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <Dialog open={true} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-sm bg-[#1f1f1f] border border-[#303030] text-white p-5 rounded-3xl text-center">
            <div className="space-y-3">
              <div className="border-b border-[#303030] pb-2">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Irani Koyla Shawarma</span>
                <h3 className="text-base font-black text-white">Counter Kitchen Ticket (KOT)</h3>
                <span className="font-mono text-xs font-bold text-amber-400 block mt-0.5">Order #{selectedTicket.orderNumber}</span>
              </div>

              <div className="flex justify-between text-xs text-zinc-400 border-b border-[#303030] pb-2 text-left">
                <span>{selectedTicket.customerName}</span>
                <span className="font-mono">{selectedTicket.time}</span>
              </div>

              <div className="space-y-1 text-xs text-left">
                {selectedTicket.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-[#303030]/50">
                    <span><strong className="text-amber-400 font-mono">{it.quantity}x</strong> {it.name}</span>
                    <span className="font-mono text-white">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-[#161618] border border-[#303030] space-y-1 text-xs font-mono text-left">
                <div className="flex justify-between font-black text-amber-400">
                  <span>Grand Total:</span>
                  <span>₹{selectedTicket.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-[10px]">
                  <span>Payment: {selectedTicket.paymentMethod}</span>
                  <span>Status: Delivered & Settled</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-10 rounded-xl"
                >
                  Print Thermal Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
