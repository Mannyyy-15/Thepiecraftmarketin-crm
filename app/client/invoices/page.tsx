"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Lock,
  Receipt,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInvoiceStatusVariant, getInvoiceStatusLabel } from "@/lib/statusHelpers";

const invoices = [
  { id: "INV-2026-0142", amount: 8400, status: "paid" as const, issued: "May 01, 2026", due: "May 15, 2026", project: "Website Redesign" },
  { id: "INV-2026-0140", amount: 7500, status: "paid" as const, issued: "Apr 01, 2026", due: "Apr 15, 2026", project: "SEO Retainer" },
  { id: "INV-2026-0144", amount: 22000, status: "pending" as const, issued: "May 12, 2026", due: "May 26, 2026", project: "Brand Identity" },
  { id: "INV-2026-0138", amount: 12500, status: "overdue" as const, issued: "Apr 22, 2026", due: "May 06, 2026", project: "Meta Ads Q2" },
  { id: "INV-2026-0136", amount: 5800, status: "paid" as const, issued: "Mar 18, 2026", due: "Apr 01, 2026", project: "Content Calendar" },
  { id: "INV-2026-0148", amount: 14200, status: "draft" as const, issued: "—", due: "—", project: "Q3 Strategy" },
];

const billingHistory = [
  { month: "Dec", amount: 8.4 },
  { month: "Jan", amount: 11.2 },
  { month: "Feb", amount: 9.8 },
  { month: "Mar", amount: 14.5 },
  { month: "Apr", amount: 12.1 },
  { month: "May", amount: 18.7 },
];

const statusIcon = {
  paid: CheckCircle2,
  pending: CalendarClock,
  overdue: AlertCircle,
  draft: FileText,
};

type Invoice = typeof invoices[number];
type PayState = "idle" | "processing" | "success";

export default function ClientInvoicesPage() {
  const [search, setSearch] = useState("");
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);
  const [payState, setPayState] = useState<PayState>("idle");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12 / 28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardName, setCardName] = useState("ThePieCraft Ltd");

  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const nextDue = invoices.find((i) => i.status === "pending");

  const filtered = invoices.filter((i) =>
    i.id.toLowerCase().includes(search.toLowerCase()) ||
    i.project.toLowerCase().includes(search.toLowerCase())
  );

  function openPayDrawer(inv: Invoice) {
    setDrawerInvoice(inv);
    setPayState("idle");
  }
  function closeDrawer() {
    setDrawerInvoice(null);
    setPayState("idle");
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setPayState("processing");
    await new Promise((r) => setTimeout(r, 2400));
    setPayState("success");
  }

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Manage and pay your invoices. Download PDF receipts anytime."
        actions={
          <Button variant="outline" size="md">
            <Download className="h-4 w-4" />
            Statement
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Paid (YTD)"
          value={`₹${totalPaid.toLocaleString()}`}
          change="+18.2%"
          changeType="positive"
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Outstanding"
          value={`₹${totalOutstanding.toLocaleString()}`}
          change={overdue > 0 ? `${overdue} overdue` : "All on time"}
          changeType={overdue > 0 ? "negative" : "positive"}
          accent={overdue > 0 ? "rose" : "amber"}
          icon={<Receipt className="h-5 w-5" />}
        />
        <KpiCard
          title="Next Due"
          value={nextDue?.due || "—"}
          change={nextDue ? `₹${nextDue.amount.toLocaleString()}` : ""}
          changeType="neutral"
          accent="portal"
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <KpiCard
          title="Invoices"
          value={`${invoices.length}`}
          change="Lifetime"
          changeType="neutral"
          accent="brand"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {overdue > 0 && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                You have {overdue} overdue invoice{overdue > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Pay today to keep your service running smoothly.
              </p>
            </div>
          </div>
          <Button variant="danger" size="md" onClick={() => {
            const ov = invoices.find((i) => i.status === "overdue");
            if (ov) openPayDrawer(ov);
          }}>
            Pay overdue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <div className="relative max-w-xs hidden sm:block">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search invoices…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40 focus:border-portal-500"
              />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Invoice</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Project</th>
                  <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Due</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => {
                  const Icon = statusIcon[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300 flex items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white tabular-nums">{inv.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        ${inv.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{inv.project}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300">{inv.due}</td>
                      <td className="px-5 py-3.5">
                        <Badge dot variant={getInvoiceStatusVariant(inv.status)}>{getInvoiceStatusLabel(inv.status)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(inv.status === "pending" || inv.status === "overdue") && (
                            <Button size="sm" variant={inv.status === "overdue" ? "danger" : "portal"} onClick={() => openPayDrawer(inv)}>
                              Pay
                            </Button>
                          )}
                          <button
                            aria-label="Download"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Billing History</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Amount billed per month (USD, thousands)
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billingHistory} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }}
                    tickFormatter={(v) => `₹${v}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(20,184,166,0.08)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(v: number) => `₹${v}k`}
                  />
                  <Bar dataKey="amount" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 rounded-xl bg-portal-50 dark:bg-portal-500/10 border border-portal-200 dark:border-portal-500/20 p-3">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-portal-500 text-white flex items-center justify-center shrink-0">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-portal-900 dark:text-portal-200">Auto-pay enabled</p>
                  <p className="text-xs text-portal-700 dark:text-portal-300 mt-0.5">
                    Paying on time with Visa •••• 4242
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================== */}
      {/* 💳 STRIPE PAYMENT DRAWER */}
      {/* =========================================================== */}
      {drawerInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={closeDrawer} />

          {/* Drawer */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-950 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden" style={{ animation: "slideInRight 0.32s cubic-bezier(0.22,1,0.36,1) both" }}>

            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-widest">Secure Payment</p>
                  <p className="text-xl font-black mt-0.5">${drawerInvoice.amount.toLocaleString()}</p>
                </div>
                <button onClick={closeDrawer} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs opacity-80 space-y-0.5">
                <p>Invoice: <span className="font-semibold">{drawerInvoice.id}</span></p>
                <p>Project: <span className="font-semibold">{drawerInvoice.project}</span></p>
                <p>Due: <span className="font-semibold">{drawerInvoice.due}</span></p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {payState === "success" ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-4">
                  <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">Payment Successful!</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      ${drawerInvoice.amount.toLocaleString()} has been processed
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">A receipt has been emailed to you.</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 w-full text-left mt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Details</p>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex justify-between"><span>Reference</span><span className="font-mono font-semibold">TPC-{Math.random().toString(36).slice(2, 9).toUpperCase()}</span></div>
                      <div className="flex justify-between"><span>Method</span><span>Visa •••• 4242</span></div>
                      <div className="flex justify-between"><span>Status</span><span className="text-emerald-500 font-semibold">Confirmed</span></div>
                    </div>
                  </div>
                  <Button variant="outline" size="md" onClick={closeDrawer} className="w-full mt-2">
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePay} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCard(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                        required
                        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM / YY"
                        maxLength={7}
                        required
                        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        required
                        className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Stripe mock badge */}
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Payments processed securely via <span className="font-bold text-[#635bff]">Stripe</span>. Your card data is never stored.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={payState === "processing"}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70 disabled:cursor-wait text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {payState === "processing" ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Processing payment…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Pay ${drawerInvoice.amount.toLocaleString()} now
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
