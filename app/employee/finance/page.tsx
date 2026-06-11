"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Download,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  PlusCircle,
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
import { Skeleton, TableRowsSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getExpenses, claimExpense, getTimesheets } from "@/app/actions/crm";

const claimStatus = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  draft: "neutral",
} as const;

export default function EmployeeFinancePage() {
  const { toast, confirmDialog } = useToast();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("software");
  const [expenseSuccessMessage, setExpenseSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Live DB state
  const [expenseClaims, setExpenseClaims] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);

  // Bar chart data derived from timesheets — weekly buckets
  const [weeklyChartData, setWeeklyChartData] = useState([
    { week: "Week 1", billable: 0, nonBillable: 0 },
    { week: "Week 2", billable: 0, nonBillable: 0 },
    { week: "Week 3", billable: 0, nonBillable: 0 },
    { week: "Week 4", billable: 0, nonBillable: 0 },
  ]);

  const loadFinanceData = async () => {
    setIsLoading(true);
    try {
      const [expRes, tsRes] = await Promise.all([getExpenses(), getTimesheets()]);

      if (expRes.success && expRes.data) {
        setExpenseClaims(expRes.data);
      }

      if (tsRes.success && tsRes.data) {
        setTimeLogs(tsRes.data);

        // Build weekly bar chart — group by ISO week-of-month (1–4)
        const weeks: Record<string, number> = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 };
        tsRes.data.forEach((t: any) => {
          const day = new Date(t.date).getDate();
          const weekKey = day <= 7 ? "Week 1" : day <= 14 ? "Week 2" : day <= 21 ? "Week 3" : "Week 4";
          weeks[weekKey] += t.durationMinutes / 60;
        });
        setWeeklyChartData(
          Object.entries(weeks).map(([week, hrs]) => ({
            week,
            billable: Number(hrs.toFixed(1)),
            nonBillable: 0,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // KPI calculations from real data
  const pendingExpenses = expenseClaims.filter((e) => e.status === "pending");
  const pendingExpenseTotal = pendingExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalHoursLogged = timeLogs.reduce((s, t) => s + (t.durationMinutes || 0), 0) / 60;
  const approvedHours = timeLogs.filter((t) => t.status === "approved").reduce((s, t) => s + (t.durationMinutes || 0), 0) / 60;

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("category", expenseCategory);
      formData.append("amount", String(Math.round(parseFloat(expenseAmount))));
      formData.append("description", expenseTitle);

      const result = await claimExpense(formData);
      if (result.success) {
        setExpenseTitle("");
        setExpenseAmount("");
        setShowAddExpense(false);
        setExpenseSuccessMessage("Expense claim submitted for review successfully!");
        loadFinanceData();
        setTimeout(() => setExpenseSuccessMessage(null), 4000);
      } else {
        toast(`Failed to submit expense: ${result.error}`, "error");
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Hours Logged"
          value={`${totalHoursLogged.toFixed(1)} hrs`}
          change="All time"
          changeType="neutral"
          accent="brand"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          title="Approved Hours"
          value={`${approvedHours.toFixed(1)} hrs`}
          change="Billable approved"
          changeType="positive"
          accent="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Pending Expenses"
          value={`₹${pendingExpenseTotal.toLocaleString()}`}
          change="Under review"
          changeType="neutral"
          accent="amber"
          icon={<Wallet className="h-5 w-5" />}
        />
        <KpiCard
          title="Expense Claims"
          value={`${expenseClaims.length} total`}
          change={`${pendingExpenses.length} pending`}
          changeType="neutral"
          accent="rose"
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      {expenseSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{expenseSuccessMessage}</span>
        </div>
      )}

      {/* Interactive Add Expense Panel */}
      {showAddExpense && (
        <Card className="border-brand-500/40 animate-slideDown">
          <CardHeader>
            <div>
              <CardTitle>Submit New Business Expense</CardTitle>
              <CardDescription>Upload expenses for client travel, catering, software licenses or marketing tools.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Description / Merchant
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Subscription, Client Dinner"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="0"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                  >
                    <option value="software">Software</option>
                    <option value="travel">Travel</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)} className="h-10">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="h-10 bg-brand-600 text-white font-semibold">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Chart and Expense Claims Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Billable Hours Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Hours Billed History</CardTitle>
              <CardDescription>Your total logged billable hours per week this month.</CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs mr-2">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded bg-brand-500" /> Billable Hours
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} tickFormatter={(v) => `${v}h`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(v: number) => `${v} hrs`}
                  />
                  <Bar dataKey="billable" name="Billable" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Claims Panel */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Expense Claims</CardTitle>
              <CardDescription>Track claims submitted for reimbursement.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 w-14 shrink-0" />
                  </div>
                ))}
              </div>
            ) : expenseClaims.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">No expense claims yet.</div>
            ) : (
              expenseClaims.slice(0, 8).map((claim: any) => (
                <div key={claim.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{claim.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{claim.category} • {new Date(claim.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      ₹{(claim.amount || 0).toLocaleString()}
                    </p>
                    <Badge variant={claimStatus[claim.status as keyof typeof claimStatus] || "neutral"} className="px-1.5 py-0 text-[9px] uppercase font-bold mt-0.5">
                      {claim.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Billable Time Logs Ledger */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Billable Time Sheet Ledger</CardTitle>
            <CardDescription>All time entries submitted from your live tracker.</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Activity Summary</th>
                <th className="px-5 py-3 text-right font-semibold">Duration</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableRowsSkeleton rows={5} cols={4} />
              ) : timeLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No time logs yet. Start the timer on your dashboard.</td>
                </tr>
              ) : (
                timeLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">{log.date}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">{log.description}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                      {(log.durationMinutes / 60).toFixed(1)} hrs
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        dot
                        variant={log.status === "approved" ? "success" : log.status === "rejected" ? "danger" : "warning"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
