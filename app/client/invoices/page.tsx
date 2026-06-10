"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileText,
  Receipt,
  Search,
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

export default function ClientInvoicesPage() {
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const nextDue = invoices.find((i) => i.status === "pending");

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
          value={`$${totalPaid.toLocaleString()}`}
          change="+18.2%"
          changeType="positive"
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Outstanding"
          value={`$${totalOutstanding.toLocaleString()}`}
          change={overdue > 0 ? `${overdue} overdue` : "All on time"}
          changeType={overdue > 0 ? "negative" : "positive"}
          accent={overdue > 0 ? "rose" : "amber"}
          icon={<Receipt className="h-5 w-5" />}
        />
        <KpiCard
          title="Next Due"
          value={nextDue?.due || "—"}
          change={nextDue ? `$${nextDue.amount.toLocaleString()}` : ""}
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
          <Button variant="danger" size="md">
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
                {invoices.map((inv) => {
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
                            <Button size="sm" variant={inv.status === "overdue" ? "danger" : "portal"}>
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
                    tickFormatter={(v) => `$${v}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(20,184,166,0.08)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(v: number) => `$${v}k`}
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
    </div>
  );
}
