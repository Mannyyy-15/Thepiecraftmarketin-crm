"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/app/actions/auth";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  MoreHorizontal,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityFeedSkeleton } from "@/components/ui/Skeleton";
import { getActivityFeed, getAdminDashboardData } from "@/app/actions/crm";
import { getProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

const channelColors = ["#6366F1", "#14B8A6", "#F59E0B", "#F43F5E"];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Admin");
  const [activities, setActivities] = useState<any[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    activeClientsCount: number;
    monthlyRevenue: number;
    totalAdSpend: number;
    recentProjects: any[];
    revenueData: any[];
    channelData: any[];
  } | null>(null);

  useEffect(() => {
    getActivityFeed(10)
      .then(res => { if (res.success) setActivities(res.data); })
      .finally(() => setIsActivitiesLoading(false));

    getAdminDashboardData().then(res => {
      if (res.success) {
        setDashboardData(res.data);
      }
    });
  }, []);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user && user.name) {
        const name = user.name;
        if (typeof name === "string") {
          const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
          setUserName(capitalized);
        }
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Good morning, ${userName} 👋`}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Monthly Revenue"
          value={`₹${(dashboardData?.monthlyRevenue || 0).toLocaleString()}`}
          change="+20.1%"
          changeType="positive"
          accent="brand"
          icon={<CircleDollarSign className="h-5 w-5" />}
          spark={[28, 32, 30, 34, 38, 36, 42, 41, 44, 45]}
        />
        <KpiCard
          title="Active Clients"
          value={`${dashboardData?.activeClientsCount || 0}`}
          change="+4"
          changeType="positive"
          accent="emerald"
          icon={<Users className="h-5 w-5" />}
          spark={[110, 112, 113, 116, 118, 120, 121, 122, 123, 124]}
        />
        <KpiCard
          title="Total Ad Spend"
          value={`₹${(dashboardData?.totalAdSpend || 0).toLocaleString()}`}
          change="+12.5%"
          changeType="positive"
          accent="amber"
          icon={<Activity className="h-5 w-5" />}
          spark={[80, 88, 90, 96, 100, 108, 112, 118, 121, 124]}
        />
        <KpiCard
          title="Average ROAS"
          value="3.2×"
          change="-0.4×"
          changeType="negative"
          accent="rose"
          icon={<BarChart3 className="h-5 w-5" />}
          spark={[3.8, 3.7, 3.6, 3.5, 3.5, 3.4, 3.3, 3.3, 3.2, 3.2]}
        />
      </div>

      {/* Chart + side panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue & Ad Spend</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-brand-500" /> Revenue
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Spend
                </span>
              </div>
              <select className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                <option>Last 6 months</option>
                <option>Last year</option>
                <option>YTD</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.revenueData || []} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ stroke: "#6366F1", strokeOpacity: 0.2, strokeWidth: 2 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(99,102,241,0.2)",
                      background: "rgba(8,13,30,0.97)",
                      fontSize: 12,
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fill="url(#spendGrad)"
                    name="Spend"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Distribution</CardTitle>
            <button className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="h-40 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.channelData || []}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {(dashboardData?.channelData || []).map((_, i) => (
                      <Cell key={i} fill={channelColors[i % channelColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(99,102,241,0.2)",
                      background: "rgba(8,13,30,0.97)",
                      fontSize: 12,
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                    itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                    formatter={(v: number) => `${v}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-2">
              {(dashboardData?.channelData || []).map((c: any, i: number) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: channelColors[i] }}
                    />
                    {c.name}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {c.value}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Projects table + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <Button variant="ghost" size="sm" className="text-brand-600 dark:text-brand-400">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
                <tr>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold">Project</th>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold">Team</th>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold hidden sm:table-cell">
                    Progress
                  </th>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold hidden md:table-cell">
                    Deadline
                  </th>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(dashboardData?.recentProjects || []).map((p: any) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    <td className="px-5 sm:px-6 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
                        {p.client} • {p.type}
                      </div>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5">
                      <AvatarGroup people={p.team} size="xs" />
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={p.progress} size="sm" className="w-24" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                          {p.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">
                      {p.deadline}
                    </td>
                    <td className="px-5 sm:px-6 py-3.5">
                      <Badge dot variant={getProjectStatusVariant(p.status)}>
                        {getProjectStatusLabel(p.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isActivitiesLoading ? (
              <div className="space-y-3"><ActivityFeedSkeleton count={5} /></div>
            ) : activities.length === 0 ? (
              <EmptyState icon={<Activity className="h-5 w-5" />} title="No activity yet" description="Actions from your team will appear here." />
            ) : (
              // ~5 rows tall, scroll for the rest — keeps the card compact.
              <div className="max-h-[20rem] overflow-y-auto space-y-3 pr-1 -mr-1">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <Avatar name={a.user?.name || "U"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-white">{a.user?.name || "System"}</span>{" "}
                        {a.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(a.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
