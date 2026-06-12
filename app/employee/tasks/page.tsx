"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/providers/ToastProvider";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, ListTodo, Loader2, Search,
  FolderKanban, Flag, CalendarDays, ChevronDown, User as UserIcon,
} from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { getMyAssignedTasks, toggleTaskStatus } from "@/app/actions/crm";

type Task = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  done: number;
  dueDate: string | null;
  projectId: number | null;
  projectName: string | null;
  assignedBy: { id: number; name: string } | null;
  createdAt: string;
};

type GroupBy = "status" | "project" | "priority" | "due";
type StatusFilter = "all" | "active" | "done";

const PRIORITY: Record<string, { label: string; variant: any; order: number }> = {
  high:   { label: "High",   variant: "danger",  order: 0 },
  medium: { label: "Medium", variant: "warning", order: 1 },
  low:    { label: "Low",    variant: "neutral", order: 2 },
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", "in-progress": "In Progress", "in-review": "In Review", done: "Done",
};

function dueMeta(dueDate: string | null, done: boolean) {
  if (!dueDate) return { label: "No due date", tone: "text-slate-400" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  const label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (done) return { label, tone: "text-slate-400" };
  if (diff < 0) return { label: `Overdue · ${label}`, tone: "text-rose-500" };
  if (diff === 0) return { label: "Due today", tone: "text-amber-500" };
  if (diff === 1) return { label: "Due tomorrow", tone: "text-amber-500" };
  if (diff <= 7) return { label: `${label} · ${diff}d`, tone: "text-slate-500 dark:text-slate-400" };
  return { label, tone: "text-slate-500 dark:text-slate-400" };
}

function dueBucket(dueDate: string | null, done: boolean): string {
  if (done) return "Completed";
  if (!dueDate) return "No due date";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return "This week";
  return "Later";
}
const DUE_ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Later", "No due date", "Completed"];

export default function EmployeeTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("due");

  const load = async () => {
    const res = await getMyAssignedTasks();
    if (res.success && res.data) setTasks(res.data as unknown as Task[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const projects = useMemo(() => {
    const m = new Map<string, string>();
    tasks.forEach((t) => { if (t.projectName) m.set(String(t.projectId), t.projectName); });
    return Array.from(m.entries());
  }, [tasks]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const overdue = active.filter((t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString()));
    return { total: tasks.length, active: active.length, done: done.length, overdue: overdue.length };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter === "active" && t.done) return false;
      if (statusFilter === "done" && !t.done) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (projectFilter !== "all" && String(t.projectId) !== projectFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !(t.projectName || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter]);

  // Group + sort the filtered tasks for display.
  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      let key: string;
      if (groupBy === "status") key = STATUS_LABEL[t.status] || t.status;
      else if (groupBy === "project") key = t.projectName || "No project";
      else if (groupBy === "priority") key = PRIORITY[t.priority]?.label || "Other";
      else key = dueBucket(t.dueDate, !!t.done);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Sort tasks inside each group: active first, then by priority, then due date.
    for (const arr of Array.from(map.values())) {
      arr.sort((a: Task, b: Task) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        const pa = PRIORITY[a.priority]?.order ?? 9, pb = PRIORITY[b.priority]?.order ?? 9;
        if (pa !== pb) return pa - pb;
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db2 = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db2;
      });
    }
    // Order the groups themselves.
    let keys = Array.from(map.keys());
    if (groupBy === "due") keys.sort((a, b) => DUE_ORDER.indexOf(a) - DUE_ORDER.indexOf(b));
    else if (groupBy === "priority") keys.sort((a, b) =>
      (["High", "Medium", "Low", "Other"].indexOf(a)) - (["High", "Medium", "Low", "Other"].indexOf(b)));
    else keys.sort();
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [filtered, groupBy]);

  const handleToggle = async (task: Task) => {
    if (updating) return;
    const next = task.done ? 0 : 1;
    setUpdating(task.id);
    // Optimistic
    setTasks((prev) => prev.map((t) => (t.id === task.id
      ? { ...t, done: next, status: next ? "done" : "in-progress" } : t)));
    try {
      const res = await toggleTaskStatus(task.id, next === 1);
      if (!res.success) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))); // revert
        toast(res.error || "Could not update task.", "error");
      } else {
        toast(next ? "Task marked done ✓" : "Task reopened", "success", 2000);
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      toast("Could not update task.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const SELECT = "h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer";

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Work</p>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Tasks</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard title="Total" value={`${stats.total}`} change="assigned to you" changeType="neutral" accent="brand" icon={<ListTodo className="h-5 w-5" />} />
        <KpiCard title="Active" value={`${stats.active}`} change="in progress" changeType="neutral" accent="amber" icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Overdue" value={`${stats.overdue}`} change={stats.overdue > 0 ? "needs attention" : "all on track"} changeType={stats.overdue > 0 ? "negative" : "positive"} accent="rose" icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard title="Completed" value={`${stats.done}`} change="done" changeType="positive" accent="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white" />
        </div>

        {/* Status segmented */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-0.5">
          {(["active", "all", "done"] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`h-8 px-3 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${statusFilter === s ? "bg-brand-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}>
              {s}
            </button>
          ))}
        </div>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={SELECT}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {projects.length > 0 && (
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={SELECT}>
            <option value="all">All projects</option>
            {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 ml-auto">
          <span className="hidden sm:inline">Group by</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={SELECT}>
            <option value="due">Due date</option>
            <option value="project">Project</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Grouped task list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {statusFilter === "active" ? "No active tasks — you're all caught up!" : "No tasks match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{group.key}</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((task) => {
                  const done = !!task.done;
                  const prio = PRIORITY[task.priority] || PRIORITY.low;
                  const due = dueMeta(task.dueDate, done);
                  return (
                    <div key={task.id}
                      className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${done
                        ? "bg-slate-50/60 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60"
                        : "bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-brand-700"}`}>
                      {/* Checkbox */}
                      <button onClick={() => handleToggle(task)} disabled={updating === task.id}
                        className="mt-0.5 shrink-0 cursor-pointer disabled:opacity-50" aria-label={done ? "Reopen task" : "Mark done"}>
                        {updating === task.id
                          ? <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                          : done
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          : <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors" />}
                      </button>

                      {/* Body */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold leading-snug ${done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                          {task.title}
                        </p>
                        {task.description && !done && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant={prio.variant} dot className="text-[9px] uppercase tracking-wider font-extrabold">{prio.label}</Badge>
                          {task.projectName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              <FolderKanban className="h-3 w-3" />{task.projectName}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${due.tone}`}>
                            <CalendarDays className="h-3 w-3" />{due.label}
                          </span>
                          {task.assignedBy && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <UserIcon className="h-3 w-3" />{task.assignedBy.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
