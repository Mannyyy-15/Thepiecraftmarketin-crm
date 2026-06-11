"use client";
import { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import {
  Code2, Loader2, Megaphone, Plus, Search, Target, Trash2, X,
  ChevronRight, ChevronLeft, DollarSign, TrendingUp, BarChart3,
  CheckCircle2, Clock, ShieldAlert, ExternalLink, Zap, Layers,
  Globe, Link as LinkIcon, Database, Cpu, Sparkles, Users2,
  CalendarDays, SlidersHorizontal, FileCode2, Boxes,
  Edit2, ListTodo, FileText, Printer, Square, CheckSquare,
  PlusCircle, AlertCircle, Globe2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import {
  getProjects, createProject, deleteProject, getTeamUsers,
  getProjectTasksGrouped, addProjectTask, deleteTask, toggleTaskStatus,
  updateProject, getClientsEnriched,
} from "@/app/actions/crm";
import { getProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

// ── Service type config ───────────────────────────────────────────────────────
const TYPES = {
  meta_ads: {
    label: "Meta Ads",
    Icon: Megaphone,
    accent: "from-indigo-500 to-indigo-600",
    border: "border-l-indigo-500",
    ring: "ring-indigo-500/20 dark:ring-indigo-500/20",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    statuses: ["planning", "active", "paused", "completed"],
    description: "Meta advertising campaigns — retainer billing, ad account access, KPI tracking, and campaign performance.",
    features: ["Retainer & ad spend", "Ad account + Pixel IDs", "Campaign objectives & KPIs", "Conversion mapping"],
    steps: ["General", "Campaign", "Billing"],
  },
  web_dev: {
    label: "Web Development",
    Icon: Code2,
    accent: "from-emerald-500 to-teal-500",
    border: "border-l-emerald-500",
    ring: "ring-emerald-500/20 dark:ring-emerald-500/20",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    statuses: ["planning", "discovery", "design", "development", "qa", "live", "completed"],
    description: "Website and software projects — fixed budget, tech stack, timeline, repo links, and asset delivery.",
    features: ["Platform & tech stack", "Domain & hosting", "Budget & pages count", "Repo + asset links"],
    steps: ["Core Info", "Technical", "Assets"],
  },
  other: {
    label: "Other",
    Icon: Zap,
    accent: "from-slate-500 to-slate-600",
    border: "border-l-slate-400",
    ring: "ring-slate-500/20",
    badgeBg: "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200",
    statuses: ["planning", "active", "completed"],
    description: "",
    features: [],
    steps: ["General", "Setup", "Billing"],
  },
};

function getPriorityClass(p: string) {
  switch (p) {
    case "high": return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/30";
    case "low":  return "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/30";
    default:     return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/30";
  }
}

const META_STATUSES   = ["planning", "active", "paused", "completed"];
const WEBDEV_STATUSES = ["planning", "discovery", "design", "development", "qa", "live", "completed"];

function progressFromStatus(type: string, status: string) {
  const maps: Record<string, Record<string, number>> = {
    meta_ads: { planning: 15, active: 70, paused: 70, completed: 100 },
    web_dev:  { planning: 5, discovery: 15, design: 30, development: 65, qa: 80, live: 95, completed: 100 },
  };
  return maps[type]?.[status] ?? (status === "completed" ? 100 : 35);
}

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK: Record<string, any> = {
  name: "", clientId: "", clientName: "", leadId: "", startDate: "", endDate: "",
  status: "planning", priority: "medium", notes: "",
  monthlyFee: "", adSpendBudget: "",
  adAccountId: "", businessManagerId: "", pixelId: "",
  conversionLocation: "website", landingPage: "",
  objective: "leads", primaryKpi: "CPL", targetKpiValue: "",
  totalBudget: "",
  websiteType: "landing_page", platform: "Next.js",
  domain: "", hostingProvider: "", repoLink: "",
  cmsNeeded: false, adminPanelNeeded: false, dbNeeded: false,
  integrations: "", brandAssets: "", contentAssets: "",
  referenceLinks: "", numPages: "", launchDate: "",
  oldWebsiteUrl: "",
  // Phase 1 CRM fields
  billingCycleStart: "", contractDuration: "", clientContactName: "",
  clientContactPhone: "", accessGranted: false, contractLink: "",
};

// ── Style constants ───────────────────────────────────────────────────────────
const INPUT   = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT  = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-800 dark:text-white cursor-pointer transition-all";
const LABEL   = "block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all" onClick={onChange}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <div className={cn("h-5 w-9 rounded-full transition-all relative border-2 shrink-0", value ? "bg-emerald-500 border-emerald-500" : "bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700")}>
        <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
      </div>
    </div>
  );
}

function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// ── Document generation ───────────────────────────────────────────────────────
function printDocument(project: any, roster: any[], tasks: any[]) {
  const d = parseDetails(project.serviceDetails);
  const lead = roster.find((u: any) => u.id === project.leadId);
  const isMeta = project.projectType === "meta_ads";
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const doneCount = tasks.filter(t => t.done === 1).length;

  const taskRows = tasks.length > 0
    ? tasks.map(t => `
      <div class="task-item">
        <div class="task-check ${t.done ? "done" : ""}"></div>
        <span class="task-title ${t.done ? "done-text" : ""}">${t.title}</span>
        <span class="task-priority priority-${t.priority}">${t.priority}</span>
      </div>`).join("")
    : `<p style="color:#94a3b8;font-size:12px;font-style:italic;">No tasks assigned yet.</p>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${isMeta ? "Service Agreement" : "Project Proposal"} — ${project.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Inter,sans-serif;color:#0f172a;background:#fff;padding:48px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e2e8f0;margin-bottom:32px;}
  .agency{font-size:22px;font-weight:800;color:#6366f1;letter-spacing:-0.5px;}
  .agency-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
  .doc-meta{text-align:right;}
  .doc-type{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;}
  .doc-ref{font-size:12px;color:#64748b;margin-top:4px;}
  .section{margin-bottom:28px;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
  .field-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:3px;}
  .field-value{font-size:13px;color:#1e293b;font-weight:500;}
  .amount{font-size:26px;font-weight:800;color:#1e293b;}
  .task-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;}
  .task-check{width:16px;height:16px;border:2px solid #cbd5e1;border-radius:4px;flex-shrink:0;}
  .task-check.done{background:#22c55e;border-color:#22c55e;}
  .task-title{flex:1;font-size:13px;color:#334155;}
  .task-title.done-text{text-decoration:line-through;color:#94a3b8;}
  .task-priority{font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:12px;background:#f1f5f9;color:#475569;}
  .priority-high{background:#fef2f2;color:#ef4444;}
  .priority-low{background:#f8fafc;color:#94a3b8;}
  .progress-bar-bg{height:6px;background:#f1f5f9;border-radius:3px;margin:8px 0;}
  .progress-bar-fill{height:6px;background:#6366f1;border-radius:3px;}
  .chip{display:inline-block;padding:4px 10px;border:1px solid #e2e8f0;border-radius:20px;font-size:10px;color:#475569;font-weight:600;margin:2px;}
  .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
  .footer-text{font-size:10px;color:#94a3b8;}
  .sig-box{width:220px;border-bottom:1px solid #cbd5e1;height:40px;margin-top:12px;}
  .sig-label{font-size:9px;color:#94a3b8;margin-top:4px;}
  @media print{body{padding:20px;} @page{margin:20mm;}}
</style></head>
<body>
  <div class="header">
    <div>
      <div class="agency">ThePieCraft</div>
      <div class="agency-sub">Digital Marketing &amp; Web Development Agency</div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${isMeta ? "Service Agreement" : "Project Proposal"}</div>
      <div class="doc-ref">Ref: ${isMeta ? "SA" : "PROP"}-${String(project.id).padStart(4, "0")}</div>
      <div class="doc-ref">Date: ${today}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Project Overview</div>
    <div class="grid-2">
      <div>
        <div class="field-label">Project Name</div>
        <div class="field-value" style="font-size:17px;font-weight:700;">${project.name}</div>
      </div>
      <div>
        <div class="field-label">Client</div>
        <div class="field-value" style="font-size:17px;font-weight:700;">${project.clientName || "—"}</div>
      </div>
    </div>
    <div style="margin-top:16px;" class="grid-3">
      <div>
        <div class="field-label">Service Type</div>
        <div class="field-value">${isMeta ? "Meta Ads Management" : "Web Development"}</div>
      </div>
      <div>
        <div class="field-label">Status</div>
        <div class="field-value" style="text-transform:capitalize;">${project.status}</div>
      </div>
      <div>
        <div class="field-label">Priority</div>
        <div class="field-value" style="text-transform:capitalize;">${project.priority}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client Contact</div>
    <div class="grid-2">
      <div>
        <div class="field-label">Point of Contact</div>
        <div class="field-value">${project.clientContactName || "—"}</div>
      </div>
      <div>
        <div class="field-label">Phone / WhatsApp</div>
        <div class="field-value">${project.clientContactPhone || "—"}</div>
      </div>
    </div>
  </div>

  ${isMeta ? `
  <div class="section">
    <div class="section-title">Campaign Configuration</div>
    <div class="grid-3">
      <div><div class="field-label">Objective</div><div class="field-value" style="text-transform:capitalize;">${d.objective || "—"}</div></div>
      <div><div class="field-label">Primary KPI</div><div class="field-value">${d.primaryKpi || "—"}${d.targetKpiValue ? ` (${d.targetKpiValue})` : ""}</div></div>
      <div><div class="field-label">Conversion</div><div class="field-value" style="text-transform:capitalize;">${d.conversionLocation?.replace("_", " ") || "—"}</div></div>
    </div>
    ${d.adAccountId || d.businessManagerId || d.pixelId ? `
    <div style="margin-top:16px;" class="grid-3">
      <div><div class="field-label">Ad Account ID</div><div class="field-value" style="font-family:monospace;font-size:12px;">${d.adAccountId || "—"}</div></div>
      <div><div class="field-label">Business Manager</div><div class="field-value" style="font-family:monospace;font-size:12px;">${d.businessManagerId || "—"}</div></div>
      <div><div class="field-label">Pixel ID</div><div class="field-value" style="font-family:monospace;font-size:12px;">${d.pixelId || "—"}</div></div>
    </div>` : ""}
  </div>` : `
  <div class="section">
    <div class="section-title">Technical Scope</div>
    <div class="grid-3">
      <div><div class="field-label">Website Type</div><div class="field-value" style="text-transform:capitalize;">${d.websiteType?.replace("_", " ") || "—"}</div></div>
      <div><div class="field-label">Platform / Stack</div><div class="field-value">${d.platform || "—"}</div></div>
      <div><div class="field-label">Pages</div><div class="field-value">${d.numPages || "—"}</div></div>
    </div>
    <div style="margin-top:16px;" class="grid-3">
      <div><div class="field-label">Domain</div><div class="field-value">${d.domain || "—"}</div></div>
      <div><div class="field-label">Hosting</div><div class="field-value">${d.hostingProvider || "—"}</div></div>
      <div><div class="field-label">Old Website</div><div class="field-value" style="font-size:11px;word-break:break-all;">${d.oldWebsiteUrl || "—"}</div></div>
    </div>
    ${(d.cmsNeeded || d.adminPanelNeeded || d.dbNeeded) ? `
    <div style="margin-top:12px;">
      ${d.cmsNeeded ? '<span class="chip">CMS</span>' : ""}
      ${d.adminPanelNeeded ? '<span class="chip">Admin Panel</span>' : ""}
      ${d.dbNeeded ? '<span class="chip">Database</span>' : ""}
    </div>` : ""}
  </div>`}

  <div class="section">
    <div class="section-title">Timeline</div>
    <div class="grid-3">
      <div><div class="field-label">Start Date</div><div class="field-value">${project.startDate || "—"}</div></div>
      <div><div class="field-label">Deadline</div><div class="field-value">${project.deadline || "—"}</div></div>
      ${isMeta ? `<div><div class="field-label">Contract Duration</div><div class="field-value">${project.contractDuration ? project.contractDuration + " months" : "—"}</div></div>` : `<div><div class="field-label">Launch Date</div><div class="field-value">${d.launchDate || "—"}</div></div>`}
    </div>
    ${lead ? `<div style="margin-top:16px;"><div class="field-label">Assigned To</div><div class="field-value">${lead.name} — ${lead.systemRole || lead.role}</div></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Investment</div>
    <div class="grid-2">
      ${isMeta ? `
      <div>
        <div class="field-label">Management Retainer</div>
        <div class="amount">${project.monthlyFee ? "₹" + Number(project.monthlyFee).toLocaleString() + "/mo" : "—"}</div>
      </div>
      <div>
        <div class="field-label">Ad Spend Budget</div>
        <div class="amount">${Number(project.adSpendBudget) > 0 ? "₹" + Number(project.adSpendBudget).toLocaleString() + "/mo" : "—"}</div>
      </div>` : `
      <div>
        <div class="field-label">Project Budget</div>
        <div class="amount">${Number(project.budget) > 0 ? "₹" + Number(project.budget).toLocaleString() : "—"}</div>
      </div>
      <div>
        <div class="field-label">Billing Cycle Start</div>
        <div class="field-value" style="font-size:15px;">${project.billingCycleStart || "—"}</div>
      </div>`}
    </div>
  </div>

  ${tasks.length > 0 ? `
  <div class="section">
    <div class="section-title">Project Tasks (${doneCount}/${tasks.length} completed)</div>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%"></div></div>
    <div style="margin-top:12px;">${taskRows}</div>
  </div>` : ""}

  <div class="footer">
    <div>
      <div class="footer-text">ThePieCraft · samashadshaikh78@gmail.com</div>
      <div class="footer-text" style="margin-top:2px;">This document is confidential and prepared exclusively for ${project.clientName || "the client"}.</div>
    </div>
    <div style="text-align:right;">
      <div class="sig-box"></div>
      <div class="sig-label">Authorized Signature — ThePieCraft</div>
    </div>
  </div>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { toast, confirmDialog } = useToast();
  const router = useRouter();

  const [projects, setProjects]   = useState<any[]>([]);
  const [roster, setRoster]       = useState<any[]>([]);
  const [clients, setClients]     = useState<any[]>([]);
  const [taskMap, setTaskMap]     = useState<Record<number, { total: number; done: number; tasks: any[] }>>({});
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const [search, setSearch]             = useState("");
  const [serviceTab, setServiceTab]     = useState<"all" | "meta_ads" | "web_dev">("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // New project drawer
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerStep, setDrawerStep]   = useState(0);
  const [projectType, setProjectType] = useState<"meta_ads" | "web_dev">("meta_ads");
  const [formTab, setFormTab]         = useState(0);
  const [form, setForm]               = useState({ ...BLANK });
  const [submitting, setSubmitting]   = useState(false);

  // Edit drawer
  const [editOpen, setEditOpen]           = useState(false);
  const [editProject, setEditProject]     = useState<any>(null);
  const [editForm, setEditForm]           = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Task modal
  const [taskModalProject, setTaskModalProject] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle]         = useState("");
  const [newTaskPriority, setNewTaskPriority]   = useState("medium");
  const [addingTask, setAddingTask]             = useState(false);
  const [togglingTask, setTogglingTask]         = useState<number | null>(null);
  const [deletingTask, setDeletingTask]         = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pr, tr, tk, cl] = await Promise.all([getProjects(), getTeamUsers(), getProjectTasksGrouped(), getClientsEnriched()]);
      if (pr.success && pr.data) setProjects(pr.data);
      if (tr.success && tr.data) setRoster(tr.data.filter((u: any) => u.role !== "client"));
      if (tk.success && tk.data) setTaskMap(tk.data as any);
      if (cl.success && cl.data) setClients(cl.data as any[]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDrawer = () => {
    setForm({ ...BLANK });
    setDrawerStep(0);
    setFormTab(0);
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);

  const openEdit = (p: any) => {
    const d = parseDetails(p.serviceDetails);
    setEditProject(p);
    setEditForm({
      name: p.name || "",
      clientId: p.clientId ? String(p.clientId) : "",
      clientName: p.clientName || "",
      leadId: p.leadId ? String(p.leadId) : "",
      status: p.status || "planning",
      priority: p.priority || "medium",
      startDate: p.startDate || "",
      endDate: p.deadline || "",
      monthlyFee: p.monthlyFee || "",
      adSpendBudget: p.adSpendBudget || "",
      totalBudget: p.budget || "",
      billingCycleStart: p.billingCycleStart || "",
      contractDuration: p.contractDuration || "",
      clientContactName: p.clientContactName || "",
      clientContactPhone: p.clientContactPhone || "",
      accessGranted: p.accessGranted === 1,
      contractLink: p.contractLink || "",
      launchDate: d.launchDate || "",
    });
    setEditOpen(true);
  };

  const switchTab = (tab: "all" | "meta_ads" | "web_dev") => {
    setServiceTab(tab);
    const valid = tab === "meta_ads" ? META_STATUSES : tab === "web_dev" ? WEBDEV_STATUSES : [...META_STATUSES, ...WEBDEV_STATUSES];
    if (statusFilter !== "all" && !valid.includes(statusFilter)) setStatusFilter("all");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isMeta = projectType === "meta_ads";
      const serviceDetails = isMeta
        ? JSON.stringify({ adAccountId: form.adAccountId, businessManagerId: form.businessManagerId, pixelId: form.pixelId, conversionLocation: form.conversionLocation, landingPage: form.landingPage, objective: form.objective, primaryKpi: form.primaryKpi, targetKpiValue: form.targetKpiValue })
        : JSON.stringify({ websiteType: form.websiteType, platform: form.platform, domain: form.domain, hostingProvider: form.hostingProvider, repoLink: form.repoLink, cmsNeeded: form.cmsNeeded, adminPanelNeeded: form.adminPanelNeeded, dbNeeded: form.dbNeeded, integrations: form.integrations, brandAssets: form.brandAssets, contentAssets: form.contentAssets, referenceLinks: form.referenceLinks, numPages: form.numPages, launchDate: form.launchDate, oldWebsiteUrl: form.oldWebsiteUrl });

      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("clientId", form.clientId || "");
      fd.append("clientName", form.clientName);
      fd.append("leadId", form.leadId);
      fd.append("projectType", projectType);
      fd.append("startDate", form.startDate);
      fd.append("deadline", form.endDate);
      fd.append("status", form.status);
      fd.append("priority", form.priority);
      fd.append("billingModel", isMeta ? "retainer" : "fixed_fee");
      fd.append("monthlyFee", isMeta ? form.monthlyFee || "0" : "0");
      fd.append("adSpendBudget", isMeta ? form.adSpendBudget || "0" : "0");
      fd.append("budget", isMeta ? "0" : form.totalBudget || "0");
      fd.append("serviceDetails", serviceDetails);
      fd.append("billingCycleStart", form.billingCycleStart || "");
      fd.append("contractDuration", form.contractDuration || "0");
      fd.append("clientContactName", form.clientContactName || "");
      fd.append("clientContactPhone", form.clientContactPhone || "");
      fd.append("accessGranted", form.accessGranted ? "true" : "false");
      fd.append("contractLink", isMeta ? form.contractLink || "" : "");

      const res = await createProject(fd);
      if (res.success) {
        closeDrawer();
        await load();
        toast(`"${form.name}" created — tasks auto-assigned!`, "success");
      } else toast(res.error || "Failed to create project.", "error");
    } catch (err: any) {
      toast(err.message, "error");
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    setEditSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", editForm.name);
      fd.append("clientId", editForm.clientId || "");
      fd.append("clientName", editForm.clientName);
      fd.append("leadId", editForm.leadId || "");
      fd.append("status", editForm.status);
      fd.append("priority", editForm.priority);
      fd.append("startDate", editForm.startDate || "");
      fd.append("deadline", editForm.endDate || "");
      fd.append("monthlyFee", editForm.monthlyFee || "0");
      fd.append("adSpendBudget", editForm.adSpendBudget || "0");
      fd.append("budget", editForm.totalBudget || "0");
      fd.append("billingCycleStart", editForm.billingCycleStart || "");
      fd.append("contractDuration", editForm.contractDuration || "0");
      fd.append("clientContactName", editForm.clientContactName || "");
      fd.append("clientContactPhone", editForm.clientContactPhone || "");
      fd.append("accessGranted", editForm.accessGranted ? "true" : "false");
      fd.append("contractLink", editForm.contractLink || "");

      const res = await updateProject(editProject.id, fd);
      if (res.success) {
        setEditOpen(false);
        await load();
        toast("Project updated.", "success");
      } else toast(res.error || "Failed to update.", "error");
    } catch (err: any) {
      toast(err.message, "error");
    } finally { setEditSubmitting(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!await confirmDialog(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await deleteProject(id);
      if (res.success) { await load(); toast("Project deleted.", "info"); }
      else toast(res.error || "Failed.", "error");
    } finally { setDeleting(null); }
  };

  const handleTaskToggle = async (taskId: number, currentDone: boolean) => {
    setTogglingTask(taskId);
    try {
      const res = await toggleTaskStatus(taskId, !currentDone);
      if (res.success) await load();
      else toast(res.error || "Failed to update task.", "error");
    } finally { setTogglingTask(null); }
  };

  const handleTaskDelete = async (taskId: number) => {
    setDeletingTask(taskId);
    try {
      const res = await deleteTask(taskId);
      if (res.success) await load();
      else toast(res.error || "Failed.", "error");
    } finally { setDeletingTask(null); }
  };

  const handleAddTask = async () => {
    if (!taskModalProject || !newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const res = await addProjectTask(taskModalProject.id, newTaskTitle.trim(), newTaskPriority);
      if (res.success) {
        setNewTaskTitle("");
        setNewTaskPriority("medium");
        await load();
      } else toast(res.error || "Failed.", "error");
    } finally { setAddingTask(false); }
  };

  const f = (v: Partial<typeof BLANK>) => setForm(p => ({ ...p, ...v }));
  const ef = (v: any) => setEditForm((p: any) => ({ ...p, ...v }));

  const matchesFilter = (p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.clientName || "").toLowerCase().includes(q);
    }
    return true;
  };

  const allMeta  = projects.filter(p => p.projectType === "meta_ads");
  const allWeb   = projects.filter(p => p.projectType === "web_dev");
  const metaList = allMeta.filter(matchesFilter);
  const webList  = allWeb.filter(matchesFilter);

  const showMeta   = serviceTab === "all" || serviceTab === "meta_ads";
  const showWeb    = serviceTab === "all" || serviceTab === "web_dev";
  const hasResults = (showMeta && metaList.length > 0) || (showWeb && webList.length > 0);

  const statusOptions = serviceTab === "meta_ads" ? META_STATUSES
    : serviceTab === "web_dev" ? WEBDEV_STATUSES
    : [...META_STATUSES, ...WEBDEV_STATUSES].filter((v, i, a) => a.indexOf(v) === i);

  const typeCfg = TYPES[projectType];

  // Helper: get task progress for a project
  const getTaskProgress = (projectId: number) => {
    const g = taskMap[projectId];
    if (!g || g.total === 0) return null;
    return { total: g.total, done: g.done, pct: Math.round((g.done / g.total) * 100) };
  };

  const taskModalTasks = taskModalProject ? (taskMap[taskModalProject.id]?.tasks || []) : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Projects"
        actions={
          <Button onClick={openDrawer} className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        }
      />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {([
              { key: "all",      label: "All",      count: allMeta.length + allWeb.length },
              { key: "meta_ads", label: "Meta Ads", Icon: Megaphone, count: allMeta.length },
              { key: "web_dev",  label: "Web Dev",  Icon: Code2,     count: allWeb.length  },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  serviceTab === tab.key ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}>
                {"Icon" in tab && <tab.Icon className="h-3 w-3" />}
                {tab.label}
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all",
                  serviceTab === tab.key ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-3.5 text-slate-400" />
            <input type="search" placeholder="Search projects or clients…" value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white transition-all" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mr-1">Status</span>
          {["all", ...statusOptions].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all cursor-pointer",
                statusFilter === s ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
              )}>
              {s === "all" ? "All" : getProjectStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : projects.length === 0 ? (
        <EmptyState icon={<Target className="h-5 w-5" />} title="No projects yet" description="Create your first project to get started."
          action={<Button onClick={openDrawer} size="sm" className="bg-brand-600 text-white"><Plus className="h-3.5 w-3.5 mr-1" /> New Project</Button>} />
      ) : !hasResults ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title="No matching projects" description="Try a different search or status filter." />
      ) : (
        <div className="space-y-10">

          {/* Meta Ads section */}
          {showMeta && metaList.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center">
                  <Megaphone className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Meta Ads</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-500/20">{metaList.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {metaList.map(p => {
                  const d = parseDetails(p.serviceDetails);
                  const tp = getTaskProgress(p.id);
                  const pct = tp ? tp.pct : progressFromStatus(p.projectType, p.status);
                  const lead = roster.find((u: any) => u.id === p.leadId);
                  return (
                    <div key={p.id} onClick={() => router.push(`/admin/projects/${p.id}`)} className="rounded-2xl border-l-4 border-l-indigo-500 border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={getProjectStatusVariant(p.status)} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{getProjectStatusLabel(p.status)}</Badge>
                          {p.priority === "high" && <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", getPriorityClass("high"))}>High</span>}
                          {tp && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">{tp.done}/{tp.total} tasks</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); openEdit(p); }} title="Edit project" aria-label="Edit project"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setTaskModalProject(p); setNewTaskTitle(""); }} title="Manage tasks" aria-label="Manage tasks"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <ListTodo className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); printDocument(p, roster, taskMap[p.id]?.tasks || []); }} title="Download proposal / SOW as PDF" aria-label="Download document"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name); }} disabled={deleting === p.id} title="Delete project" aria-label="Delete project"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50">
                            {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.clientName || "Unknown client"}</p>
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Retainer</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{p.monthlyFee ? `₹${Number(p.monthlyFee).toLocaleString()}/mo` : "—"}</p>
                          {Number(p.adSpendBudget) > 0 && <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">+${Number(p.adSpendBudget).toLocaleString()} spend</p>}
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Manager</p>
                          {lead ? (
                            <div className="flex items-center gap-1.5 mt-1"><Avatar name={lead.name} size="xs" /><span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{lead.name.split(" ")[0]}</span></div>
                          ) : <p className="text-xs text-slate-400 mt-0.5 italic">Unassigned</p>}
                        </div>
                      </div>
                      {(d.objective || d.primaryKpi || d.adAccountId) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                          {d.objective && <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 px-2 py-0.5 rounded-full"><Target className="h-2.5 w-2.5" />{d.objective}</span>}
                          {d.primaryKpi && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-full"><BarChart3 className="h-2.5 w-2.5" />{d.primaryKpi}{d.targetKpiValue ? ` ${d.targetKpiValue}` : ""}</span>}
                          {d.adAccountId && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full"><ShieldAlert className="h-2.5 w-2.5" />{d.adAccountId}</span>}
                        </div>
                      )}
                      <div className="mt-4">
                        <Progress value={pct} size="sm" barClassName="bg-indigo-500" />
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">{tp ? `${tp.done} of ${tp.total} done` : (p.startDate || "No start date")}</span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Web Dev section */}
          {showWeb && webList.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
                  <Code2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Web Development</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-500/20">{webList.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {webList.map(p => {
                  const d = parseDetails(p.serviceDetails);
                  const tp = getTaskProgress(p.id);
                  const pct = tp ? tp.pct : progressFromStatus(p.projectType, p.status);
                  const lead = roster.find((u: any) => u.id === p.leadId);
                  return (
                    <div key={p.id} onClick={() => router.push(`/admin/projects/${p.id}`)} className="rounded-2xl border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={getProjectStatusVariant(p.status)} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">{getProjectStatusLabel(p.status)}</Badge>
                          {p.priority === "high" && <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide", getPriorityClass("high"))}>High</span>}
                          {tp && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">{tp.done}/{tp.total} tasks</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); openEdit(p); }} title="Edit project" aria-label="Edit project"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setTaskModalProject(p); setNewTaskTitle(""); }} title="Manage tasks" aria-label="Manage tasks"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <ListTodo className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); printDocument(p, roster, taskMap[p.id]?.tasks || []); }} title="Download proposal / SOW as PDF" aria-label="Download document"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 flex items-center justify-center cursor-pointer transition-all">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name); }} disabled={deleting === p.id} title="Delete project" aria-label="Delete project"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50">
                            {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.clientName || "Unknown client"}</p>
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{Number(p.budget) > 0 ? `₹${Number(p.budget).toLocaleString()}` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead Dev</p>
                          {lead ? (
                            <div className="flex items-center gap-1.5 mt-1"><Avatar name={lead.name} size="xs" /><span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{lead.name.split(" ")[0]}</span></div>
                          ) : <p className="text-xs text-slate-400 mt-0.5 italic">Unassigned</p>}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                        {d.platform && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-full"><Cpu className="h-2.5 w-2.5" />{d.platform}</span>}
                        {d.hostingProvider && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full"><Globe className="h-2.5 w-2.5" />{d.hostingProvider}</span>}
                        {d.numPages && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full"><Layers className="h-2.5 w-2.5" />{d.numPages}p</span>}
                        {d.repoLink && <a href={d.repoLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/20 transition-all"><ExternalLink className="h-2.5 w-2.5" />Repo</a>}
                        {d.oldWebsiteUrl && <a href={d.oldWebsiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><Globe2 className="h-2.5 w-2.5" />Old Site</a>}
                        {d.cmsNeeded && <span className="text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full">CMS</span>}
                        {d.adminPanelNeeded && <span className="text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full">Admin</span>}
                        {d.dbNeeded && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full"><Database className="h-2.5 w-2.5" />DB</span>}
                      </div>
                      <div className="mt-4">
                        <Progress value={pct} size="sm" barClassName="bg-emerald-500" />
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">{tp ? `${tp.done} of ${tp.total} done` : (d.launchDate || p.deadline || "No deadline")}</span>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TASK MANAGEMENT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {taskModalProject && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setTaskModalProject(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <ListTodo className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Tasks</span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{taskModalProject.name}</h2>
                </div>
                <button onClick={() => setTaskModalProject(null)} className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {taskModalTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No tasks yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add a task below to track project progress.</p>
                  </div>
                ) : (
                  taskModalTasks.map((task: any) => (
                    <div key={task.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                      task.done === 1 ? "border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    )}>
                      <button
                        onClick={() => handleTaskToggle(task.id, task.done === 1)}
                        disabled={togglingTask === task.id}
                        className="shrink-0 cursor-pointer transition-all hover:scale-110"
                        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                      >
                        {togglingTask === task.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          : task.done === 1
                            ? <CheckSquare className="h-4 w-4 text-emerald-500" />
                            : <Square className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        }
                      </button>
                      <span className={cn("flex-1 text-xs font-medium truncate", task.done === 1 ? "line-through text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300")}>{task.title}</span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                        task.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                        : task.priority === "low" ? "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                        : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                      )}>{task.priority}</span>
                      <button
                        onClick={() => handleTaskDelete(task.id)}
                        disabled={deletingTask === task.id}
                        className="shrink-0 h-6 w-6 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center cursor-pointer transition-all"
                        aria-label="Delete task"
                      >
                        {deletingTask === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Progress strip */}
              {taskModalTasks.length > 0 && (
                <div className="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {taskModalTasks.filter((t: any) => t.done === 1).length}/{taskModalTasks.length} done
                    </span>
                  </div>
                  <Progress
                    value={taskModalTasks.length > 0 ? Math.round((taskModalTasks.filter((t: any) => t.done === 1).length / taskModalTasks.length) * 100) : 0}
                    size="sm"
                  />
                </div>
              )}

              {/* Add task footer */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New task title…"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddTask()}
                    className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                  <div className="flex gap-1.5">
                    {["low", "medium", "high"].map(pr => (
                      <button key={pr} type="button" onClick={() => setNewTaskPriority(pr)}
                        className={cn("h-9 px-2.5 rounded-xl border text-[10px] font-bold capitalize transition-all cursor-pointer",
                          newTaskPriority === pr ? "bg-slate-900 dark:bg-white border-transparent text-white dark:text-slate-900" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                        )}>{pr}</button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()} size="sm" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold justify-center">
                  {addingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Task</>}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EDIT PROJECT DRAWER
      ═══════════════════════════════════════════════════════════════════════ */}
      {editOpen && editProject && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">
            {/* Header */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border",
                    editProject.projectType === "meta_ads" ? TYPES.meta_ads.badgeBg : TYPES.web_dev.badgeBg
                  )}>
                    {editProject.projectType === "meta_ads" ? <Megaphone className="h-2.5 w-2.5" /> : <Code2 className="h-2.5 w-2.5" />}
                    {editProject.projectType === "meta_ads" ? "Meta Ads" : "Web Development"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">Edit Project</h2>
              </div>
              <button onClick={() => setEditOpen(false)} aria-label="Close"
                className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdate} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                <SectionHeader icon={Sparkles} label="General" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Project Name *</label>
                    <input required value={editForm.name} onChange={e => ef({ name: e.target.value })} className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Client</label>
                      <select
                        value={editForm.clientId || "__new__"}
                        onChange={e => {
                          const sel = clients.find((c: any) => String(c.id) === e.target.value);
                          if (sel) {
                            let contactName = "";
                            let contactPhone = "";
                            try {
                              const det = JSON.parse(sel.details || "{}");
                              contactName = det.contactName || "";
                              contactPhone = det.contactPhone || "";
                            } catch (err) {}
                            ef({ 
                              clientId: String(sel.id), 
                              clientName: sel.name,
                              clientContactName: contactName,
                              clientContactPhone: contactPhone
                            });
                          } else {
                            ef({ clientId: "", clientName: editForm.clientName || "", clientContactName: "", clientContactPhone: "" });
                          }
                        }}
                        className={SELECT}>
                        <option value="__new__">— New / type name —</option>
                        {clients.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                      {!editForm.clientId && (
                        <input value={editForm.clientName} onChange={e => ef({ clientName: e.target.value })}
                          placeholder="Client name" className={cn(INPUT, "mt-2")} />
                      )}
                    </div>
                    <div>
                      <label className={LABEL}>Status</label>
                      <select value={editForm.status} onChange={e => ef({ status: e.target.value })} className={SELECT}>
                        {(editProject.projectType === "meta_ads" ? META_STATUSES : WEBDEV_STATUSES).map(s => (
                          <option key={s} value={s}>{getProjectStatusLabel(s)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Assigned To</label>
                      <select value={editForm.leadId} onChange={e => ef({ leadId: e.target.value })} className={SELECT}>
                        <option value="">Unassigned</option>
                        {roster.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Priority</label>
                      <div className="flex gap-1.5">
                        {["low", "medium", "high"].map(pr => (
                          <button key={pr} type="button" onClick={() => ef({ priority: pr })}
                            className={cn("flex-1 h-11 border text-[10px] font-bold rounded-xl capitalize transition-all cursor-pointer",
                              editForm.priority === pr ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                            )}>{pr}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <SectionHeader icon={CalendarDays} label="Timeline" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Start Date</label>
                    <input type="date" value={editForm.startDate} onChange={e => ef({ startDate: e.target.value })} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Deadline</label>
                    <input type="date" value={editForm.endDate} onChange={e => ef({ endDate: e.target.value })} className={INPUT} />
                  </div>
                </div>

                <SectionHeader icon={DollarSign} label="Financials" />
                {editProject.projectType === "meta_ads" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Monthly Fee</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="number" min="0" value={editForm.monthlyFee} onChange={e => ef({ monthlyFee: e.target.value })} placeholder="3000" className={cn(INPUT, "pl-9")} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Ad Spend Budget</label>
                      <div className="relative">
                        <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="number" min="0" value={editForm.adSpendBudget} onChange={e => ef({ adSpendBudget: e.target.value })} placeholder="12000" className={cn(INPUT, "pl-9")} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={LABEL}>Project Budget</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input type="number" min="0" value={editForm.totalBudget} onChange={e => ef({ totalBudget: e.target.value })} placeholder="8500" className={cn(INPUT, "pl-9")} />
                    </div>
                  </div>
                )}

                <SectionHeader icon={Users2} label="Client Contact" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Contact Name</label>
                    <input value={editForm.clientContactName} onChange={e => ef({ clientContactName: e.target.value })} placeholder="Rohan Mehta" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>WhatsApp / Phone</label>
                    <input value={editForm.clientContactPhone} onChange={e => ef({ clientContactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                  </div>
                </div>

                <SectionHeader icon={CalendarDays} label="Contract" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Billing Cycle Start</label>
                      <input type="date" value={editForm.billingCycleStart} onChange={e => ef({ billingCycleStart: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Duration (months)</label>
                      <input type="number" min="0" value={editForm.contractDuration} onChange={e => ef({ contractDuration: e.target.value })} placeholder="6" className={INPUT} />
                    </div>
                  </div>
                  <ToggleRow label="Access granted — agency has platform access" value={editForm.accessGranted} onChange={() => ef({ accessGranted: !editForm.accessGranted })} />
                  {editProject.projectType === "meta_ads" && (
                    <div>
                      <label className={LABEL}>Contract / SOW Link</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="url" value={editForm.contractLink} onChange={e => ef({ contractLink: e.target.value })} placeholder="https://drive.google.com/…" className={cn(INPUT, "pl-10")} />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editSubmitting || !editForm.name} className="bg-brand-600 hover:bg-brand-700 text-white font-bold min-w-[120px] justify-center">
                  {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Changes</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DRAWER — New Project
      ═══════════════════════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={closeDrawer} />

          <div className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">

            {/* Panel header */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {drawerStep === 1 && (
                    <button type="button" onClick={() => { setDrawerStep(0); setFormTab(0); }}
                      className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer" aria-label="Back">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {drawerStep === 1 ? (
                        <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border", typeCfg.badgeBg)}>
                          <typeCfg.Icon className="h-2.5 w-2.5" />
                          {typeCfg.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Project</span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {drawerStep === 0 ? "Choose a service type" : "Project details"}
                    </h2>
                  </div>
                </div>
                <button onClick={closeDrawer} aria-label="Close"
                  className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Step 0 — service type selection */}
            {drawerStep === 0 && (
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Each service type has a tailored form — only the fields that matter for how you run that engagement.
                </p>
                {(["meta_ads", "web_dev"] as const).map(t => {
                  const cfg = TYPES[t];
                  const TIcon = cfg.Icon;
                  return (
                    <button key={t} type="button"
                      onClick={() => { setProjectType(t); setForm(p => ({ ...p, status: cfg.statuses[0] })); setDrawerStep(1); setFormTab(0); }}
                      className="w-full flex items-start gap-4 p-5 border-2 border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl cursor-pointer text-left transition-all group bg-white dark:bg-slate-900/50 hover:bg-brand-500/[0.02]"
                    >
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-sm shrink-0 mt-0.5", cfg.accent)}>
                        <TIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cfg.label}</h3>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors shrink-0 ml-2" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{cfg.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cfg.features.map(feat => (
                            <span key={feat} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{feat}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 1 — form wizard */}
            {drawerStep === 1 && (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">

                {/* Step indicator */}
                <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
                  <div className="flex items-center">
                    {typeCfg.steps.map((label, i) => (
                      <Fragment key={i}>
                        <button type="button" onClick={() => setFormTab(i)}
                          className={cn("flex items-center gap-1.5 text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap",
                            formTab === i ? "text-brand-600 dark:text-brand-400" : formTab > i ? "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" : "text-slate-400"
                          )}>
                          <span className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 transition-all",
                            formTab === i ? "bg-brand-600 text-white shadow-sm" : formTab > i ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                          )}>
                            {formTab > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                          </span>
                          {label}
                        </button>
                        {i < typeCfg.steps.length - 1 && (
                          <div className={cn("flex-1 h-px mx-2.5 transition-all", formTab > i ? "bg-brand-300 dark:bg-brand-700" : "bg-slate-200 dark:bg-slate-800")} />
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* Form fields */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* ── META ADS ─────────────────────────────────────────── */}
                  {projectType === "meta_ads" && (
                    <>
                      {formTab === 0 && (
                        <>
                          <SectionHeader icon={Sparkles} label="General" />
                          <div className="space-y-4">
                            <div>
                              <label className={LABEL}>Project / Campaign Name *</label>
                              <input required value={form.name} onChange={e => f({ name: e.target.value })} placeholder="e.g. Meta Q3 Lead Gen Campaign" className={INPUT} />
                            </div>
                            <div>
                              <label className={LABEL}>Client *</label>
                              <select
                                value={form.clientId || "__new__"}
                                onChange={e => {
                                  const sel = clients.find((c: any) => String(c.id) === e.target.value);
                                  if (sel) {
                                    let contactName = "";
                                    let contactPhone = "";
                                    try {
                                      const det = JSON.parse(sel.details || "{}");
                                      contactName = det.contactName || "";
                                      contactPhone = det.contactPhone || "";
                                    } catch (err) {}
                                    f({ 
                                      clientId: String(sel.id), 
                                      clientName: sel.name,
                                      clientContactName: contactName,
                                      clientContactPhone: contactPhone
                                    });
                                  } else {
                                    f({ clientId: "", clientName: "", clientContactName: "", clientContactPhone: "" });
                                  }
                                }}
                                className={SELECT}>
                                <option value="__new__">— New client (type name) —</option>
                                {clients.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                              </select>
                              {!form.clientId && (
                                <input required value={form.clientName} onChange={e => f({ clientName: e.target.value })}
                                  placeholder="New client name" className={cn(INPUT, "mt-2")} />
                              )}
                            </div>
                          </div>

                          <SectionHeader icon={Users2} label="Client Contact" />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={LABEL}>Contact Name</label>
                              <input value={form.clientContactName} onChange={e => f({ clientContactName: e.target.value })} placeholder="e.g. Rohan Mehta" className={INPUT} />
                            </div>
                            <div>
                              <label className={LABEL}>WhatsApp / Phone</label>
                              <input value={form.clientContactPhone} onChange={e => f({ clientContactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                            </div>
                          </div>

                          <SectionHeader icon={CalendarDays} label="Timeline & Team" />
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Start Date</label>
                                <input type="date" value={form.startDate} onChange={e => f({ startDate: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>End Date</label>
                                <input type="date" value={form.endDate} onChange={e => f({ endDate: e.target.value })} className={INPUT} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Account Manager</label>
                                <select value={form.leadId} onChange={e => f({ leadId: e.target.value })} className={SELECT}>
                                  <option value="">Select…</option>
                                  {roster.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className={LABEL}>Priority</label>
                                <div className="flex gap-1.5">
                                  {["low", "medium", "high"].map(pr => (
                                    <button key={pr} type="button" onClick={() => f({ priority: pr })}
                                      className={cn("flex-1 h-11 border text-[10px] font-bold rounded-xl capitalize transition-all cursor-pointer",
                                        form.priority === pr ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                                      )}>{pr}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {formTab === 1 && (
                        <>
                          <SectionHeader icon={ShieldAlert} label="Ad Account Access" />
                          <div className="space-y-4">
                            <ToggleRow label="Access granted — agency has platform access" value={form.accessGranted} onChange={() => f({ accessGranted: !form.accessGranted })} />
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className={LABEL}>Ad Account ID</label>
                                <input value={form.adAccountId} onChange={e => f({ adAccountId: e.target.value })} placeholder="act_xxxxxxx" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Business Manager</label>
                                <input value={form.businessManagerId} onChange={e => f({ businessManagerId: e.target.value })} placeholder="123456789" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Pixel ID</label>
                                <input value={form.pixelId} onChange={e => f({ pixelId: e.target.value })} placeholder="123456789" className={INPUT} />
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>Landing Page URL</label>
                              <div className="relative">
                                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input type="url" value={form.landingPage} onChange={e => f({ landingPage: e.target.value })} placeholder="https://example.com/page" className={cn(INPUT, "pl-10")} />
                              </div>
                            </div>
                          </div>

                          <SectionHeader icon={Target} label="Campaign Strategy" />
                          <div className="space-y-4">
                            <div>
                              <label className={LABEL}>Conversion Location</label>
                              <div className="grid grid-cols-3 gap-2">
                                {[{ val: "website", label: "Website" }, { val: "whatsapp", label: "WhatsApp" }, { val: "instant_form", label: "Lead Form" }].map(({ val, label }) => (
                                  <button key={val} type="button" onClick={() => f({ conversionLocation: val })}
                                    className={cn("h-10 border text-xs font-bold rounded-xl transition-all cursor-pointer",
                                      form.conversionLocation === val ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                                    )}>{label}</button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Campaign Objective</label>
                                <select value={form.objective} onChange={e => f({ objective: e.target.value })} className={SELECT}>
                                  <option value="leads">Leads</option>
                                  <option value="sales">Sales</option>
                                  <option value="traffic">Traffic</option>
                                  <option value="awareness">Awareness</option>
                                </select>
                              </div>
                              <div>
                                <label className={LABEL}>Primary KPI</label>
                                <select value={form.primaryKpi} onChange={e => f({ primaryKpi: e.target.value })} className={SELECT}>
                                  <option value="CPL">CPL (Cost / Lead)</option>
                                  <option value="ROAS">ROAS</option>
                                  <option value="CPA">CPA (Cost / Acq)</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>KPI Target</label>
                              <input value={form.targetKpiValue} onChange={e => f({ targetKpiValue: e.target.value })} placeholder="e.g.  < ₹380 CPL  or  > 3.2× ROAS" className={INPUT} />
                            </div>
                          </div>
                        </>
                      )}

                      {formTab === 2 && (
                        <>
                          <SectionHeader icon={DollarSign} label="Billing" />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={LABEL}>Management Fee / mo</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input type="number" min="0" value={form.monthlyFee} onChange={e => f({ monthlyFee: e.target.value })} placeholder="3000" className={cn(INPUT, "pl-9")} />
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>Ad Spend Budget / mo</label>
                              <div className="relative">
                                <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input type="number" min="0" value={form.adSpendBudget} onChange={e => f({ adSpendBudget: e.target.value })} placeholder="12000" className={cn(INPUT, "pl-9")} />
                              </div>
                            </div>
                          </div>

                          <SectionHeader icon={CalendarDays} label="Contract" />
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Billing Cycle Start</label>
                                <input type="date" value={form.billingCycleStart} onChange={e => f({ billingCycleStart: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Contract Duration (months)</label>
                                <input type="number" min="0" value={form.contractDuration} onChange={e => f({ contractDuration: e.target.value })} placeholder="6" className={INPUT} />
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>Contract / SOW Link</label>
                              <div className="relative">
                                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input type="url" value={form.contractLink} onChange={e => f({ contractLink: e.target.value })} placeholder="https://drive.google.com/…" className={cn(INPUT, "pl-10")} />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className={LABEL}>Notes / Strategy Brief</label>
                            <textarea rows={4} value={form.notes} onChange={e => f({ notes: e.target.value })} placeholder="Target audiences, creative hooks, SOW terms, approval contacts…" className={cn(INPUT, "h-auto py-3 resize-none leading-relaxed")} />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* ── WEB DEV ──────────────────────────────────────────── */}
                  {projectType === "web_dev" && (
                    <>
                      {formTab === 0 && (
                        <>
                          <SectionHeader icon={Sparkles} label="Project Core" />
                          <div className="space-y-4">
                            <div>
                              <label className={LABEL}>Project Name *</label>
                              <input required value={form.name} onChange={e => f({ name: e.target.value })} placeholder="e.g. Brand Website Redesign" className={INPUT} />
                            </div>
                            <div>
                              <label className={LABEL}>Client *</label>
                              <select
                                value={form.clientId || "__new__"}
                                onChange={e => {
                                  const sel = clients.find((c: any) => String(c.id) === e.target.value);
                                  if (sel) {
                                    let contactName = "";
                                    let contactPhone = "";
                                    try {
                                      const det = JSON.parse(sel.details || "{}");
                                      contactName = det.contactName || "";
                                      contactPhone = det.contactPhone || "";
                                    } catch (err) {}
                                    f({ 
                                      clientId: String(sel.id), 
                                      clientName: sel.name,
                                      clientContactName: contactName,
                                      clientContactPhone: contactPhone
                                    });
                                  } else {
                                    f({ clientId: "", clientName: "", clientContactName: "", clientContactPhone: "" });
                                  }
                                }}
                                className={SELECT}>
                                <option value="__new__">— New client (type name) —</option>
                                {clients.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                              </select>
                              {!form.clientId && (
                                <input required value={form.clientName} onChange={e => f({ clientName: e.target.value })}
                                  placeholder="New client name" className={cn(INPUT, "mt-2")} />
                              )}
                            </div>
                          </div>

                          <SectionHeader icon={Users2} label="Client Contact" />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={LABEL}>Contact Name</label>
                              <input value={form.clientContactName} onChange={e => f({ clientContactName: e.target.value })} placeholder="e.g. Rohan Mehta" className={INPUT} />
                            </div>
                            <div>
                              <label className={LABEL}>WhatsApp / Phone</label>
                              <input value={form.clientContactPhone} onChange={e => f({ clientContactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                            </div>
                          </div>

                          <SectionHeader icon={Globe2} label="Current Website" />
                          <div>
                            <label className={LABEL}>Old / Current Website URL</label>
                            <div className="relative">
                              <Globe2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input type="url" value={form.oldWebsiteUrl} onChange={e => f({ oldWebsiteUrl: e.target.value })} placeholder="https://currentsite.com" className={cn(INPUT, "pl-10")} />
                            </div>
                          </div>

                          <SectionHeader icon={SlidersHorizontal} label="Scope & Type" />
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Website Type</label>
                                <select value={form.websiteType} onChange={e => f({ websiteType: e.target.value })} className={SELECT}>
                                  <option value="landing_page">Landing Page</option>
                                  <option value="business_site">Business Site</option>
                                  <option value="ecommerce">E-Commerce</option>
                                  <option value="dashboard">Dashboard / App</option>
                                  <option value="crm_module">CRM Module</option>
                                  <option value="maintenance">Maintenance</option>
                                </select>
                              </div>
                              <div>
                                <label className={LABEL}>Priority</label>
                                <div className="flex gap-1.5">
                                  {["low", "medium", "high"].map(pr => (
                                    <button key={pr} type="button" onClick={() => f({ priority: pr })}
                                      className={cn("flex-1 h-11 border text-[10px] font-bold rounded-xl capitalize transition-all cursor-pointer",
                                        form.priority === pr ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900" : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                                      )}>{pr}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className={LABEL}>Start Date</label>
                                <input type="date" value={form.startDate} onChange={e => f({ startDate: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Deadline</label>
                                <input type="date" value={form.endDate} onChange={e => f({ endDate: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Launch Date</label>
                                <input type="date" value={form.launchDate} onChange={e => f({ launchDate: e.target.value })} className={INPUT} />
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>Assign to</label>
                              <select value={form.leadId} onChange={e => f({ leadId: e.target.value })} className={SELECT}>
                                <option value="">Select developer…</option>
                                {roster.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {formTab === 1 && (
                        <>
                          <SectionHeader icon={FileCode2} label="Technical Setup" />
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Platform / Stack</label>
                                <select value={form.platform} onChange={e => f({ platform: e.target.value })} className={SELECT}>
                                  <option value="Next.js">Next.js</option>
                                  <option value="WordPress">WordPress</option>
                                  <option value="Shopify">Shopify</option>
                                  <option value="React">React</option>
                                  <option value="Custom">Custom</option>
                                </select>
                              </div>
                              <div>
                                <label className={LABEL}>Domain</label>
                                <input value={form.domain} onChange={e => f({ domain: e.target.value })} placeholder="example.com" className={INPUT} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Hosting Provider</label>
                                <input value={form.hostingProvider} onChange={e => f({ hostingProvider: e.target.value })} placeholder="Vercel, AWS, Hostinger…" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Repository Link</label>
                                <input type="url" value={form.repoLink} onChange={e => f({ repoLink: e.target.value })} placeholder="https://github.com/…" className={INPUT} />
                              </div>
                            </div>
                          </div>

                          <SectionHeader icon={Boxes} label="Requirements" />
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              {[{ key: "cmsNeeded", label: "CMS" }, { key: "adminPanelNeeded", label: "Admin Panel" }, { key: "dbNeeded", label: "Database" }].map(({ key, label }) => (
                                <ToggleRow key={key} label={label} value={(form as any)[key]} onChange={() => f({ [key]: !(form as any)[key] })} />
                              ))}
                            </div>
                            <div>
                              <label className={LABEL}>Number of Pages</label>
                              <input type="number" min="1" value={form.numPages} onChange={e => f({ numPages: e.target.value })} placeholder="5" className={INPUT} />
                            </div>
                          </div>
                        </>
                      )}

                      {formTab === 2 && (
                        <>
                          <SectionHeader icon={DollarSign} label="Budget" />
                          <div>
                            <label className={LABEL}>Project Budget (USD)</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input type="number" min="0" value={form.totalBudget} onChange={e => f({ totalBudget: e.target.value })} placeholder="8500" className={cn(INPUT, "pl-9")} />
                            </div>
                          </div>

                          <SectionHeader icon={CalendarDays} label="Contract" />
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Billing Cycle Start</label>
                                <input type="date" value={form.billingCycleStart} onChange={e => f({ billingCycleStart: e.target.value })} className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Contract Duration (months)</label>
                                <input type="number" min="0" value={form.contractDuration} onChange={e => f({ contractDuration: e.target.value })} placeholder="3" className={INPUT} />
                              </div>
                            </div>
                          </div>

                          <SectionHeader icon={Boxes} label="Integrations & Assets" />
                          <div className="space-y-4">
                            <div>
                              <label className={LABEL}>Third-party Integrations</label>
                              <input value={form.integrations} onChange={e => f({ integrations: e.target.value })} placeholder="payments, CRM, analytics, email, chat…" className={INPUT} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={LABEL}>Brand Assets URL</label>
                                <input value={form.brandAssets} onChange={e => f({ brandAssets: e.target.value })} placeholder="Google Drive, Figma…" className={INPUT} />
                              </div>
                              <div>
                                <label className={LABEL}>Content URL</label>
                                <input value={form.contentAssets} onChange={e => f({ contentAssets: e.target.value })} placeholder="Docs, Notion, Drive…" className={INPUT} />
                              </div>
                            </div>
                            <div>
                              <label className={LABEL}>Reference / Inspiration Sites</label>
                              <textarea rows={2} value={form.referenceLinks} onChange={e => f({ referenceLinks: e.target.value })} placeholder="stripe.com, linear.app, vercel.com…" className={cn(INPUT, "h-auto py-2.5 resize-none")} />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                </div>

                {/* Form footer */}
                <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold text-slate-400">Step {formTab + 1} of {typeCfg.steps.length}</p>
                  <div className="flex gap-2">
                    {formTab > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setFormTab(t => t - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Back
                      </Button>
                    )}
                    {formTab < typeCfg.steps.length - 1 ? (
                      <Button type="button" size="sm" onClick={() => setFormTab(t => t + 1)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-95">
                        Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    ) : (
                      <Button type="submit" size="sm" disabled={submitting || !form.name || !form.clientName} className="bg-brand-600 hover:bg-brand-700 text-white font-bold active:scale-95 shadow-glow min-w-[130px] justify-center">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Create Project</>}
                      </Button>
                    )}
                  </div>
                </div>

              </form>
            )}

          </div>
        </>
      )}
    </div>
  );
}
