"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  FileText,
  Receipt,
  Wallet,
  CheckCircle,
  XCircle,
  Loader2,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { invoices } from "@/lib/mock";
import { getTimesheets, getExpenses, updateTimesheetStatus, updateExpenseStatus } from "@/app/actions/crm";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRowsSkeleton } from "@/components/ui/Skeleton";

const cashflow = [
  { month: "Dec", inflow: 38, outflow: 22 },
  { month: "Jan", inflow: 42, outflow: 24 },
  { month: "Feb", inflow: 39, outflow: 23 },
  { month: "Mar", inflow: 48, outflow: 27 },
  { month: "Apr", inflow: 51, outflow: 29 },
  { month: "May", inflow: 54, outflow: 30 },
];

const invoiceStatus = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
} as const;

const initialTransactions = [
  { id: "t1", who: "Acme Corp", note: "Invoice INV-2026-0142 paid", amount: 8400, kind: "in" as const, date: "May 18, 2026" },
  { id: "t2", who: "Stripe Fees", note: "May processing fees", amount: 412, kind: "out" as const, date: "May 18, 2026" },
  { id: "t3", who: "Stark Industries", note: "Invoice INV-2026-0143 paid", amount: 14200, kind: "in" as const, date: "May 16, 2026" },
  { id: "t4", who: "Figma", note: "Org subscription renewal", amount: 312, kind: "out" as const, date: "May 14, 2026" },
  { id: "t5", who: "AWS", note: "Cloud infrastructure", amount: 1840, kind: "out" as const, date: "May 12, 2026" },
];

