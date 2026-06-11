"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import {
  getClientById, updateClient, updateClientChecklist,
  deleteClient, updateInvoiceStatus, createInvoice, getTeamUsers,
  addProjectTask, toggleTaskDone, deleteTask,
} from "@/app/actions/crm";
import {
  ArrowLeft, Building2, CheckCircle2, Code2, DollarSign, Edit2,
  ExternalLink, Globe, Globe2, Layers, Mail, MapPin, Megaphone,
  MoreHorizontal, Phone, Plus, Receipt, RefreshCw, Tag, Trash2,
  TrendingUp, Users, X, Zap, AlertCircle, CalendarDays, Clock,
  BadgeCheck, FileText, Link as LinkIcon, ChevronRight, Square,
  ListTodo, Loader2, Send, BadgeDollarSign,
} from "lucide-react";
import { ClientDetailSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";

// ── helpers ──────────────────────────────────────────────────────────────────
function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

const STAGE_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  contract_signed: { label: "Contract Signed", dot: "bg-indigo-500", pill: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  discovery:       { label: "Discovery",        dot: "bg-amber-500",  pill: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  integrations:    { label: "Integrations",     dot: "bg-sky-500",    pill: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  live:            { label: "Campaign Live",    dot: "bg-emerald-500",pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const INV_STATUS: Record<string, { label: string; pill: string }> = {
  draft:   { label: "Draft",   pill: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700" },
  sent:    { label: "Sent",    pill: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  paid:    { label: "Paid",    pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  overdue: { label: "Overdue", pill: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const PROJ_TYPE_ICON: Record<string, React.ElementType> = { meta_ads: Megaphone, web_dev: Code2, other: Zap };
const PROJ_STATUS_COLOR: Record<string, string> = {
  active:    "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
  paused:    "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  completed: "bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400",
  planning:  "bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400",
  cancelled: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400",
};

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
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast, confirmDialog } = useToast();

  const [client, setClient]   = useState<any>(null);
  const [roster, setRoster]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // edit drawer
  const [editOpen, setEditOpen]           = useState(false);
  const [editForm, setEditForm]           = useState<any>({});
  const [editSaving, setEditSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, tr] = await Promise.all([getClientById(Number(id)), getTeamUsers()]);
      if (cr.success && cr.data) setClient(cr.data);
      if (tr.success && tr.data) setRoster((tr.data as any[]).filter(u => u.role !== "client"));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── derived ──────────────────────────────────────────────────────────────
  const d              = parseDetails(client?.details);
  const stage          = STAGE_CONFIG[client?.stage] || STAGE_CONFIG.contract_signed;
  const initials       = (client?.name || "?").split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
  const invs: any[]    = client?.linkedInvoices || [];
  const projs: any[]   = client?.linkedProjects || [];
  const totalInvoiced  = invs.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const totalPaid      = invs.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const outstanding    = invs.filter((i: any) => i.status === "sent" || i.status === "overdue").reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const overdueInvs    = invs.filter((i: any) => i.status === "overdue");
  const totalRevenue   = totalPaid;

  let checklist: any[] = [];
  try { checklist = JSON.parse(client?.checklist || "[]"); } catch { checklist = []; }

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleMarkPaid = async (invId: number) => {
    const paidDate = new Date().toISOString().split("T")[0];
    const r = await updateInvoiceStatus(invId, "paid", paidDate);
    if (r.success) {
      setClient((prev: any) => prev ? {
        ...prev,
        linkedInvoices: prev.linkedInvoices.map((i: any) =>
          i.id === invId ? { ...i, status: "paid", paidDate } : i),
      } : prev);
      toast("Invoice marked as paid.", "success");
    } else toast(r.error || "Failed.", "error");
  };

  const handleToggleCheck = async (idx: number) => {
    if (!client) return;
    let cl: any[] = [];
    try { cl = JSON.parse(client.checklist); } catch { cl = []; }
    if (cl[idx]) cl[idx].checked = !cl[idx].checked;
    const pct = cl.length ? Math.round(cl.filter((i: any) => i.checked).length / cl.length * 100) : 0;
    const r = await updateClientChecklist(client.id, JSON.stringify(cl), pct);
    if (r.success) setClient((prev: any) => prev ? { ...prev, checklist: JSON.stringify(cl), progress: pct } : prev);
  };

  const handleDelete = async () => {
    if (!client) return;
    if (!await confirmDialog(`Delete "${client.name}"? This will remove all linked data.`)) return;
    const r = await deleteClient(client.id);
    if (r.success) { toast(`${client.name} removed.`, "info"); router.push("/admin/clients"); }
    else toast(r.error || "Failed.", "error");
  };

  const openEdit = () => {
    setEditForm({
      name: client.name, ownerId: client.ownerId ? String(client.ownerId) : "",
      stage: client.stage,
      contactName: d.contactName || "", contactEmail: d.contactEmail || "",
      contactPhone: d.contactPhone || "", websiteUrl: d.websiteUrl || "",
      industry: d.industry || "", country: d.country || "", services: d.services || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setEditSaving(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      const r = await updateClient(client.id, fd);
      if (r.success) { setEditOpen(false); await load(); toast("Client updated.", "success"); }
      else toast(r.error || "Failed.", "error");
    } finally { setEditSaving(false); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) return <ClientDetailSkeleton />;

  if (!client) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-slate-500 font-semibold">Client not found.</p>
      <Button variant="outline" onClick={() => router.push("/admin/clients")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Clients
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pb-12">

      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/clients")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> All Clients
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{client.name}</span>
      </div>

      {/* ── BENTO GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Header card (full width) ────────────────────────────────────── */}
        <BentoCard className="lg:col-span-12 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-transparent">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-extrabold text-white flex items-center justify-center shrink-0 shadow-lg">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{client.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={cn("inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border", stage.pill)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full mr-1", stage.dot)} />{stage.label}
                  </span>
                  {d.industry && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <Tag className="h-2.5 w-2.5" />{d.industry}
                    </span>
                  )}
                  {d.country && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <MapPin className="h-2.5 w-2.5" />{d.country}
                    </span>
                  )}
                  {d.services && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      {d.services}
                    </span>
                  )}
                  {d.websiteUrl && (
                    <a href={d.websiteUrl.startsWith("http") ? d.websiteUrl : `https://${d.websiteUrl}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 border border-brand-500/20 px-2 py-0.5 rounded-full hover:bg-brand-500/10 transition-all">
                      <Globe className="h-2.5 w-2.5" />Website <ExternalLink className="h-2 w-2" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit Client
              </Button>
              <button onClick={handleDelete}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer border border-slate-200 dark:border-slate-800">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Account Lead & Date strip */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Avatar name={client.owner?.name || "Unassigned"} size="xs" />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Lead</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{client.owner?.name || "Unassigned"}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Client Since</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
            {d.contactPhone && (
              <a href={`https://wa.me/${d.contactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full transition-all">
                <Phone className="h-3 w-3" />WhatsApp
              </a>
            )}
          </div>
        </BentoCard>

        {/* ── Financial KPIs ──────────────────────────────────────────────── */}
        {[
          { label: "Total Invoiced", value: `₹${totalInvoiced.toLocaleString()}`, sub: `${invs.length} invoice${invs.length !== 1 ? "s" : ""}`, icon: Receipt, color: "text-slate-800 dark:text-white", bg: "bg-white dark:bg-slate-950", accent: "bg-slate-100 dark:bg-slate-800" },
          { label: "Total Paid",     value: `₹${totalPaid.toLocaleString()}`,     sub: `${invs.filter((i: any) => i.status === "paid").length} paid`, icon: BadgeCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/40 dark:bg-emerald-950/10", accent: "bg-emerald-100 dark:bg-emerald-900/20" },
          { label: "Outstanding",    value: `₹${outstanding.toLocaleString()}`,   sub: overdueInvs.length > 0 ? `${overdueInvs.length} overdue` : "All clear", icon: AlertCircle, color: outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400", bg: "bg-amber-50/40 dark:bg-amber-950/10", accent: "bg-amber-100 dark:bg-amber-900/20" },
          { label: "Monthly MRR",    value: `₹${(client.totalMRR || 0).toLocaleString()}`, sub: "per month", icon: TrendingUp, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-50/40 dark:bg-brand-950/10", accent: "bg-brand-100 dark:bg-brand-900/20" },
        ].map(kpi => (
          <BentoCard key={kpi.label} className={cn("lg:col-span-3", kpi.bg)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className={cn("text-2xl font-extrabold mt-1 leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.accent)}>
                <kpi.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </BentoCard>
        ))}

        {/* ── Projects ────────────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-8">
          <SectionTitle icon={Layers} label={`Projects (${projs.length})`}
            action={
              <Button size="sm" variant="outline" onClick={() => router.push(`/admin/projects?client=${client.id}`)}>
                <Plus className="h-3.5 w-3.5 mr-1" />New Project
              </Button>
            }
          />
          {!projs.length ? (
            <EmptyState icon={<Layers className="h-4 w-4" />} title="No projects yet" description="Create a project and link it to this client." />
          ) : (
            <div className="space-y-3">
              {projs.map((p: any) => {
                const PIcon = PROJ_TYPE_ICON[p.projectType] || Zap;
                const pill  = PROJ_STATUS_COLOR[p.status] || PROJ_STATUS_COLOR.planning;
                const progressPct = p.status === "completed" ? 100 : p.status === "active" ? 65 : p.status === "paused" ? 35 : 15;
                const fee = p.monthlyFee ? `₹${p.monthlyFee.toLocaleString()}/mo` : p.budget ? `₹${p.budget.toLocaleString()}` : null;
                return (
                  <button key={p.id}
                    onClick={() => router.push(`/admin/projects/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30 hover:bg-brand-50/30 dark:hover:bg-brand-950/10 hover:border-brand-200 dark:hover:border-brand-800/40 transition-all text-left cursor-pointer group">
                    <div className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:border-brand-300 transition-all">
                      <PIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{p.name}</span>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", pill)}>{p.status || "planning"}</span>
                        {p.priority === "high" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-500">High</span>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{progressPct}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {fee && <p className="text-xs font-extrabold text-slate-700 dark:text-white">{fee}</p>}
                      {p.deadline && <p className="text-[10px] text-slate-400">{p.deadline}</p>}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 ml-auto" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </BentoCard>

        {/* ── Onboarding Checklist ─────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-4">
          <SectionTitle icon={CheckCircle2} label="Onboarding" />
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Progress</span>
              <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">{client.progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${client.progress}%` }} />
            </div>
          </div>
          {checklist.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No checklist items.</p>
          ) : (
            <div className="space-y-2">
              {checklist.map((item: any, idx: number) => (
                <button key={item.id || idx} onClick={() => handleToggleCheck(idx)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer text-left">
                  {item.checked
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />}
                  <span className={cn("text-xs font-medium", item.checked ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200")}>{item.text}</span>
                </button>
              ))}
            </div>
          )}
        </BentoCard>

        {/* ── Invoice History ──────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-8">
          <SectionTitle icon={Receipt} label={`Invoices (${invs.length})`}
            action={
              <button onClick={() => router.push("/admin/clients?tab=invoices")}
                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                View all →
              </button>
            }
          />
          {overdueInvs.length > 0 && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {overdueInvs.length} overdue invoice{overdueInvs.length > 1 ? "s" : ""} totalling ₹{overdueInvs.reduce((s: number, i: any) => s + i.amount, 0).toLocaleString()}
              </p>
            </div>
          )}
          {!invs.length ? (
            <EmptyState icon={<Receipt className="h-4 w-4" />} title="No invoices" description="No invoices raised for this client yet." />
          ) : (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice #</th>
                    <th className="text-right px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Project</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Due / Paid</th>
                    <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="w-20 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {invs.map((inv: any) => {
                    const st = INV_STATUS[inv.status] || INV_STATUS.draft;
                    const isOverdue = inv.status !== "paid" && inv.dueDate && new Date(inv.dueDate) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">₹{(inv.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{inv.projectName || <span className="italic text-slate-300 dark:text-slate-600">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {inv.paidDate ? <span className="text-emerald-600 font-semibold">Paid {inv.paidDate}</span>
                            : inv.dueDate ? <span className={cn("font-medium", isOverdue && "text-rose-500 font-bold")}>{inv.dueDate}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border", st.pill)}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(inv.status === "sent" || inv.status === "overdue") && (
                            <button onClick={() => handleMarkPaid(inv.id)}
                              className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer whitespace-nowrap">
                              Mark paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>

        {/* ── Contact Info ────────────────────────────────────────────────── */}
        <BentoCard className="lg:col-span-4 space-y-5">
          <SectionTitle icon={Users} label="Contact & Lead" />
          <div className="space-y-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Primary Contact</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{d.contactName || "—"}</p>
            {d.contactEmail && (
              <a href={`mailto:${d.contactEmail}`} className="flex items-center gap-2 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
                <Mail className="h-3.5 w-3.5 shrink-0" />{d.contactEmail}
              </a>
            )}
            {d.contactPhone && (
              <div className="flex items-center gap-2 flex-wrap">
                <a href={`tel:${d.contactPhone}`} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:underline">
                  <Phone className="h-3.5 w-3.5 shrink-0" />{d.contactPhone}
                </a>
                <a href={`https://wa.me/${d.contactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-0.5 rounded-full transition-all">
                  WhatsApp
                </a>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Account Lead</p>
            <div className="flex items-center gap-3">
              <Avatar name={client.owner?.name || "Unassigned"} size="md" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{client.owner?.name || "Unassigned"}</p>
                <p className="text-[10px] text-slate-400 capitalize">{client.owner?.role || "—"}</p>
              </div>
            </div>
          </div>
          {d.services && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Services</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.services}</p>
            </div>
          )}
        </BentoCard>

      </div>

      {/* ── EDIT DRAWER ─────────────────────────────────────────────────────── */}
      {editOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Client</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{client.name}</h2>
                </div>
                <button onClick={() => setEditOpen(false)} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {[
                  { label: "Brand / Company Name *", key: "name", type: "text", req: true },
                  { label: "Industry / Niche", key: "industry", type: "text" },
                  { label: "Country", key: "country", type: "text" },
                  { label: "Website URL", key: "websiteUrl", type: "text" },
                  { label: "Services Using", key: "services", type: "text" },
                  { label: "Contact Name", key: "contactName", type: "text" },
                  { label: "Contact Email", key: "contactEmail", type: "email" },
                  { label: "Phone / WhatsApp", key: "contactPhone", type: "tel" },
                ].map(f => (
                  <div key={f.key}>
                    <label className={LABEL}>{f.label}</label>
                    <input required={f.req} type={f.type} value={editForm[f.key] || ""} onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className={INPUT} />
                  </div>
                ))}
                <div>
                  <label className={LABEL}>Account Lead</label>
                  <select value={editForm.ownerId || ""} onChange={e => setEditForm((p: any) => ({ ...p, ownerId: e.target.value }))} className={SELECT}>
                    {roster.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Client Stage</label>
                  <select value={editForm.stage || "contract_signed"} onChange={e => setEditForm((p: any) => ({ ...p, stage: e.target.value }))} className={SELECT}>
                    <option value="contract_signed">Contract Signed</option>
                    <option value="discovery">Discovery</option>
                    <option value="integrations">Integrations</option>
                    <option value="live">Campaign Live</option>
                  </select>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editSaving || !editForm.name} className="bg-brand-600 text-white font-bold min-w-[120px] justify-center">
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
