"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  Users,
  Check,
  Trash2,
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
import { KpiCardsSkeleton, TaskListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import {
  getOverviewPageData,
  toggleTaskStatus,
  deleteTask,
} from "@/app/actions/crm";
import { getProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

interface Task {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  projectId?: number | null;
  project?: string;
  dueDate?: string | null;
}

type Pill = "week" | "month" | "lastMonth";

// Use local timezone date string to match server-stored dates (which use toLocaleDateString)
function toLocalDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getWeekBounds() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toLocalDateStr(monday),
    end: toLocalDateStr(sunday),
  };
}

function getMonthBounds(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    start: toLocalDateStr(start),
    end: toLocalDateStr(end),
  };
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateStr(date);
}

function computeHoursFromAttendance(attendance: any[], startStr: string, endStr: string) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { day: string; hours: number; isWeekend: boolean; absent: boolean }[] = [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return result;
  const todayStr = toLocalDateStr(new Date());
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = toLocalDateStr(cur);
    const dow = cur.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const dayAtt = attendance.find((a: any) => String(a.date).trim() === dateStr);
    let hours = 0;
    if (dayAtt?.punchInTime) {
      const pin = new Date(dayAtt.punchInTime).getTime();
      const pout = dayAtt.punchOutTime
        ? new Date(dayAtt.punchOutTime).getTime()
        : dateStr === todayStr ? Date.now() : 0;
      if (pout > pin) hours = Math.max(0, (pout - pin) / 3600000);
    }
    result.push({
      day: dayNames[dow],
      hours: Number(hours.toFixed(1)),
      isWeekend,
      absent: !isWeekend && !dayAtt,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function computeHoursChart(timesheets: any[], startStr: string, endStr: string) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { day: string; hours: number; isWeekend: boolean; absent: boolean }[] = [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return result;
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = toLocalDateStr(cur);
    const dow = cur.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const hrs = timesheets
      .filter((t: any) => t.date === dateStr)
      .reduce((s: number, t: any) => s + t.durationMinutes / 60, 0);
    result.push({
      day: dayNames[dow],
      hours: Number(hrs.toFixed(1)),
      isWeekend,
      absent: !isWeekend && hrs === 0,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const getProgressByStatus = (status: string) => {
  if (status === "planning") return 15;
  if (status === "in_progress" || status === "in-progress") return 50;
  if (status === "in_review" || status === "review") return 85;
  if (status === "completed") return 100;
  return 30;
};


export default function EmployeeOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [employeeProjects, setEmployeeProjects] = useState<any[]>([]);
  const [allTimesheets, setAllTimesheets] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<any[]>([]);
  const [totalHoursToday, setTotalHoursToday] = useState(0);

  const defaultBounds = getWeekBounds();
  const [rangeStart, setRangeStart] = useState(defaultBounds.start);
  const [rangeEnd, setRangeEnd] = useState(defaultBounds.end);
  const [activePill, setActivePill] = useState<Pill>("week");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("pending");

  const loadDashboardData = async () => {
    try {
      const res = await getOverviewPageData();
      if (!res.success || !res.data) return;

      const { user, projects, timesheets, attendance, tasks } = res.data;

      if (user) setUser(user);

      setEmployeeProjects(projects);

      const mappedTasks = tasks.map((t: any) => {
        const matchedProj = projects.find((p: any) => p.id === t.projectId);
        return {
          id: t.id,
          title: t.title,
          priority: t.priority as "high" | "medium" | "low",
          done: t.done === 1,
          projectId: t.projectId,
          project: matchedProj ? matchedProj.name : "Personal Task",
          dueDate: t.dueDate,
        };
      });
      setTasks(mappedTasks);

      setAllTimesheets(timesheets);
      setAllAttendance(attendance);

      // Today's hours: prefer attendance punch times (most accurate), fall back to timesheets
      const todayStr = toLocalDateStr(new Date());
      const todayAtt = attendance.find((a: any) => a.date === todayStr);
      let todayHoursVal = 0;
      if (todayAtt?.punchInTime) {
        const pin = new Date(todayAtt.punchInTime).getTime();
        const pout = todayAtt.punchOutTime ? new Date(todayAtt.punchOutTime).getTime() : Date.now();
        todayHoursVal = Math.max(0, (pout - pin) / 3600000);
      } else {
        todayHoursVal = timesheets
          .filter((t: any) => t.date === todayStr)
          .reduce((s: number, t: any) => s + t.durationMinutes / 60, 0);
      }
      setTotalHoursToday(Number(todayHoursVal.toFixed(1)));
    } catch (err) {
      console.error("Error loading overview data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (allAttendance.length > 0) {
      setWeeklyHours(computeHoursFromAttendance(allAttendance, rangeStart, rangeEnd));
    } else {
      setWeeklyHours(computeHoursChart(allTimesheets, rangeStart, rangeEnd));
    }
  }, [allAttendance, allTimesheets, rangeStart, rangeEnd]);

  const handlePill = (pill: Pill) => {
    setActivePill(pill);
    if (pill === "week") {
      const b = getWeekBounds();
      setRangeStart(b.start);
      setRangeEnd(b.end);
    } else if (pill === "month") {
      const b = getMonthBounds(0);
      setRangeStart(b.start);
      setRangeEnd(b.end);
    } else {
      const b = getMonthBounds(-1);
      setRangeStart(b.start);
      setRangeEnd(b.end);
    }
  };

  const handleRangeStartChange = (val: string) => {
    setActivePill("week"); // clear pill on manual change
    setRangeStart(val);
    // clamp end if span > 31 days
    if (rangeEnd && val) {
      const diff = (new Date(rangeEnd).getTime() - new Date(val).getTime()) / 86400000;
      if (diff > 31) setRangeEnd(addDays(val, 31));
    }
  };

  const handleRangeEndChange = (val: string) => {
    setActivePill("week"); // clear pill on manual change
    setRangeEnd(val);
    // clamp start if span > 31 days
    if (rangeStart && val) {
      const diff = (new Date(val).getTime() - new Date(rangeStart).getTime()) / 86400000;
      if (diff > 31) setRangeStart(addDays(val, -31));
    }
  };

  const toggleTaskDone = async (id: number) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;
    const newDone = !targetTask.done;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    try {
      const res = await toggleTaskStatus(id, newDone);
      if (!res.success) {
        loadDashboardData();
      }
    } catch {
      loadDashboardData();
    }
  };

  const handleDeleteTask = async (id: number) => {
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      const res = await deleteTask(id);
      if (!res.success) {
        loadDashboardData();
      }
    } catch {
      loadDashboardData();
    }
  };

  const pendingTasksCount = tasks.filter((t) => !t.done).length;
  const completedTasksCount = tasks.filter((t) => t.done).length;
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "pending") return !t.done;
    if (taskFilter === "completed") return t.done;
    return true;
  });

  const totalWeekHours = weeklyHours.reduce((s, d) => s + (d.hours || 0), 0);
  const isMonthView = weeklyHours.length > 9;

  // Compute weekly target from user's shift hours and working days
  const weeklyTarget = (() => {
    if (!user?.shiftStartTime || !user?.shiftEndTime) return 40;
    const parseHHMM = (t: string) => {
      const [time, period] = t.split(" ");
      const [h, m] = time.split(":").map(Number);
      const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
      return hour * 60 + (m || 0);
    };
    const dailyMins = parseHHMM(user.shiftEndTime) - parseHHMM(user.shiftStartTime);
    if (dailyMins <= 0) return 40;
    const workDays = (user.workingDays || "1,2,3,4,5").split(",").filter(Boolean).length;
    return Math.round((dailyMins / 60) * workDays * 10) / 10;
  })();
  const dailyTarget = (() => {
    if (!user?.shiftStartTime || !user?.shiftEndTime) return 8;
    const parseHHMM = (t: string) => {
      const [time, period] = t.split(" ");
      const [h, m] = time.split(":").map(Number);
      const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
      return hour * 60 + (m || 0);
    };
    const dailyMins = parseHHMM(user.shiftEndTime) - parseHHMM(user.shiftStartTime);
    return dailyMins > 0 ? Math.round((dailyMins / 60) * 10) / 10 : 8;
  })();

  // Spark lines from real data
  const todayStr = toLocalDateStr(new Date());
  const dueTodayCount = tasks.filter((t) => !t.done && t.dueDate === todayStr).length;
  // Last 7 days of actual hours for the weekly hours spark
  const weeklySparkData = weeklyHours.slice(-7).map((d) => d.hours);
  // Active (not completed) vs all projects spark
  const activeProjectsCount = employeeProjects.filter((p) => p.status !== "completed").length;

  // max end date for date inputs (start + 31)
  const maxEndDate = rangeStart ? addDays(rangeStart, 31) : undefined;
  // min start date for date inputs (end - 31)
  const minStartDate = rangeEnd ? addDays(rangeEnd, -31) : undefined;

  const pillClass = (pill: Pill) =>
    `h-7 px-3 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
      activePill === pill
        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
        : "bg-white dark:bg-brand-950/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-brand-900/50 hover:border-brand-400 dark:hover:border-brand-600"
    }`;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <KpiCardsSkeleton count={4} />
        <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            <TaskListSkeleton count={4} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Reorder wrapper: mobile = chart first, desktop = KPIs first */}
      <div className="flex flex-col gap-5">

        {/* KPI Cards — order-2 on mobile, order-1 on desktop */}
        <div className="order-2 sm:order-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              title="Weekly Hours"
              value={`${totalWeekHours.toFixed(1)}h / ${weeklyTarget}h`}
              change={totalWeekHours >= weeklyTarget ? "Goal reached!" : `${(weeklyTarget - totalWeekHours).toFixed(1)}h remaining`}
              changeType={totalWeekHours >= weeklyTarget ? "positive" : "neutral"}
              accent="brand"
              icon={<Clock className="h-5 w-5" />}
              spark={weeklySparkData.length > 0 ? weeklySparkData : undefined}
            />
            <KpiCard
              title="Pending Tasks"
              value={`${pendingTasksCount} Tasks`}
              change={dueTodayCount > 0 ? `${dueTodayCount} due today` : completedTasksCount > 0 ? `${completedTasksCount} completed` : "Nothing due today"}
              changeType={dueTodayCount > 0 ? "negative" : "positive"}
              accent="amber"
              icon={<CheckCircle2 className="h-5 w-5" />}
              spark={pendingTasksCount > 0 ? Array.from({ length: 7 }, (_, i) => Math.max(0, pendingTasksCount - (6 - i) * 0.5)) : undefined}
            />
            <KpiCard
              title="Projects"
              value={`${activeProjectsCount} Active`}
              change={employeeProjects.length > activeProjectsCount ? `${employeeProjects.length - activeProjectsCount} completed` : `${employeeProjects.length} assigned`}
              changeType={employeeProjects.length > activeProjectsCount ? "positive" : "neutral"}
              accent="emerald"
              icon={<Users className="h-5 w-5" />}
              spark={Array.from({ length: 7 }, () => activeProjectsCount)}
            />
            <KpiCard
              title="Hours Today"
              value={`${totalHoursToday.toFixed(1)}h / ${dailyTarget}h`}
              change={totalHoursToday >= dailyTarget ? "Shift complete!" : totalHoursToday > 0 ? `${(dailyTarget - totalHoursToday).toFixed(1)}h left` : "Not started"}
              changeType={totalHoursToday >= dailyTarget ? "positive" : "neutral"}
              accent="rose"
              icon={<Activity className="h-5 w-5" />}
              spark={Array.from({ length: 7 }, (_, i) => i < 6 ? 0 : totalHoursToday)}
            />
          </div>
        </div>

        {/* Working Hours — order-1 on mobile, order-2 on desktop */}
        <div className="order-1 sm:order-2">
          <Card className="border-slate-200/80 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] shadow-soft rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {/* Header row: title + pills + date inputs */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Working Hours</h2>
                  {/* Quick pills */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handlePill("week")} className={pillClass("week")}>This Week</button>
                    <button onClick={() => handlePill("month")} className={pillClass("month")}>This Month</button>
                    <button onClick={() => handlePill("lastMonth")} className={pillClass("lastMonth")}>Last Month</button>
                  </div>
                </div>
                {/* Custom date range */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={rangeStart}
                    min={minStartDate}
                    onChange={(e) => handleRangeStartChange(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 dark:border-brand-900/60 bg-white dark:bg-brand-950/40 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="date"
                    value={rangeEnd}
                    max={maxEndDate}
                    onChange={(e) => handleRangeEndChange(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 dark:border-brand-900/60 bg-white dark:bg-brand-950/40 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Max 1 month</span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyHours}
                    margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                    barCategoryGap={isMonthView ? "15%" : "30%"}
                  >
                    <defs>
                      <linearGradient id="whWorked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#263aa7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3a58e8" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="whAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.15} />
                      </linearGradient>
                      <linearGradient id="whOff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={({ x, y, payload }: any) => (
                        <text
                          x={x}
                          y={y + 4}
                          textAnchor="middle"
                          fontSize={isMonthView ? 8 : 11}
                          fontWeight={700}
                          fill="#94a3b8"
                        >
                          {isMonthView ? payload.value.charAt(0) : payload.value}
                        </text>
                      )}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }}
                      tickCount={5}
                      domain={[0, (max: number) => Math.max(Math.ceil(max), 9)]}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(38,58,167,0.06)", radius: 8 } as any}
                      contentStyle={{
                        background: "rgba(8,13,30,0.97)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "8px 12px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                      }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}
                      itemStyle={{ color: "#ffffff", fontWeight: 700 }}
                      formatter={(value: any, _: any, props: any) => {
                        if (props.payload.isWeekend) return ["Weekend / Off", ""];
                        if (props.payload.absent) return ["Absent", ""];
                        return [`${Number(value).toFixed(1)}h`, "Logged"];
                      }}
                    />
                    <Bar
                      dataKey="hours"
                      maxBarSize={isMonthView ? 16 : 40}
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        const fill = payload.isWeekend
                          ? "url(#whOff)"
                          : payload.absent
                          ? "url(#whAbsent)"
                          : "url(#whWorked)";
                        const actualH = height || 0;
                        const barH = actualH > 0 ? Math.max(actualH, 4) : 4;
                        const barY = actualH > 0 ? (y || 0) : (y || 0) + actualH - 4;
                        const r = Math.min(5, width / 2);
                        return (
                          <path
                            d={`M${x},${barY + barH} L${x},${barY + r} Q${x},${barY} ${x + r},${barY} L${x + width - r},${barY} Q${x + width},${barY} ${x + width},${barY + r} L${x + width},${barY + barH} Z`}
                            fill={fill}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-brand-600" />Present</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-rose-400" />Absent</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-slate-300 dark:bg-slate-600" />Weekend</span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Task Checklist + Shift Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Task Checklist */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200/80 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] shadow-soft rounded-2xl overflow-hidden h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-[#1e2b5e] pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Tasks
              </CardTitle>
              <div className="flex gap-1 bg-slate-50 dark:bg-brand-950/30 p-0.5 rounded-lg border border-slate-200 dark:border-[#1e2b5e]">
                {(["pending", "completed", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      taskFilter === filter
                        ? "bg-white dark:bg-[#0d1230] text-brand-600 dark:text-brand-300 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 flex-1">
              <div className="space-y-2 overflow-y-auto pr-1">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-brand-900/30 rounded-xl text-slate-400 text-xs">
                    <Check className="h-6 w-6 text-slate-300 mb-2" />
                    <span>No {taskFilter} tasks.</span>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${
                        task.done
                          ? "bg-slate-50/50 dark:bg-brand-950/20 border-slate-100 dark:border-brand-900/20 opacity-60"
                          : "bg-white dark:bg-brand-950/20 border-slate-200/60 dark:border-brand-900/30 hover:border-brand-400/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => toggleTaskDone(task.id)}
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            task.done
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "border-slate-300 dark:border-brand-900/60 hover:border-brand-500 bg-transparent"
                          }`}
                        >
                          {task.done && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate leading-tight ${task.done ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[9px] font-semibold text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-brand-950/40 border border-slate-100 dark:border-brand-900/30">
                              {task.project || "Personal"}
                            </span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Badge
                          variant={task.priority === "high" ? "danger" : task.priority === "medium" ? "warning" : "neutral"}
                          className="text-[8px] font-extrabold uppercase px-1.5 py-0.5"
                        >
                          {task.priority}
                        </Badge>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shift Details */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200/80 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] shadow-soft rounded-2xl overflow-hidden">
            <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-[#1e2b5e]">
              <CardTitle className="text-xs font-bold">Shift Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-brand-950/40">
                  <span>Profile:</span>
                  <Badge variant="brand" className="text-[9px] uppercase tracking-wider font-extrabold px-2">
                    {user?.activeShiftProfile || "Standard"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-brand-950/40">
                  <span>Core Hours:</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                    {user?.shiftStartTime || "09:00 AM"} — {user?.shiftEndTime || "05:00 PM"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-brand-950/40">
                  <span>Daily Target:</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">{dailyTarget}h</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span>Weekly Target:</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">{weeklyTarget}h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assigned Projects */}
      <Card className="border-slate-200/80 dark:border-[#1e2b5e] bg-white dark:bg-[#0d1230] shadow-soft rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-[#1e2b5e] pb-3.5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderKanban className="h-4.5 w-4.5 text-brand-600 dark:text-brand-300" /> Assigned Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {employeeProjects.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No active projects assigned.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeProjects.map((project) => {
                const statusType = getProjectStatusVariant(project.status);
                const progressPct = getProgressByStatus(project.status);
                return (
                  <Card
                    key={project.id}
                    className="border-slate-200 dark:border-[#1e2b5e] hover:border-brand-400/30 dark:hover:border-brand-600/40 hover:shadow-soft transition-all duration-200 bg-white dark:bg-[#0d1230]"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{project.name}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-brand-300/60 block font-medium mt-0.5">
                            {project.client || `#${project.id}`}
                          </span>
                        </div>
                        <Badge variant={statusType} dot className="text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 shrink-0">
                          {getProjectStatusLabel(project.status)}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-brand-300/60">
                          <span>Progress</span>
                          <span className="text-brand-600 dark:text-brand-300 font-extrabold tabular-nums">{progressPct}%</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5 bg-slate-100 dark:bg-brand-950/60" />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-brand-900/30 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-brand-300/60 font-semibold">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {project.deadline
                              ? new Date(project.deadline).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                              : "No deadline"}
                          </span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-white tabular-nums">
                          ${Number(project.budget || 0).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
