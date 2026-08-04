"use client";

import {
  Calendar, Code2, Loader2, Megaphone, Search,
  CheckSquare, Square, LayoutGrid, List, ChevronDown,
  Target, ExternalLink, Globe, CheckCircle2, Plus, X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProjects, getProjectTasksGrouped, toggleTaskStatus, createProject, getMyClients, getFreshUserProfile } from "@/app/actions/crm";
import { getProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";
import { useToast } from "@/providers/ToastProvider";
import { ProjectBoardSkeleton } from "@/components/ui/Skeleton";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseEmployeePermissions } from "@/lib/member-permissions";
import { getCachedValue, setCachedValue } from "@/hooks/useActionCache";

const EMPLOYEE_PROJECTS_CACHE_TTL_MS = 60_000;

function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

const BLANK_PROJECT = {
  name: "", clientId: "", projectType: "web_dev", deadline: "", budget: "", monthlyFee: "",
};
const INPUT = "h-11 w-full rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT = "h-11 w-full rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white cursor-pointer transition-all";
const LABEL = "block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

function taskProgress(taskTotal: number, taskDone: number) {
  return taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : null;
}

export default function EmployeeProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects]   = useState<any[]>(() => getCachedValue("employee:projects:list", EMPLOYEE_PROJECTS_CACHE_TTL_MS) ?? []);
  const [taskMap, setTaskMap]     = useState<Record<number, { total: number; done: number; tasks: any[] }>>(() => getCachedValue("employee:projects:taskMap", EMPLOYEE_PROJECTS_CACHE_TTL_MS) ?? {});
  const [loading, setLoading]     = useState(() => getCachedValue("employee:projects:list", EMPLOYEE_PROJECTS_CACHE_TTL_MS) === null);
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState<"board" | "list">("board");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [toggling, setToggling]   = useState<number | null>(null);

  const [me, setMe]               = useState<any>(() => getCachedValue("user_profile", EMPLOYEE_PROJECTS_CACHE_TTL_MS));
  const [myClients, setMyClients] = useState<any[]>(() => getCachedValue("employee:projects:myClients", EMPLOYEE_PROJECTS_CACHE_TTL_MS) ?? []);
  const [addOpen, setAddOpen]     = useState(false);
  const [form, setForm]           = useState({ ...BLANK_PROJECT });
  const [submitting, setSubmitting] = useState(false);
  const f = (v: Partial<typeof BLANK_PROJECT>) => setForm(p => ({ ...p, ...v }));

  const load = async () => {
    if (getCachedValue("employee:projects:list", EMPLOYEE_PROJECTS_CACHE_TTL_MS) === null) {
      setLoading(true);
    }
    try {
      const [pr, tk, pf, cl] = await Promise.all([getProjects(), getProjectTasksGrouped(), getFreshUserProfile(), getMyClients()]);
      if (pr.success && pr.data) { setProjects(pr.data); setCachedValue("employee:projects:list", pr.data); }
      if (tk.success && tk.data) { setTaskMap(tk.data as any); setCachedValue("employee:projects:taskMap", tk.data); }
      if (pf.success && pf.data) { setMe(pf.data); setCachedValue("user_profile", pf.data); }
      if (cl.success && cl.data) { setMyClients(cl.data as any[]); setCachedValue("employee:projects:myClients", cl.data); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useRefreshOnFocus(load);

  const myPermissions = useMemo(() => parseEmployeePermissions(me?.permissions), [me]);
  const canManageProjects = myPermissions.includes("manage_projects");

  const openAddProject = () => {
    setForm({ ...BLANK_PROJECT });
    setAddOpen(true);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast("Project name is required.", "error"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("clientId", form.clientId);
      fd.append("projectType", form.projectType);
      fd.append("deadline", form.deadline);
      fd.append("budget", form.budget || "0");
      fd.append("monthlyFee", form.monthlyFee || "0");
      const res = await createProject(fd);
      if (res.success) {
        setAddOpen(false);
        await load();
        toast(`${form.name} created.`, "success");
      } else {
        toast(res.error || "Failed to create project.", "error");
      }
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work"
        title="Projects"
        description="Track project progress and deliverables."
        actions={canManageProjects ? (
          <Button size="sm" onClick={openAddProject} className="bg-brand-600 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
          </Button>
        ) : undefined}
      />
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-3.5 text-slate-400" />
          <input
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white transition-all"
          />
        </div>
        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] p-0.5">
          {([{ key: "board", Icon: LayoutGrid, label: "Board" }, { key: "list", Icon: List, label: "List" }] as const).map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all",
                view === v.key ? "bg-slate-100 dark:bg-[#303030] text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700"
              )}>
              <v.Icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          <p className="text-xs">Loading projects...</p>
        </div>
      ) : filtered.length === 0 ? (
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
            const pct = taskProgress(total, done);
            const isMeta = p.projectType === "meta_ads";
            const isExpanded = expandedTasks.has(p.id);
            const tasks = tg?.tasks || [];

            return (
              <div key={p.id} className={cn(
                "rounded-2xl border-l-4 border border-slate-200/80 dark:border-[#303030]/80 bg-white dark:bg-[#1f1f1f] p-5 transition-all duration-200 hover:shadow-md",
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
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-[#303030] border border-slate-200 dark:border-[#303030] text-slate-500">
                      {done}/{total}
                    </span>
                  )}
                </div>

                <Link href={`/employee/projects/${p.id}`} className="block text-sm font-bold text-slate-900 dark:text-white truncate hover:text-brand-600 hover:underline transition-colors">{p.name}</Link>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{p.clientName || "Unknown client"}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#303030] grid grid-cols-2 gap-2 text-xs">
                  {isMeta ? (
                    <>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Monthly Fee</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{p.monthlyFee ? `₹${Number(p.monthlyFee).toLocaleString()}/mo` : "—"}</p>
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
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{Number(p.budget) > 0 ? `₹${Number(p.budget).toLocaleString()}` : "—"}</p>
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
                      <a href={d.oldWebsiteUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-[#303030] border border-slate-200 dark:border-[#303030] px-2 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#303030] transition-all">
                        <Globe className="h-2.5 w-2.5" />Old Site
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  {pct === null ? (
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#303030]" aria-hidden="true" />
                  ) : (
                    <Progress value={pct} size="sm" barClassName={isMeta ? "bg-indigo-500" : "bg-emerald-500"} />
                  )}
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <Calendar className="h-2.5 w-2.5" />
                      {p.deadline || "No deadline"}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                      {pct === null ? "No task data" : `${pct}%`}
                    </span>
                  </div>
                </div>

                {/* Task section */}
                <div className="mt-3 border-t border-slate-100 dark:border-[#303030] pt-3">
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
                              task.done === 1 ? "border-slate-100 dark:border-[#303030]/50 bg-slate-50/50 dark:bg-[#303030]/30" : "border-slate-200 dark:border-[#303030]"
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
                                : task.priority === "low" ? "bg-slate-50 text-slate-500 border-slate-200 dark:bg-[#303030] dark:border-[#303030]"
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
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#303030]/60 bg-white dark:bg-[#1f1f1f] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/60 dark:bg-[#303030]/40 border-b border-slate-100 dark:border-[#303030]">
                <tr>
                  <th className="px-5 py-3 text-left font-bold">Project</th>
                  <th className="px-5 py-3 text-left font-bold hidden sm:table-cell">Type</th>
                  <th className="px-5 py-3 text-left font-bold">Progress</th>
                  <th className="px-5 py-3 text-left font-bold hidden md:table-cell">Tasks</th>
                  <th className="px-5 py-3 text-left font-bold hidden lg:table-cell">Deadline</th>
                  <th className="px-5 py-3 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303030]">
                {filtered.map(p => {
                  const tg = taskMap[p.id];
                  const total = tg?.total || 0;
                  const done = tg?.done || 0;
                  const pct = taskProgress(total, done);
                  const isMeta = p.projectType === "meta_ads";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#303030]/50 transition-colors duration-150">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", isMeta ? "bg-indigo-500/10" : "bg-emerald-500/10")}>
                            {isMeta ? <Megaphone className="h-3.5 w-3.5 text-indigo-500" /> : <Code2 className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/employee/projects/${p.id}`} className="font-semibold text-slate-900 dark:text-white truncate hover:text-brand-600 hover:underline transition-colors">{p.name}</Link>
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
                        {pct === null ? (
                          <span className="text-xs text-slate-400 italic">No task data</span>
                        ) : (
                          <div className="flex items-center gap-2 min-w-[130px]">
                            <Progress value={pct} size="sm" className="w-20" barClassName={isMeta ? "bg-indigo-500" : "bg-emerald-500"} />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{pct}%</span>
                          </div>
                        )}
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

      {/* Add Project Modal (only shown to employees granted "manage_projects") */}
      {addOpen && canManageProjects && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setAddOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-[#1f1f1f] z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-[#303030]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Project</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Create a Project</h2>
                </div>
                <button onClick={() => setAddOpen(false)} className="h-8 w-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddProject} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className={LABEL}>Project Name *</label>
                  <input required value={form.name} onChange={e => f({ name: e.target.value })} placeholder="e.g. Q3 Website Revamp" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Client</label>
                  <select value={form.clientId} onChange={e => f({ clientId: e.target.value })} className={SELECT}>
                    <option value="__agency__">Internal / No client</option>
                    {myClients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Project Type</label>
                  <select value={form.projectType} onChange={e => f({ projectType: e.target.value })} className={SELECT}>
                    <option value="web_dev">Web Dev</option>
                    <option value="meta_ads">Meta Ads</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Deadline</label>
                    <input type="date" value={form.deadline} onChange={e => f({ deadline: e.target.value })} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>{form.projectType === "meta_ads" ? "Monthly Fee" : "Budget"}</label>
                    <input type="number" min={0} value={form.projectType === "meta_ads" ? form.monthlyFee : form.budget}
                      onChange={e => f(form.projectType === "meta_ads" ? { monthlyFee: e.target.value } : { budget: e.target.value })}
                      placeholder="0" className={INPUT} />
                  </div>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-[#303030] bg-slate-50/40 dark:bg-[#1f1f1f]/20 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting || !form.name.trim()}
                  className="bg-brand-600 text-white font-bold active:scale-95 min-w-[120px] justify-center">
                  {submitting ? "Creating…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Create</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

