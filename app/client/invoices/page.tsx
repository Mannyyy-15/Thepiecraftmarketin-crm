"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/providers/ToastProvider";
import {
  AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Download,
  FileText, Receipt, Search, Loader2, ExternalLink, X, IndianRupee,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInvoiceStatusVariant, getInvoiceStatusLabel } from "@/lib/statusHelpers";
import { getClientInvoices, getClientPaymentLink } from "@/app/actions/crm";

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
  items: { service: string; details?: string; amount: number; note?: string }[];
}

const statusIcon: Record<string, any> = {
  paid: CheckCircle2, sent: CalendarClock, overdue: AlertCircle, draft: FileText,
};
const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function ClientInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getClientInvoices();
      if (res.success && res.data) setInvoices(res.data as Invoice[]);
      setLoading(false);
    })();
  }, []);

  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const nextDue = invoices.find((i) => i.status === "sent" || i.status === "overdue");

  // Billing chart: paid totals by month from real invoices.
  const billingHistory = useMemo(() => {
    const map = new Map<string, number>();
    invoices.filter((i) => i.status === "paid").forEach((i) => {
      const dt = new Date(i.paidDate || i.createdAt);
      const key = dt.toLocaleDateString("en-US", { month: "short" });
      map.set(key, (map.get(key) || 0) + i.amount / 1000);
    });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount: Math.round(amount * 10) / 10 }));
  }, [invoices]);

  const filtered = invoices.filter((i) =>
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const openInvoice = (inv: Invoice) => setDrawerInvoice(inv);
  const closeDrawer = () => { if (!paying) setDrawerInvoice(null); };

  const handlePay = async (inv: Invoice) => {
    setPaying(true);
    try {
      const res = await getClientPaymentLink(inv.id);
      if (res.success && res.url) {
        window.open(res.url, "_blank");
        toast("Opening secure payment page…", "success");
      } else {
        toast(res.error || "Online payment isn't available. Please contact us.", "error");
      }
    } finally {
      setPaying(false);
    }
  };

  const downloadInvoice = (inv: Invoice) => {
    const lines = [
      `Invoice ${inv.invoiceNumber}`,
      `Status: ${getInvoiceStatusLabel(inv.status)}`,
      `Issued: ${fmtDate(inv.createdAt)}`,
      `Due: ${fmtDate(inv.dueDate)}`,
      "",
      ...inv.items.map((it) => `• ${it.service}${it.details ? ` — ${it.details}` : ""}: ${fmt(it.amount)}`),
      "",
      `Total: ${fmt(inv.amount)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.invoiceNumber}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-portal-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Billing" title="Invoices" description="View and pay your invoices. Download receipts anytime." />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Paid" value={fmt(totalPaid)} change={`${invoices.filter(i => i.status === "paid").length} paid`} changeType="positive" accent="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Outstanding" value={fmt(totalOutstanding)} change={overdue > 0 ? `${overdue} overdue` : "On time"} changeType={overdue > 0 ? "negative" : "positive"} accent={overdue > 0 ? "rose" : "amber"} icon={<Receipt className="h-5 w-5" />} />
        <KpiCard title="Next Due" value={nextDue ? fmtDate(nextDue.dueDate) : "—"} change={nextDue ? fmt(nextDue.amount) : "Nothing due"} changeType="neutral" accent="portal" icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard title="Invoices" value={`${invoices.length}`} change="Lifetime" changeType="neutral" accent="brand" icon={<FileText className="h-5 w-5" />} />
      </div>

      {overdue > 0 && nextDue && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">You have {overdue} overdue invoice{overdue > 1 ? "s" : ""}</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Please clear your dues to keep services running smoothly.</p>
            </div>
          </div>
          <Button variant="danger" size="md" onClick={() => openInvoice(invoices.find((i) => i.status === "overdue")!)}>
            View overdue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <div className="relative max-w-xs hidden sm:block">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
              <input type="search" placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40" />
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No invoices yet.</p>
              </div>
            ) : filtered.map((inv) => {
              const Icon = statusIcon[inv.status] || FileText;
              const canPay = inv.status === "sent" || inv.status === "overdue";
              return (
                <div key={inv.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer" onClick={() => openInvoice(inv)}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    inv.status === "paid" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500"
                    : inv.status === "overdue" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-500"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-400">Due {fmtDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{fmt(inv.amount)}</p>
                    <Badge dot variant={getInvoiceStatusVariant(inv.status)} className="mt-0.5 text-[9px]">{getInvoiceStatusLabel(inv.status)}</Badge>
                  </div>
                  {canPay && (
                    <Button size="sm" className="shrink-0 bg-portal-600 text-white" onClick={(e) => { e.stopPropagation(); handlePay(inv); }} disabled={paying}>
                      Pay
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Billing History</CardTitle></CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-56">
              {billingHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No payments yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={billingHistory} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.6 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(20,184,166,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12 }} formatter={(v: number) => `₹${v}k`} />
                    <Bar dataKey="amount" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice detail drawer */}
      {drawerInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl h-full overflow-y-auto animate-slideIn">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{drawerInvoice.invoiceNumber}</h3>
              </div>
              <button onClick={closeDrawer} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge dot variant={getInvoiceStatusVariant(drawerInvoice.status)}>{getInvoiceStatusLabel(drawerInvoice.status)}</Badge>
                <span className="text-xs text-slate-400">Due {fmtDate(drawerInvoice.dueDate)}</span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {drawerInvoice.items.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400">No line items.</div>
                ) : drawerInvoice.items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{it.service}</p>
                      {it.details && <p className="text-xs text-slate-500">{it.details}</p>}
                      {it.note && <p className="text-[11px] text-amber-600 italic mt-0.5">↳ {it.note}</p>}
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(it.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums flex items-center"><IndianRupee className="h-4 w-4" />{drawerInvoice.amount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => downloadInvoice(drawerInvoice)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
                {(drawerInvoice.status === "sent" || drawerInvoice.status === "overdue") && (
                  <Button className="flex-1 gap-1.5 bg-portal-600 text-white" onClick={() => handlePay(drawerInvoice)} disabled={paying}>
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Pay now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
