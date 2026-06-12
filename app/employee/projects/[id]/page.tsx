"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import {
  getProjectById, getTeamUsers, updateProject,
  addProjectTask, toggleTaskDone, deleteTask,
  updateInvoiceStatus, deleteProject, assignProjectLead,
} from "@/app/actions/crm";
import {
  ArrowLeft, Building2, CalendarDays, CheckCircle2, CheckSquare,
  Code2, Crown, DollarSign, Edit2, FileText, Globe2,
  Link as LinkIcon, Loader2, Megaphone, Phone, Plus, Receipt,
  Square, Trash2, Users, X, Zap, Target, ListTodo, SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectDetailSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import { KanbanBoard } from "@/components/ui/KanbanBoard";

// ── helpers ──────────────────────────────────────────────────────────────────
function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  planning:  { label: "Planning",   dot: "bg-violet-500", pill: "bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  active:    { label: "Active",     dot: "bg-emerald-500",pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  paused:    { label: "Paused",     dot: "bg-amber-500",  pill: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  completed: { label: "Completed",  dot: "bg-sky-500",    pill: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  cancelled: { label: "Cancelled",  dot: "bg-rose-500",   pill: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const PRIORITY_PILL: Record<string, string> = {
  high:   "bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800",
  medium: "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800",
  low:    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const TASK_PRIORITY_PILL: Record<string, string> = {
  high:   "bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40",
  medium: "bg-amber-50 text-amber-500 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40",
  low:    "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700",
};

const INV_STATUS: Record<string, { label: string; pill: string }> = {
  draft:   { label: "Draft",   pill: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700" },
  sent:    { label: "Sent",    pill: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  paid:    { label: "Paid",    pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  overdue: { label: "Overdue", pill: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const PROJ_TYPE_ICON: Record<string, React.ElementType> = { meta_ads: Megaphone, web_dev: Code2, other: Zap };
const PROJ_TYPE_LABEL: Record<string, string> = { meta_ads: "Meta Ads", web_dev: "Web Development", other: "Other" };

const INPUT  = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white cursor-pointer transition-all";
const LABEL  = "block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

function BentoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, action }: { icon: React.ElementType; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Icon className="h-3 w-3 text-slate-500" />
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      {action}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast, confirmDialog } = useToast();

  const [project, setProject]           = useState<any>(null);
  const [roster, setRoster]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [toggling, setToggling]         = useState<number | null>(null);
  const [assigningLead, setAssigningLead] = useState(false);

  // task add state
  const [newTask, setNewTask]         = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [addingTask, setAddingTask]   = useState(false);

  // edit drawer
  const [editOpen, setEditOpen]     = useState(false);
  const [editForm, setEditForm]     = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const numericId = Number(id);
    if (!id || isNaN(numericId)) {
      console.warn("ProjectDetailPage: id is not a valid number yet:", id);
      return;
    }
    setLoading(true);
    try {
      console.log("ProjectDetailPage: loading project with ID:", numericId);
      const [pr, tr] = await Promise.all([getProjectById(numericId), getTeamUsers()]);
      console.log("ProjectDetailPage: pr result:", pr);
      if (pr.success && pr.data) {
        setProject(pr.data);
        const p = pr.data as any;
        setNewAssignee(p.leadId ? String(p.leadId) : "");
      } else {
        console.error("ProjectDetailPage: failed to load project:", pr.error || "no data returned");
      }
      if (tr.success && tr.data) setRoster((tr.data as any[]).filter(u => u.role !== "client"));
    } catch (err) {
      console.error("ProjectDetailPage: error inside load():", err);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── derived ──────────────────────────────────────────────────────────────
  const sd       = parseDetails(project?.serviceDetails);
  const status   = STATUS_CONFIG[project?.status] || STATUS_CONFIG.planning;
  const TypeIcon = PROJ_TYPE_ICON[project?.projectType] || Zap;

  const tasks: any[] = project?.tasks || [];
  const tasksDone    = tasks.filter(t => t.done === 1).length;
  const tasksPct     = tasks.length ? Math.round(tasksDone / tasks.length * 100) : 0;
  const invs: any[]  = project?.linkedInvoices || [];

  const daysLeft = (() => {
    if (!project?.deadline) return null;
    return Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000);
  })();

  const fee = project?.monthlyFee ? `₹${project.monthlyFee.toLocaleString()}/mo`
    : project?.budget ? `₹${project.budget.toLocaleString()}` : null;

  // workload grouped by userId
  const workloadByUser: Record<number, { total: number; done: number }> = tasks.reduce((acc: any, t: any) => {
    if (!t.userId) return acc;
    if (!acc[t.userId]) acc[t.userId] = { total: 0, done: 0 };
    acc[t.userId].total++;
    if (t.done === 1) acc[t.userId].done++;
    return acc;
  }, {});

  // roster sorted: lead first, then by task count desc
  const teamWithWorkload = roster.map((u: any) => ({
    ...u,
    workload: workloadByUser[u.id] || { total: 0, done: 0 },
    isLead: u.id === project?.leadId,
  })).sort((a: any, b: any) => {
    if (a.isLead && !b.isLead) return -1;
    if (!a.isLead && b.isLead) return 1;
    return b.workload.total - a.workload.total;
  });

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleAssignLead = async (userId: number) => {
    if (!project || assigningLead) return;
    setAssigningLead(true);
    try {
      const r = await assignProjectLead(project.id, userId);
      if (r.success) {
        setProject((prev: any) => prev ? { ...prev, leadId: userId } : prev);
        toast("Project lead updated.", "success");
      } else toast(r.error || "Failed.", "error");
    } finally { setAssigningLead(false); }
  };

  const handleToggleTask = async (taskId: number, currentDone: number) => {
    setToggling(taskId);
    try {
      const r = await toggleTaskDone(taskId, currentDone === 1 ? 0 : 1);
      if (r.success) {
        setProject((prev: any) => prev ? {
          ...prev,
          tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, done: currentDone === 1 ? 0 : 1 } : t),
        } : prev);
      } else toast(r.error || "Failed.", "error");
    } finally { setToggling(null); }
  };

  const handleAddTask = async () => {
    if (!newTask.trim() || !project) return;
    setAddingTask(true);
    try {
      const assignTo = newAssignee ? Number(newAssignee) : undefined;
      const r = await addProjectTask(project.id, newTask.trim(), newPriority, assignTo);
      if (r.success) { setNewTask(""); await load(); toast("Task added.", "success"); }
      else toast(r.error || "Failed.", "error");
    } finally { setAddingTask(false); }
  };

  const handleDeleteTask = async (taskId: number) => {
    const r = await deleteTask(taskId);
    if (r.success) {
      setProject((prev: any) => prev ? { ...prev, tasks: prev.tasks.filter((t: any) => t.id !== taskId) } : prev);
      toast("Task removed.", "info");
    } else toast(r.error || "Failed.", "error");
  };

  const handleMarkPaid = async (invId: number) => {
    const paidDate = new Date().toISOString().split("T")[0];
    const r = await updateInvoiceStatus(invId, "paid", paidDate);
    if (r.success) {
      setProject((prev: any) => prev ? {
        ...prev,
        linkedInvoices: prev.linkedInvoices.map((i: any) => i.id === invId ? { ...i, status: "paid", paidDate } : i),
      } : prev);
      toast("Invoice marked as paid.", "success");
    } else toast(r.error || "Failed.", "error");
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!await confirmDialog(`Delete "${project.name}"? All tasks and data will be removed.`)) return;
    const r = await deleteProject(project.id);
    if (r.success) { toast(`${project.name} deleted.`, "info"); router.push("/employee/projects"); }
    else toast(r.error || "Failed.", "error");
  };

  const openEdit = () => {
    setEditForm({
      name: project.name || "",
      clientName: project.clientName || "",
      status: project.status || "planning",
      priority: project.priority || "medium",
      leadId: project.leadId ? String(project.leadId) : "",
      startDate: project.startDate || "",
      deadline: project.deadline || "",
      monthlyFee: project.monthlyFee || "",
      budget: project.budget || "",
      adSpendBudget: project.adSpendBudget || "",
      billingModel: project.billingModel || "fixed_fee",
      contractDuration: project.contractDuration || "",
      clientContactName: project.clientContactName || "",
      clientContactPhone: project.clientContactPhone || "",
      contractLink: project.contractLink || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setEditSaving(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      const r = await updateProject(project.id, fd);
      if (r.success) { setEditOpen(false); await load(); toast("Project updated.", "success"); }
      else toast(r.error || "Failed.", "error");
    } finally { setEditSaving(false); }
  };

  const ef = (v: Partial<typeof editForm>) => setEditForm((p: any) => ({ ...p, ...v }));

  const printDocument = () => {
    if (!project) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.name} — Proposal</title>
<style>body{font-family:'Inter',sans-serif;max-width:800px;margin:40px auto;color:#0f172a;line-height:1.6}
h1{font-size:2rem;font-weight:800;margin:0}h2{font-size:1rem;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-top:32px}
.pill{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;background:#ede9fe;color:#7c3aed}
table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}tr:last-child td{border:none}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px}
.kpi-card{padding:16px;border:1px solid #e2e8f0;border-radius:12px}
.kpi-card .label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.kpi-card .value{font-size:1.5rem;font-weight:800;color:#0f172a;margin-top:4px}
@media print{body{margin:20px}}</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">
  <div><h1>${project.name}</h1><p style="color:#64748b;margin:4px 0 0">${project.clientName || ""} · ${PROJ_TYPE_LABEL[project.projectType] || "Project"}</p></div>
  <span class="pill">${STATUS_CONFIG[project.status]?.label || project.status}</span>
</div>
<h2>Project Overview</h2>
<table><tr><th>Field</th><th>Value</th></tr>
<tr><td>Type</td><td>${PROJ_TYPE_LABEL[project.projectType] || "Other"}</td></tr>
<tr><td>Status</td><td>${STATUS_CONFIG[project.status]?.label || project.status}</td></tr>
<tr><td>Priority</td><td>${project.priority || "Medium"}</td></tr>
<tr><td>Start Date</td><td>${project.startDate || "—"}</td></tr>
<tr><td>Deadline</td><td>${project.deadline || "—"}</td></tr>
<tr><td>Contract Duration</td><td>${project.contractDuration ? `${project.contractDuration} months` : "—"}</td></tr>
${project.clientContactName ? `<tr><td>Client Contact</td><td>${project.clientContactName}</td></tr>` : ""}
</table>
<h2>Financials</h2>
<div class="kpi">
${project.monthlyFee ? `<div class="kpi-card"><div class="label">Monthly Retainer</div><div class="value">₹${project.monthlyFee.toLocaleString()}</div></div>` : ""}
${project.budget ? `<div class="kpi-card"><div class="label">Project Budget</div><div class="value">₹${project.budget.toLocaleString()}</div></div>` : ""}
${project.adSpendBudget ? `<div class="kpi-card"><div class="label">Ad Spend Budget</div><div class="value">₹${project.adSpendBudget.toLocaleString()}/mo</div></div>` : ""}
</div>
${tasks.length ? `<h2>Project Tasks (${tasksDone}/${tasks.length} completed)</h2>
<table><tr><th>#</th><th>Task</th><th>Priority</th><th>Status</th></tr>
${tasks.map((t: any, i: number) => `<tr><td>${i + 1}</td><td>${t.title}</td><td>${t.priority || "medium"}</td><td>${t.done === 1 ? "✓ Done" : "Pending"}</td></tr>`).join("")}
</table>` : ""}
${sd && Object.keys(sd).length ? `<h2>Service Details</h2>
<table><tr><th>Key</th><th>Value</th></tr>
${Object.entries(sd).filter(([, v]) => v).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
</table>` : ""}
<p style="margin-top:40px;color:#94a3b8;font-size:12px">Generated by ThePieCraft CRM · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast("Allow popups to download PDF.", "error"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) return <ProjectDetailSkeleton />;

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-slate-500 font-semibold">Project not found.</p>
      <Button variant="outline" onClick={() => router.push("/employee/projects")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Projects
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pb-12">

      {/* ── Breadcrumb nav ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" />Back
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <button onClick={() => router.push("/employee/projects")}
          className="text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors cursor-pointer">
          Projects
        </button>
        {project.clientName && (
          <>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <button onClick={() => project.client && router.push(`/employee/projects/${project.client.id}`)}
              className="text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors cursor-pointer">
              {project.clientName}
            </button>
          </>
        )}
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{project.name}</span>
      </div>

      {/* ── BENTO GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Header card (full width) ─────────────────────────────────────── */}
        <BentoCard className="lg:col-span-12 bg-slate-50 dark:bg-slate-900/40">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0 shadow-sm">
                <TypeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  {PROJ_TYPE_LABEL[project.projectType] || "Project"}
                </p>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{project.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={cn("inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border", status.pill)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full mr-1", status.dot)} />{status.label}
                  </span>
                  <span className={cn("inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border capitalize", PRIORITY_PILL[project.priority] || PRIORITY_PILL.medium)}>
                    {project.priority} priority
                  </span>
                  {project.clientName && (
                    <button onClick={() => project.client && router.push(`/employee/projects/${project.client.id}`)}
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/10 transition-all cursor-pointer">
                      <Building2 className="h-2.5 w-2.5" />{project.clientName}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              
              
              
            </div>
          </div>

          {/* Info strip */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6">
            {project.lead && (
              <div className="flex items-center gap-2">
                <Avatar name={project.lead.name} size="xs" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Lead</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{project.lead.name}</p>
                </div>
              </div>
            )}
            {project.startDate && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{project.startDate}</p>
              </div>
            )}
            {project.deadline && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deadline</p>
                <p className={cn("text-xs font-bold", daysLeft !== null && daysLeft < 7 && daysLeft >= 0 ? "text-rose-500" : "text-slate-700 dark:text-slate-200")}>
                  {project.deadline}
                  {daysLeft !== null && (
                    <span className="text-slate-400 font-normal ml-1">
                      ({daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "due today" : "overdue"})
                    </span>
                  )}
                </p>
              </div>
            )}
            {project.clientContactPhone && (
              <a href={`https://wa.me/${project.clientContactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full transition-all">
                <Phone className="h-3 w-3" />Client WhatsApp
              </a>
            )}
          </div>
        </BentoCard>

        {/* ── Team & Workload ──────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-4">
          <SectionTitle
            icon={Users}
            label="Team & Workload"
            action={
              <button onClick={openEdit}
                className="text-[9px] font-bold text-slate-400 hover:text-brand-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20">
                Edit lead
              </button>
            }
          />

          {/* Lead highlight */}
          {project.lead ? (
            <div className="mb-4 flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
              <div className="relative shrink-0">
                <Avatar name={project.lead.name} size="sm" />
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                  <Crown className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Project Lead</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{project.lead.name}</p>
              </div>
              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40 shrink-0">LEAD</span>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 px-3.5 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Crown className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400">No project lead assigned</p>
            </div>
          )}

          {/* Team member list */}
          {teamWithWorkload.length === 0 ? (
            <EmptyState
              icon={<Users className="h-4 w-4" />}
              title="No team members"
              description="Add team members to start assigning tasks."
            />
          ) : (
            <div className="space-y-1.5">
              {teamWithWorkload.map((member: any) => {
                const pct = member.workload.total
                  ? Math.round(member.workload.done / member.workload.total * 100) : 0;
                return (
                  <div key={member.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-950 transition-all">
                    <Avatar name={member.name} size="xs" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{member.name}</p>
                        {member.isLead && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                      </div>
                      {member.workload.total > 0 ? (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-slate-400">{member.workload.done}/{member.workload.total} tasks</span>
                            <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400">{pct}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <p className="text-[9px] text-slate-400">No tasks assigned</p>
                      )}
                    </div>
                    {!member.isLead && (
                      <button
                        onClick={() => handleAssignLead(member.id)}
                        disabled={assigningLead}
                        title="Make project lead"
                        className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer disabled:pointer-events-none">
                        {assigningLead
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Crown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>

        {/* ── Task Management ──────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-8">
          <SectionTitle icon={ListTodo} label={`Tasks (${tasksDone}/${tasks.length})`} />

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall progress</span>
                <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">{tasksPct}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${tasksPct}%` }} />
              </div>
            </div>
          )}

          {/* Add task */}
          <div className="mb-4 space-y-2">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTask()}
              placeholder="New task title… (press Enter to add)"
              className={cn(INPUT, "h-9 text-xs")}
            />
            <div className="flex gap-2">
              <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
                className={cn(SELECT, "h-9 text-xs flex-1")}>
                <option value="">Assign to lead</option>
                {roster.map((u: any) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name}{u.id === project?.leadId ? " (lead)" : ""}
                  </option>
                ))}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                className={cn(SELECT, "h-9 text-xs w-32")}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button size="sm" onClick={handleAddTask} disabled={addingTask || !newTask.trim()}
                className="bg-brand-600 text-white shrink-0 h-9 px-3">
                {addingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Kanban Board */}
          {!tasks.length ? (
            <EmptyState
              icon={<ListTodo className="h-4 w-4" />}
              title="No tasks yet"
              description="Add tasks above to start tracking project progress."
            />
          ) : (
            <div className="mt-6">
              <KanbanBoard 
                initialTasks={tasks.map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status || (t.done ? "done" : "todo"),
                  priority: t.priority,
                  dueDate: t.dueDate,
                  assignedTo: roster.find((u: any) => u.id === t.userId)?.name || "Unassigned"
                }))} 
              />
            </div>
          )}
        </BentoCard>

        {/* ── Project Details ──────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-4">
          <SectionTitle icon={SlidersHorizontal} label="Project Details" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {[
              { label: "Billing Model",       value: project.billingModel?.replace(/_/g, " ") },
              { label: "Contract Duration",   value: project.contractDuration ? `${project.contractDuration} months` : null },
              { label: "Billing Cycle Start", value: project.billingCycleStart },
              { label: "Access Granted",      value: project.accessGranted === 1 ? "Yes" : project.accessGranted === 0 ? "No" : null },
            ].filter(r => r.value).map(r => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{r.label}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-right capitalize">{r.value}</span>
              </div>
            ))}
          </div>

          {Object.keys(sd).length > 0 && (
            <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {project.projectType === "meta_ads" ? "Ads Setup" : "Dev Stack"}
              </p>
              <div className="space-y-2">
                {Object.entries(sd).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-[9px] text-slate-400 capitalize shrink-0">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 text-right break-all">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(project.contractLink || (project.projectType === "web_dev" && sd.oldWebsiteUrl)) && (
            <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {project.contractLink && (
                <a href={project.contractLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />View Contract / SOW
                </a>
              )}
              {project.projectType === "web_dev" && sd.oldWebsiteUrl && (
                <a href={sd.oldWebsiteUrl.startsWith("http") ? sd.oldWebsiteUrl : `https://${sd.oldWebsiteUrl}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />Current / Old Website
                </a>
              )}
            </div>
          )}
        </BentoCard>

        {/* ── Client Contact ───────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-4">
          <SectionTitle icon={Users} label="Client Contact" />
          <div className="space-y-4">
            {project.client && (
              <button onClick={() => router.push(`/employee/projects/${project.client.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-brand-700 transition-all cursor-pointer text-left">
                <div className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-xs font-extrabold text-white shrink-0">
                  {(project.clientName || "?").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{project.clientName}</p>
                  <p className="text-[10px] text-slate-400">View full client →</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              </button>
            )}
            {project.clientContactName ? (
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{project.clientContactName}</p>
                {project.clientContactPhone && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`tel:${project.clientContactPhone}`}
                      className="text-xs text-slate-500 hover:underline">{project.clientContactPhone}</a>
                    <a href={`https://wa.me/${project.clientContactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 rounded-full transition-all">
                      <Phone className="h-2.5 w-2.5" />WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ) : (
              !project.client && <p className="text-xs text-slate-400">No contact person saved.</p>
            )}
          </div>
        </BentoCard>

        </div>

          )}
        </BentoCard>

      </div>{/* /grid */}

      {/* ── EDIT DRAWER ─────────────────────────────────────────────────────── */}
      {editOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col">

            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Project</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[360px]">{project.name}</h2>
                </div>
                <button onClick={() => setEditOpen(false)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Core */}
                <section>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Core Info</p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Project Name *</label>
                      <input required value={editForm.name || ""} onChange={e => ef({ name: e.target.value })} className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Status</label>
                        <select value={editForm.status || "planning"} onChange={e => ef({ status: e.target.value })} className={SELECT}>
                          {["planning","active","paused","completed","cancelled"].map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Priority</label>
                        <select value={editForm.priority || "medium"} onChange={e => ef({ priority: e.target.value })} className={SELECT}>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Account Lead</label>
                      <select value={editForm.leadId || ""} onChange={e => ef({ leadId: e.target.value })} className={SELECT}>
                        <option value="">Unassigned</option>
                        {roster.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Timeline */}
                <section>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Timeline</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Start Date</label>
                      <input type="date" value={editForm.startDate || ""} onChange={e => ef({ startDate: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Deadline</label>
                      <input type="date" value={editForm.deadline || ""} onChange={e => ef({ deadline: e.target.value })} className={INPUT} />
                    </div>
                  </div>
                </section>

                {/* Financials */}
                <section>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Financials</p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Billing Model</label>
                      <select value={editForm.billingModel || "fixed_fee"} onChange={e => ef({ billingModel: e.target.value })} className={SELECT}>
                        <option value="fixed_fee">Fixed Fee</option>
                        <option value="monthly_retainer">Monthly Retainer</option>
                        <option value="hourly">Hourly</option>
                        <option value="revenue_share">Revenue Share</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Monthly Fee ($)</label>
                        <input type="number" value={editForm.monthlyFee || ""} onChange={e => ef({ monthlyFee: e.target.value })} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Project Budget ($)</label>
                        <input type="number" value={editForm.budget || ""} onChange={e => ef({ budget: e.target.value })} className={INPUT} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Ad Spend ($/mo)</label>
                        <input type="number" value={editForm.adSpendBudget || ""} onChange={e => ef({ adSpendBudget: e.target.value })} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Contract Duration (months)</label>
                        <input type="number" value={editForm.contractDuration || ""} onChange={e => ef({ contractDuration: e.target.value })} className={INPUT} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Client contact */}
                <section>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Client Contact</p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Contact Name</label>
                      <input value={editForm.clientContactName || ""} onChange={e => ef({ clientContactName: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Phone / WhatsApp</label>
                      <input value={editForm.clientContactPhone || ""} onChange={e => ef({ clientContactPhone: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Contract / SOW Link</label>
                      <input value={editForm.contractLink || ""} onChange={e => ef({ contractLink: e.target.value })} className={INPUT} />
                    </div>
                  </div>
                </section>

              </div>

              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editSaving}
                  className="bg-brand-600 text-white font-bold min-w-[130px] justify-center">
                  {editSaving ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Save Changes</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