export default function FinancePage() {
  const { toast, confirmDialog } = useToast();

  const [activeTab, setActiveTab] = useState<"revenue" | "contractor">("revenue");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Live DB state for timesheets and expenses
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tsRes, expRes] = await Promise.all([getTimesheets(), getExpenses()]);
      if (tsRes.success && tsRes.data) setTimesheets(tsRes.data);
      if (expRes.success && expRes.data) setExpenses(expRes.data);
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Approve Timesheet
  const handleApproveTimesheet = async (id: number) => {
    setProcessingId(`ts-${id}`);
    try {
      const result = await updateTimesheetStatus(id, "approved");
      if (result.success) {
        const approved = timesheets.find((t) => t.id === id);
        if (approved) {
          const cost = Math.round((approved.durationMinutes / 60) * 80); // Approx $80/hr rate
          setTransactions((prev) => [
            {
              id: `t-auto-${Date.now()}`,
              who: `Employee #${approved.userId}`,
              note: `Approved timesheet: ${approved.description}`,
              amount: cost,
              kind: "out" as const,
              date: "Today",
            },
            ...prev,
          ]);
        }
        await loadData();
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Timesheet
  const handleRejectTimesheet = async (id: number) => {
    setProcessingId(`ts-reject-${id}`);
    try {
      const result = await updateTimesheetStatus(id, "rejected");
      if (result.success) await loadData();
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Approve Expense
  const handleApproveExpense = async (id: number) => {
    setProcessingId(`exp-${id}`);
    try {
      const result = await updateExpenseStatus(id, "approved");
      if (result.success) {
        const approved = expenses.find((e) => e.id === id);
        if (approved) {
          setTransactions((prev) => [
            {
              id: `t-exp-${Date.now()}`,
              who: `Employee #${approved.userId}`,
              note: `Approved expense: ${approved.description}`,
              amount: approved.amount,
              kind: "out" as const,
              date: "Today",
            },
            ...prev,
          ]);
        }
        await loadData();
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Expense
  const handleRejectExpense = async (id: number) => {
    setProcessingId(`exp-reject-${id}`);
    try {
      const result = await updateExpenseStatus(id, "rejected");
      if (result.success) await loadData();
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // KPI calculations
  const pendingTimesheets = timesheets.filter((t) => t.status === "pending");
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingTsMinutes = pendingTimesheets.reduce((s, t) => s + (t.durationMinutes || 0), 0);
  const pendingExpenseTotal = pendingExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingPayoutTotal = Math.round((pendingTsMinutes / 60) * 80) + pendingExpenseTotal;
  const totalPendingItems = pendingTimesheets.length + pendingExpenses.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Cash & Billing Overview"
        description="Invoice tracking, cash flow, and contractor timesheet approvals."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "revenue"
                  ? "bg-brand-600 text-white shadow-glow"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              Revenue & Profit
            </button>
            <button
              onClick={() => setActiveTab("contractor")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === "contractor"
                  ? "bg-brand-600 text-white shadow-glow"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              Contractor Timesheets
            </button>
          </div>
        }
      />

      {/* KPI Panel */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="MRR Under Mgmt" value="$132.6k" change="+8.4%" changeType="positive" accent="brand" icon={<CircleDollarSign className="h-5 w-5" />} />
        <KpiCard title="Cash on Hand" value="$284k" change="+12.1%" changeType="positive" accent="emerald" icon={<Wallet className="h-5 w-5" />} />
        <KpiCard title="Contractor Outstanding" value={`$${pendingPayoutTotal.toLocaleString()}`} accent="rose" icon={<Receipt className="h-5 w-5" />} />
        <KpiCard title="Pending Approvals" value={isLoading ? "..." : `${totalPendingItems} items`} accent="amber" />
      </div>

      {activeTab === "revenue" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Cash Flow Bar Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle>Agency Cash Flow Playbook</CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inflow vs outflow (USD, thousands)</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block" /> Inflow
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500 block" /> Outflow
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflow} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                      <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} tickFormatter={(v) => `$${v}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                        labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                        itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(v: number) => `$${v}k`}
                      />
                      <Bar dataKey="inflow" name="Inflow" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="outflow" name="Outflow" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Approved payroll, SaaS subscriptions, and client billings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${t.kind === "in" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                      {t.kind === "in" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.who}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.note}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${t.kind === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
                        {t.kind === "in" ? "+" : "−"}${t.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{t.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Invoices Table */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <CardTitle>Sent Client Invoices</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toast("PDF Export triggered! (Demo)", "info")}>
                <FileText className="h-3.5 w-3.5 mr-1" /> All Invoices
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Invoice ID</th>
                    <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Client Account</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Issued Date</th>
                    <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Due Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white tabular-nums">{inv.id}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300">{inv.client}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-white tabular-nums">${inv.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{inv.issued}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{inv.due}</td>
                      <td className="px-5 py-3.5">
                        <Badge dot variant={invoiceStatus[inv.status]}>{inv.status[0].toUpperCase() + inv.status.slice(1)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timesheets Approvals */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle>Timesheet Approvals</CardTitle>
              <CardDescription>Review logged hours submitted by your team.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Employee</th>
                    <th className="px-5 py-3 text-left font-semibold">Description</th>
                    <th className="px-5 py-3 text-right font-semibold">Duration</th>
                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <TableRowsSkeleton rows={4} cols={6} />
                  ) : timesheets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2">
                        <EmptyState icon={<Receipt className="h-5 w-5" />} title="No timesheets yet" description="Submitted timesheets from your team will appear here." />
                      </td>
                    </tr>
                  ) : (
                    timesheets.map((ts: any) => {
                      const isProcessingApprove = processingId === `ts-${ts.id}`;
                      const isProcessingReject = processingId === `ts-reject-${ts.id}`;
                      return (
                        <tr key={ts.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={`Employee ${ts.userId}`} size="xs" />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white text-xs">Employee #{ts.userId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 max-w-xs text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{ts.description}</td>
                          <td className="px-5 py-4 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {(ts.durationMinutes / 60).toFixed(1)} hrs
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">{ts.date}</td>
                          <td className="px-5 py-4">
                            <Badge dot variant={ts.status === "approved" ? "success" : ts.status === "rejected" ? "danger" : "warning"}>
                              {ts.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {ts.status === "pending" ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleRejectTimesheet(ts.id)}
                                  disabled={!!processingId}
                                  className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  {isProcessingReject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Reject
                                </button>
                                <button
                                  onClick={() => handleApproveTimesheet(ts.id)}
                                  disabled={!!processingId}
                                  className="h-8 px-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {isProcessingApprove ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Approve
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">
                                {ts.status === "approved" ? "✓ Approved" : "✖ Rejected"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Expense Claims Approvals */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle>Expense Claim Approvals</CardTitle>
              <CardDescription>Review expense reimbursement requests submitted by your team.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Employee</th>
                    <th className="px-5 py-3 text-left font-semibold">Description</th>
                    <th className="px-5 py-3 text-left font-semibold">Category</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <TableRowsSkeleton rows={4} cols={6} />
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2">
                        <EmptyState icon={<Wallet className="h-5 w-5" />} title="No expense claims" description="Reimbursement requests submitted by your team will appear here." />
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp: any) => {
                      const isProcessingApprove = processingId === `exp-${exp.id}`;
                      const isProcessingReject = processingId === `exp-reject-${exp.id}`;
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={`Employee ${exp.userId}`} size="xs" />
                              <div className="font-bold text-slate-900 dark:text-white text-xs">Employee #{exp.userId}</div>
                            </div>
                          </td>
                          <td className="px-5 py-4 max-w-xs text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{exp.description}</td>
                          <td className="px-5 py-4">
                            <Badge variant="info" className="text-[9px] py-0.5 px-1.5 uppercase font-extrabold tracking-wider capitalize">
                              {exp.category}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right font-extrabold text-slate-900 dark:text-white tabular-nums">
                            ${(exp.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <Badge dot variant={exp.status === "approved" ? "success" : exp.status === "rejected" ? "danger" : "warning"}>
                              {exp.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {exp.status === "pending" ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleRejectExpense(exp.id)}
                                  disabled={!!processingId}
                                  className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  {isProcessingReject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Reject
                                </button>
                                <button
                                  onClick={() => handleApproveExpense(exp.id)}
                                  disabled={!!processingId}
                                  className="h-8 px-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {isProcessingApprove ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Approve
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">
                                {exp.status === "approved" ? "✓ Approved" : "✖ Rejected"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
