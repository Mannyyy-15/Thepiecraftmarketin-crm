"use client";

import {
  Calendar, Code2, Loader2, Megaphone, Search,
  CheckSquare, Square, LayoutGrid, List, ChevronDown,
  Target, ExternalLink, Globe, CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProjects, getProjectTasksGrouped, toggleTaskStatus } from "@/app/actions/crm";
import { getProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";
import { useToast } from "@/providers/ToastProvider";

function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function statusProgress(type: string, status: string, taskTotal: number, taskDone: number) {
  if (taskTotal > 0) return Math.round((taskDone / taskTotal) * 100);
  const maps: Record<string, Record<string, number>> = {
    meta_ads: { planning: 15, active: 70, paused: 70, completed: 100 },
    web_dev:  { planning: 5, discovery: 15, design: 30, development: 65, qa: 80, live: 95, completed: 100 },
  };
  return maps[type]?.[status] ?? (status === "completed" ? 100 : 35);
}

export default function EmployeeProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects]   = useState<any[]>([]);
  const [taskMap, setTaskMap]     = useState<Record<number, { total: number; done: number; tasks: any[] }>>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState<"board" | "list">("board");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [toggling, setToggling]   = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pr, tk] = await Promise.all([getProjects(), getProjectTasksGrouped()]);
      if (pr.success && pr.data) setProjects(pr.data);
      if (tk.success && tk.data) setTaskMap(tk.data as any);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleTask = async (taskId: number, currentDone: boolean) => {
    setToggling(taskId);
    try {
      const res = await toggleTaskStatus(taskId, !currentDone);
      if (res.success) await load();
      else toast(res.error || "Failed.", "error");
    } finally { setToggling(null); }
  };

  const toggleTaskExpand = (projectId: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const filtered = projects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.clientName || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200/40 dark:border-slate-800/30" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-3.5 text-slate-400" />
          <input
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white transition-all"
          />
        </div>
        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
          {([{ key: "board", Icon: LayoutGrid, label: "Board" }, { key: "list", Icon: List, label: "List" }] as const).map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all",
                view === v.key ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
              )}>
              <v.Icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title={search ? "No matching projects" : "No projects assigned"}
          description={search ? "Try a different search term." : "You'll see your assigned projects here once an admin assigns you."}
        />
      ) : view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const d = parseDetails(p.serviceDetails);
            const tg = taskMap[p.id];
            const total = tg?.total || 0;
            const done = tg?.done || 0;
            const pct = statusProgress(p.projectType, p.status, total, done);
            const isMeta = p.projectType === "meta_ads";
            const isExpanded = expandedTasks.has(p.id);
            const tasks = tg?.tasks || [];

            return (
              <div key={p.id} className={cn(
                "rounded-2xl border-l-4 border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 transition-all duration-200 hover:shadow-md",
                isMeta ? "border-l-indigo-500" : "border-l-emerald-500"
              )}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <div className={cn("h-5 w-5 rounded-md flex items-center justify-center shrink-0", isMeta ? "bg-indigo-500/10" : "bg-emerald-500/10")}>
                      {isMeta ? <Megaphone className="h-3 w-3 text-indigo-500" /> : <Code2 className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <Badge variant={getProjectStatusVariant(p.status)} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">
                      {getProjectStatusLabel(p.status)}
                    </Badge>
                  </div>
                  {total > 0 && (
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
                      {done}/{total}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{p.clientName || "Unknown client"}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  {isMeta ? (
                    <>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Monthly Fee</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{p.monthlyFee ? `$${Number(p.monthlyFee).toLocaleString()}/mo` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">KPI</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{d.primaryKpi || "—"}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Budget</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{Number(p.budget) > 0 ? `$${Number(p.budget).toLocaleString()}` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stack</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{d.platform || "—"}</p>
                      </div>
                    </>
                  )}
                </div>

                {!isMeta && d.repoLink && (
                  <div className="mt-2">
                    <a href={d.repoLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/15 transition-all">
                      <ExternalLink className="h-2.5 w-2.5" />Repo
                    </a>
                    {d.oldWebsiteUrl && (
                      <a href={d.oldWebsiteUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <Globe className="h-2.5 w-2.5" />Old Site
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <Progress value={pct} size="sm" barClassName={isMeta ? "bg-indigo-500" : "bg-emerald-500"} />
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <Calendar className="h-2.5 w-2.5" />
                      {p.deadline || "No deadline"}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{pct}%</span>
                  </div>
                </div>

                {/* Task section */}
                <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {tasks.length > 0 ? (
                    <>
                      <button
                        onClick={() => toggleTaskExpand(p.id)}
                        className="w-full flex items-center justify-between text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" />
                          My Tasks ({done}/{total} done)
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-1.5">
                          {tasks.map((task: any) => (
                            <div key={task.id} className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                              task.done === 1 ? "border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30" : "border-slate-200 dark:border-slate-800"
                            )}>
                              <button onClick={() => handleToggleTask(task.id, task.done === 1)} disabled={toggling === task.id}
                                className="shrink-0 cursor-pointer hover:scale-110 transition-transform" aria-label={task.done ? "Mark incomplete" : "Mark complete"}>
                                {toggling === task.id
                                  ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                  : task.done === 1
                                    ? <CheckSquare className={cn("h-4 w-4", isMeta ? "text-indigo-500" : "text-emerald-500")} />
                                    : <Square className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                                }
                              </button>
                              <span className={cn("flex-1 text-xs font-medium truncate", task.done === 1 ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300")}>
                                {task.title}
                              </span>
                              <span className={cn("shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                                task.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                                : task.priority === "low" ? "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                              )}>{task.priority}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No tasks assigned yet.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-950 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 text-left font-bold">Project</th>
                  <th className="px-5 py-3 text-left font-bold hidden sm:table-cell">Type</th>
                  <th className="px-5 py-3 text-left font-bold">Progress</th>
                  <th className="px-5 py-3 text-left font-bold hidden md:table-cell">Tasks</th>
                  <th className="px-5 py-3 text-left font-bold hidden lg:table-cell">Deadline</th>
                  <th className="px-5 py-3 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(p => {
                  const tg = taskMap[p.id];
                  const total = tg?.total || 0;
                  const done = tg?.done || 0;
                  const pct = statusProgress(p.projectType, p.status, total, done);
                  const isMeta = p.projectType === "meta_ads";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", isMeta ? "bg-indigo-500/10" : "bg-emerald-500/10")}>
                            {isMeta ? <Megaphone className="h-3.5 w-3.5 text-indigo-500" /> : <Code2 className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</div>
                            <div className="text-xs text-slate-400 truncate">{p.clientName || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", isMeta ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20")}>
                          {isMeta ? "Meta Ads" : "Web Dev"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <Progress value={pct} size="sm" className="w-20" barClassName={isMeta ? "bg-indigo-500" : "bg-emerald-500"} />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {total > 0
                          ? <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{done}/{total} done</span>
                          : <span className="text-xs text-slate-400 italic">none</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {p.deadline
                          ? <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><Calendar className="h-3 w-3 text-slate-400" />{p.deadline}</div>
                          : <span className="text-xs text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge dot variant={getProjectStatusVariant(p.status)} className="text-[9px]">
                          {getProjectStatusLabel(p.status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
