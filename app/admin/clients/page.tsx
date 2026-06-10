"use client";

import { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import { createUser } from "@/app/actions/auth";
import {
  getClientsEnriched, onboardClient, updateClient, updateClientStage,
  updateClientChecklist, deleteClient, getTeamUsers, getProjects,
  getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice,
  autoGenerateInvoices,
} from "@/app/actions/crm";
import {
  Building2, ChevronLeft, ChevronRight, CheckCircle2, DollarSign,
  ExternalLink, Globe, Laptop, Layers, Mail, MapPin, Megaphone,
  MoreHorizontal, Phone, Plus, Receipt, Search, Tag, Trash2,
  TrendingUp, Users, X, ArrowLeft, ArrowRight, Code2, Zap,
  FileText, Clock, AlertCircle, BadgeCheck, Send, RefreshCw,
  SlidersHorizontal, Sparkles, CalendarDays, Link as LinkIcon, Edit2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import KpiCard from "@/components/KpiCard";

// ── Types ────────────────────────────────────────────────────────────────────
interface DBClient {
  id: number; name: string; ownerId: number | null; stage: string;
  progress: number; checklist: string; details: string | null;
  createdAt: string | Date;
  linkedProjects: any[]; linkedInvoices: any[]; totalMRR: number;
  unpaidCount: number; latestInvoice: any | null;
}
interface TeamMember { id: number; name: string; email: string; role: string; }
interface InvoiceRow {
  id: number; clientId: number | null; projectId: number | null;
  invoiceNumber: string; amount: number; status: string;
  dueDate: string | null; paidDate: string | null; notes: string | null;
  createdAt: string | Date; clientName: string; projectName: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const BLANK_CLIENT = {
  name: "", contactName: "", contactEmail: "", contactPhone: "",
  websiteUrl: "", industry: "", country: "", services: "",
  loginEmail: "", loginPassword: "", ownerId: "",
};
const BLANK_INVOICE = {
  clientId: "", projectId: "", amount: "", dueDate: "", notes: "",
};

const INPUT  = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT = "h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white cursor-pointer transition-all";
const LABEL  = "block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

const STAGE_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  contract_signed: { label: "Contract Signed", dot: "bg-indigo-500", pill: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  discovery:       { label: "Discovery",        dot: "bg-amber-500",  pill: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  integrations:    { label: "Integrations",     dot: "bg-sky-500",    pill: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  live:            { label: "Campaign Live",    dot: "bg-emerald-500",pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

const INV_STATUS: Record<string, { label: string; pill: string }> = {
  draft:   { label: "Draft",   pill: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  sent:    { label: "Sent",    pill: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  paid:    { label: "Paid",    pill: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  overdue: { label: "Overdue", pill: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const PROJ_TYPE_ICON: Record<string, React.ElementType> = {
  meta_ads: Megaphone, web_dev: Code2, other: Zap,
};

function parseDetails(raw: string | null | undefined) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { toast, confirmDialog } = useToast();

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"directory" | "pipeline" | "invoices">("directory");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [clients, setClients]   = useState<DBClient[]>([]);
  const [roster, setRoster]     = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  // invoice filters
  const [invSearch, setInvSearch]       = useState("");
  const [invStatus, setInvStatus]       = useState("all");
  const [autoRunning, setAutoRunning]   = useState(false);

  // client drawer
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerStep, setDrawerStep]   = useState(0);
  const [form, setForm]               = useState({ ...BLANK_CLIENT });
  const [submitting, setSubmitting]   = useState(false);

  // invoice drawer
  const [invDrawer, setInvDrawer]     = useState(false);
  const [invForm, setInvForm]         = useState({ ...BLANK_INVOICE });
  const [invSubmitting, setInvSubmitting] = useState(false);

  // edit client drawer
  const [editOpen, setEditOpen]               = useState(false);
  const [editClient, setEditClient]           = useState<DBClient | null>(null);
  const [editForm, setEditForm]               = useState<any>({});
  const [editSubmitting, setEditSubmitting]   = useState(false);

  // three-dots menu
  const [menuOpenId, setMenuOpenId]           = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cr, tr, pr, ir] = await Promise.all([
        getClientsEnriched(), getTeamUsers(), getProjects(), getInvoices(),
      ]);
      if (cr.success && cr.data) setClients(cr.data as DBClient[]);
      if (tr.success && tr.data) {
        const r = tr.data.filter((u: any) => u.role !== "client");
        setRoster(r);
        if (r.length > 0) setForm(p => ({ ...p, ownerId: r[0].id.toString() }));
      }
      if (pr.success && pr.data) setProjects(pr.data);
      if (ir.success && ir.data) setInvoices(ir.data as InvoiceRow[]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getOwner = (id: number | null) => roster.find(r => r.id === id)?.name || "Unassigned";
  const f  = (v: Partial<typeof BLANK_CLIENT>)   => setForm(p => ({ ...p, ...v }));
  const fi = (v: Partial<typeof BLANK_INVOICE>)  => setInvForm(p => ({ ...p, ...v }));

  // ── Add Client ─────────────────────────────────────────────────────────────
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.loginEmail || !form.loginPassword) {
      toast("Brand Name, Login Email and Password are required.", "error"); return;
    }
    setSubmitting(true);
    try {
      const ufd = new FormData();
      ufd.append("name", form.contactName.trim() || form.name.trim());
      ufd.append("email", form.loginEmail.trim().toLowerCase());
      ufd.append("password", form.loginPassword);
      ufd.append("role", "client");
      const ur = await createUser(ufd);
      if (!ur.success) { toast(ur.error || "Failed to create portal account.", "error"); return; }

      const details = JSON.stringify({
        contactName: form.contactName, contactEmail: form.contactEmail,
        contactPhone: form.contactPhone, websiteUrl: form.websiteUrl,
        industry: form.industry, country: form.country,
        services: form.services, loginEmail: form.loginEmail,
      });
      const cfd = new FormData();
      cfd.append("name", form.name.trim());
      cfd.append("ownerId", form.ownerId);
      cfd.append("details", details);
      const cr = await onboardClient(cfd);
      if (cr.success) {
        setDrawerOpen(false);
        await load();
        toast(`${form.name} onboarded! Portal credentials ready.`, "success");
      } else toast(cr.error || "Failed to create client record.", "error");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setSubmitting(false); }
  };

  const handleDeleteClient = async (id: number, name: string) => {
    if (!await confirmDialog(`Delete "${name}"? This will remove all linked data.`)) return;
    try {
      const r = await deleteClient(id);
      if (r.success) { await load(); toast(`${name} removed.`, "info"); }
      else toast(r.error || "Failed.", "error");
    } catch (err: any) { toast(err.message, "error"); }
  };

  const openEditClient = (c: DBClient) => {
    const d = parseDetails(c.details);
    setEditClient(c);
    setEditForm({
      name:         c.name,
      ownerId:      c.ownerId ? String(c.ownerId) : "",
      stage:        c.stage,
      contactName:  d.contactName  || "",
      contactEmail: d.contactEmail || "",
      contactPhone: d.contactPhone || "",
      websiteUrl:   d.websiteUrl   || "",
      industry:     d.industry     || "",
      country:      d.country      || "",
      services:     d.services     || "",
    });
    setEditOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    setEditSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      const r = await updateClient(editClient.id, fd);
      if (r.success) {
        setEditOpen(false);
        await load();
        toast(`${editForm.name} updated.`, "success");
      } else toast(r.error || "Failed to update.", "error");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setEditSubmitting(false); }
  };

  const ef = (v: any) => setEditForm((p: any) => ({ ...p, ...v }));

  const handleMoveCard = async (id: number, dir: "left" | "right") => {
    const cols = ["contract_signed", "discovery", "integrations", "live"];
    const c = clients.find(c => c.id === id);
    if (!c) return;
    const idx = cols.indexOf(c.stage) + (dir === "right" ? 1 : -1);
    if (idx < 0 || idx >= cols.length) return;
    const r = await updateClientStage(id, cols[idx]);
    if (r.success) setClients(prev => prev.map(x => x.id === id ? { ...x, stage: cols[idx] } : x));
  };

  const handleToggleCheck = async (clientId: number, idx: number) => {
    const c = clients.find(x => x.id === clientId);
    if (!c) return;
    let cl: any[] = [];
    try { cl = JSON.parse(c.checklist); } catch { cl = []; }
    if (cl[idx]) cl[idx].checked = !cl[idx].checked;
    const pct = cl.length ? Math.round((cl.filter((i: any) => i.checked).length / cl.length) * 100) : 0;
    const r = await updateClientChecklist(clientId, JSON.stringify(cl), pct);
    if (r.success) setClients(prev => prev.map(x => x.id === clientId ? { ...x, checklist: JSON.stringify(cl), progress: pct } : x));
  };

  // ── Invoice handlers ───────────────────────────────────────────────────────
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.clientId || !invForm.amount) { toast("Client and amount required.", "error"); return; }
    setInvSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("clientId", invForm.clientId);
      fd.append("projectId", invForm.projectId || "");
      fd.append("amount", invForm.amount);
      fd.append("dueDate", invForm.dueDate);
      fd.append("notes", invForm.notes);
      const r = await createInvoice(fd);
      if (r.success) {
        setInvDrawer(false);
        setInvForm({ ...BLANK_INVOICE });
        await load();
        toast(`Invoice ${r.invoiceNumber} created.`, "success");
      } else toast(r.error || "Failed.", "error");
    } catch (err: any) { toast(err.message, "error"); }
    finally { setInvSubmitting(false); }
  };

  const handleStatusChange = async (id: number, status: "draft" | "sent" | "paid" | "overdue") => {
    const paidDate = status === "paid" ? new Date().toISOString().split("T")[0] : undefined;
    const r = await updateInvoiceStatus(id, status, paidDate);
    if (r.success) {
      const update = (i: any) => i.id === id ? { ...i, status, ...(paidDate ? { paidDate } : {}) } : i;
      setInvoices(prev => prev.map(update));
      setClients(prev => prev.map(c => ({
        ...c,
        linkedInvoices: c.linkedInvoices.map(update),
        latestInvoice: c.latestInvoice?.id === id ? update(c.latestInvoice) : c.latestInvoice,
      })));
      toast(`Invoice marked ${status}.`, "success");
    } else toast(r.error || "Failed.", "error");
  };

  const handleDeleteInvoice = async (id: number, num: string) => {
    if (!await confirmDialog(`Delete invoice ${num}?`)) return;
    const r = await deleteInvoice(id);
    if (r.success) { setInvoices(prev => prev.filter(i => i.id !== id)); toast("Invoice deleted.", "info"); }
    else toast(r.error || "Failed.", "error");
  };

  const handleAutoGenerate = async () => {
    setAutoRunning(true);
    try {
      const r = await autoGenerateInvoices();
      if (r.success) {
        await load();
        toast(r.generated > 0 ? `${r.generated} invoice(s) auto-generated!` : "No invoices due today.", "info");
      } else toast(r.error || "Failed.", "error");
    } finally { setAutoRunning(false); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    const d = parseDetails(c.details);
    return c.name.toLowerCase().includes(q)
      || getOwner(c.ownerId).toLowerCase().includes(q)
      || (d.industry || "").toLowerCase().includes(q)
      || (d.contactName || "").toLowerCase().includes(q)
      || (d.services || "").toLowerCase().includes(q);
  });

  const filteredInvoices = invoices.filter(i => {
    if (invStatus !== "all" && i.status !== invStatus) return false;
    if (!invSearch) return true;
    const q = invSearch.toLowerCase();
    return i.invoiceNumber.toLowerCase().includes(q)
      || i.clientName.toLowerCase().includes(q)
      || (i.projectName || "").toLowerCase().includes(q);
  });

  const totalMRR      = clients.reduce((s, c) => s + c.totalMRR, 0);
  const liveCount     = clients.filter(c => c.stage === "live").length;
  const onboardCount  = clients.filter(c => c.stage !== "live").length;
  const paidRevenue   = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueCount  = invoices.filter(i => i.status === "overdue").length;
  const unpaidTotal   = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const TABS = [
    { key: "directory", label: "Clients",  count: clients.length },
    { key: "pipeline",  label: "Pipeline", count: null },
    { key: "invoices",  label: "Invoices", count: invoices.filter(i => i.status !== "paid").length || null },
  ] as const;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Client Accounts"
        description="Manage client profiles, onboarding pipeline, and invoices."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === "invoices" && (
              <Button variant="outline" size="md" onClick={handleAutoGenerate} disabled={autoRunning}>
                <RefreshCw className={cn("h-4 w-4 mr-1.5", autoRunning && "animate-spin")} />
                Auto-Generate
              </Button>
            )}
            <Button onClick={() => activeTab === "invoices" ? (setInvDrawer(true), setInvForm({ ...BLANK_INVOICE })) : (setDrawerOpen(true), setDrawerStep(0), setForm({ ...BLANK_CLIENT, ownerId: roster[0]?.id?.toString() || "" }))}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-glow">
              <Plus className="h-4 w-4 mr-1" />
              {activeTab === "invoices" ? "New Invoice" : "Add Client"}
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Monthly MRR" value={`$${totalMRR.toLocaleString()}`} change="+8.3%" changeType="positive" accent="brand" icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Live Clients" value={String(liveCount)} change={`+${liveCount}`} changeType="positive" accent="emerald" icon={<BadgeCheck className="h-5 w-5" />} />
        <KpiCard title="Paid Revenue" value={`$${paidRevenue.toLocaleString()}`} change="All time" changeType="positive" accent="portal" icon={<Receipt className="h-5 w-5" />} />
        <KpiCard title="Unpaid / Overdue" value={`$${unpaidTotal.toLocaleString()}`} change={overdueCount > 0 ? `${overdueCount} overdue` : "All clear"} changeType={overdueCount > 0 ? "negative" : "positive"} accent="amber" icon={<AlertCircle className="h-5 w-5" />} />
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab.key ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}>
            {tab.label}
            {tab.count != null && (
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all",
                activeTab === tab.key ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY ─────────────────────────────────────────────────────── */}
      {activeTab === "directory" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-3.5 text-slate-400" />
              <input type="search" placeholder="Search clients, industry, contact…" value={search} onChange={e => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-slate-200 dark:border-slate-700 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Building2 className="h-5 w-5" />} title={search ? "No matching clients" : "No clients yet"} description={search ? "Try a different search term." : "Add your first client to get started."}
              action={!search ? <Button size="sm" onClick={() => setDrawerOpen(true)} className="bg-brand-600 text-white"><Plus className="h-3.5 w-3.5 mr-1" /> Add Client</Button> : undefined} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(c => {
                const d = parseDetails(c.details);
                const stage = STAGE_CONFIG[c.stage] || STAGE_CONFIG.contract_signed;
                const initials = c.name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
                const owner = getOwner(c.ownerId);
                return (
                  <div key={c.id}
                    className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    onClick={() => { setMenuOpenId(null); router.push(`/admin/clients/${c.id}`); }}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white flex items-center justify-center shrink-0 shadow-sm">
                          {initials || "?"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{c.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn("inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border", stage.pill)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full mr-1", stage.dot)} />
                              {stage.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Three-dots menu */}
                      <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpenId === c.id && (
                          <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 space-y-0.5">
                            <button onClick={() => { openEditClient(c); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                              <Edit2 className="h-3.5 w-3.5 text-slate-400" /> Edit Client
                            </button>
                            <button onClick={() => { handleDeleteClient(c.id, c.name); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" /> Delete Client
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact + Owner */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{d.contactName || "—"}</p>
                        {d.contactPhone && (
                          <a href={`https://wa.me/${d.contactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 hover:underline">
                            <Phone className="h-2.5 w-2.5" /> WhatsApp
                          </a>
                        )}
                        {d.contactEmail && !d.contactPhone && (
                          <p className="text-[10px] text-slate-400 truncate">{d.contactEmail}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Lead</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Avatar name={owner} size="xs" />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{owner}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {d.industry && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" /> {d.industry}
                        </span>
                      )}
                      {d.country && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full">
                          <MapPin className="h-2.5 w-2.5" /> {d.country}
                        </span>
                      )}
                      {d.websiteUrl && (
                        <a href={d.websiteUrl.startsWith("http") ? d.websiteUrl : `https://${d.websiteUrl}`} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5 border border-brand-500/20 px-1.5 py-0.5 rounded-full hover:bg-brand-500/20 transition-all">
                          <Globe className="h-2.5 w-2.5" /> Website
                        </a>
                      )}
                      {d.services && (
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                          {d.services}
                        </span>
                      )}
                    </div>

                    {/* MRR + Projects */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">MRR</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                          {c.totalMRR > 0 ? `$${c.totalMRR.toLocaleString()}/mo` : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {c.linkedProjects.slice(0, 3).map((p: any) => {
                          const Icon = PROJ_TYPE_ICON[p.projectType] || Zap;
                          return (
                            <span key={p.id} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full">
                              <Icon className="h-2.5 w-2.5" /> {p.name.substring(0, 14)}{p.name.length > 14 ? "…" : ""}
                            </span>
                          );
                        })}
                        {c.linkedProjects.length === 0 && <span className="text-[10px] text-slate-400 italic">No projects</span>}
                      </div>
                    </div>

                    {/* Invoice status */}
                    {c.latestInvoice && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400">Latest Invoice</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{c.latestInvoice.invoiceNumber}</span>
                          <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-bold", INV_STATUS[c.latestInvoice.status]?.pill || INV_STATUS.draft.pill)}>
                            {INV_STATUS[c.latestInvoice.status]?.label || c.latestInvoice.status}
                          </span>
                          {c.unpaidCount > 0 && (
                            <span className="text-[9px] font-bold text-rose-500">{c.unpaidCount} unpaid</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Onboarding</span>
                        <span className="text-[9px] font-bold text-slate-500">{c.progress}%</span>
                      </div>
                      <Progress value={c.progress} size="sm" barClassName="bg-brand-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PIPELINE ──────────────────────────────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-slate-200 dark:border-slate-700 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {(["contract_signed", "discovery", "integrations", "live"] as const).map(stage => {
                const cfg = STAGE_CONFIG[stage];
                const list = clients.filter(c => c.stage === stage);
                return (
                  <div key={stage} className="rounded-2xl bg-slate-50/60 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cfg.label}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500">{list.length}</span>
                    </div>
                    <div className="space-y-3">
                      {list.map(c => (
                        <KanbanCard key={c.id} client={c} ownerName={getOwner(c.ownerId)} onMove={handleMoveCard} onToggleCheck={handleToggleCheck} />
                      ))}
                      {list.length === 0 && (
                        <EmptyState icon={<Building2 className="h-4 w-4" />} title="Empty" description="No clients in this stage" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INVOICES ──────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="space-y-5">
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-3.5 text-slate-400" />
              <input type="search" placeholder="Search by number, client…" value={invSearch} onChange={e => setInvSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status</span>
              {["all", "draft", "sent", "paid", "overdue"].map(s => (
                <button key={s} onClick={() => setInvStatus(s)}
                  className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer",
                    invStatus === s ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400")}>
                  {s === "all" ? "All" : (INV_STATUS[s]?.label || s)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200/40 dark:border-slate-800/30" />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices" description={invStatus !== "all" ? "No invoices with that status." : "Create your first invoice or use Auto-Generate."}
              action={<Button size="sm" onClick={() => setInvDrawer(true)} className="bg-brand-600 text-white"><Plus className="h-3.5 w-3.5 mr-1" /> New Invoice</Button>} />
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
                      <th className="text-left px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                      <th className="text-left px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Project</th>
                      <th className="text-right px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Due</th>
                      <th className="text-left px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredInvoices.map(inv => {
                      const st = INV_STATUS[inv.status] || INV_STATUS.draft;
                      const isOverdue = inv.status !== "paid" && inv.dueDate && new Date(inv.dueDate) < new Date();
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-150">
                          <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-white whitespace-nowrap">{inv.clientName}</td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">{inv.projectName || <span className="italic text-slate-300 dark:text-slate-600">—</span>}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">${inv.amount.toLocaleString()}</td>
                          <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                            {inv.paidDate ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Paid {inv.paidDate}</span>
                              : inv.dueDate ? <span className={cn(isOverdue && "text-rose-500 font-semibold")}>{inv.dueDate}</span> : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <select value={inv.status} onChange={e => handleStatusChange(inv.id, e.target.value as any)}
                              className={cn("text-[9px] font-bold px-2 py-1 rounded border cursor-pointer focus:outline-none transition-all", st.pill)}>
                              <option value="draft">Draft</option>
                              <option value="sent">Sent</option>
                              <option value="paid">Paid</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center transition-all cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ADD CLIENT DRAWER
      ════════════════════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">

            {/* Header */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Client</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {drawerStep === 0 ? "Brand Profile" : drawerStep === 1 ? "Contact & Lead" : "Portal Access"}
                  </h2>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Step indicator */}
              <div className="mt-4 flex items-center gap-2">
                {["Brand Profile", "Contact & Lead", "Portal Access"].map((label, i) => (
                  <Fragment key={i}>
                    <button type="button" onClick={() => setDrawerStep(i)}
                      className={cn("flex items-center gap-1.5 text-[10px] font-bold transition-all cursor-pointer",
                        drawerStep === i ? "text-brand-600 dark:text-brand-400" : drawerStep > i ? "text-slate-500" : "text-slate-400")}>
                      <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 transition-all",
                        drawerStep === i ? "bg-brand-600 text-white" : drawerStep > i ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
                        {drawerStep > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                      </span>
                      {label}
                    </button>
                    {i < 2 && <div className={cn("flex-1 h-px transition-all", drawerStep > i ? "bg-brand-300 dark:bg-brand-700" : "bg-slate-200 dark:bg-slate-800")} />}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddClient} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {drawerStep === 0 && (
                  <>
                    <SectionHeader icon={Building2} label="Company" />
                    <div className="space-y-4">
                      <div>
                        <label className={LABEL}>Brand / Company Name *</label>
                        <input required value={form.name} onChange={e => f({ name: e.target.value })} placeholder="e.g. Stark Industries" className={INPUT} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL}>Industry / Niche</label>
                          <input value={form.industry} onChange={e => f({ industry: e.target.value })} placeholder="e.g. E-Commerce, SaaS" className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>Country</label>
                          <input value={form.country} onChange={e => f({ country: e.target.value })} placeholder="e.g. India, UAE" className={INPUT} />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL}>Website URL</label>
                        <input type="text" value={form.websiteUrl} onChange={e => f({ websiteUrl: e.target.value })} placeholder="example.com" className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Services Using</label>
                        <input value={form.services} onChange={e => f({ services: e.target.value })} placeholder="Meta Ads, Web Dev, Branding…" className={INPUT} />
                      </div>
                    </div>
                  </>
                )}

                {drawerStep === 1 && (
                  <>
                    <SectionHeader icon={Users} label="Primary Contact" />
                    <div className="space-y-4">
                      <div>
                        <label className={LABEL}>Contact Name</label>
                        <input value={form.contactName} onChange={e => f({ contactName: e.target.value })} placeholder="e.g. Pepper Potts" className={INPUT} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL}>Contact Email</label>
                          <input type="email" value={form.contactEmail} onChange={e => f({ contactEmail: e.target.value, loginEmail: form.loginEmail || e.target.value })} placeholder="pepper@stark.com" className={INPUT} />
                        </div>
                        <div>
                          <label className={LABEL}>Phone / WhatsApp</label>
                          <input type="tel" value={form.contactPhone} onChange={e => f({ contactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                        </div>
                      </div>
                    </div>
                    <SectionHeader icon={Sparkles} label="Account Lead" />
                    <div>
                      <label className={LABEL}>Assign Lead</label>
                      <select value={form.ownerId} onChange={e => f({ ownerId: e.target.value })} className={SELECT}>
                        {roster.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                      </select>
                    </div>
                  </>
                )}

                {drawerStep === 2 && (
                  <>
                    <SectionHeader icon={Laptop} label="Portal Access" />
                    <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2 mb-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Client Portal Login</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">These credentials let the client sign in to view reports, projects, and invoices on their portal.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={LABEL}>Portal Email *</label>
                        <input type="email" required value={form.loginEmail} onChange={e => f({ loginEmail: e.target.value })} placeholder="client@example.com" className={INPUT} />
                        <button type="button" onClick={() => f({ loginEmail: form.contactEmail })} className="mt-1 text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer block text-right">
                          Use Contact Email
                        </button>
                      </div>
                      <div>
                        <label className={LABEL}>Temporary Password *</label>
                        <input type="password" required value={form.loginPassword} onChange={e => f({ loginPassword: e.target.value })} placeholder="••••••••" className={INPUT} />
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold text-slate-400">Step {drawerStep + 1} of 3</p>
                <div className="flex gap-2">
                  {drawerStep > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setDrawerStep(s => s - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Back
                    </Button>
                  )}
                  {drawerStep < 2 ? (
                    <Button type="button" size="sm" onClick={() => setDrawerStep(s => s + 1)} className="bg-brand-600 text-white font-bold active:scale-95">
                      Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  ) : (
                    <Button type="submit" size="sm" disabled={submitting || !form.name || !form.loginEmail || !form.loginPassword}
                      className="bg-brand-600 text-white font-bold active:scale-95 shadow-glow min-w-[140px] justify-center">
                      {submitting ? "Onboarding…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Onboard Client</>}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          EDIT CLIENT DRAWER
      ════════════════════════════════════════════════════════════════════ */}
      {editOpen && editClient && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">

            {/* Header */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit Client</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{editClient.name}</h2>
                </div>
                <button onClick={() => setEditOpen(false)} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateClient} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                <SectionHeader icon={Building2} label="Company" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Brand / Company Name *</label>
                    <input required value={editForm.name || ""} onChange={e => ef({ name: e.target.value })} placeholder="e.g. Stark Industries" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Industry / Niche</label>
                      <input value={editForm.industry || ""} onChange={e => ef({ industry: e.target.value })} placeholder="e.g. E-Commerce, SaaS" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Country</label>
                      <input value={editForm.country || ""} onChange={e => ef({ country: e.target.value })} placeholder="e.g. India, UAE" className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Website URL</label>
                    <input type="text" value={editForm.websiteUrl || ""} onChange={e => ef({ websiteUrl: e.target.value })} placeholder="example.com" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Services Using</label>
                    <input value={editForm.services || ""} onChange={e => ef({ services: e.target.value })} placeholder="Meta Ads, Web Dev, Branding…" className={INPUT} />
                  </div>
                </div>

                <SectionHeader icon={Users} label="Primary Contact" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Contact Name</label>
                    <input value={editForm.contactName || ""} onChange={e => ef({ contactName: e.target.value })} placeholder="e.g. Pepper Potts" className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Contact Email</label>
                      <input type="email" value={editForm.contactEmail || ""} onChange={e => ef({ contactEmail: e.target.value })} placeholder="pepper@stark.com" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Phone / WhatsApp</label>
                      <input type="tel" value={editForm.contactPhone || ""} onChange={e => ef({ contactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                    </div>
                  </div>
                </div>

                <SectionHeader icon={Sparkles} label="Account" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Account Lead</label>
                    <select value={editForm.ownerId || ""} onChange={e => ef({ ownerId: e.target.value })} className={SELECT}>
                      {roster.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Client Stage</label>
                    <select value={editForm.stage || "contract_signed"} onChange={e => ef({ stage: e.target.value })} className={SELECT}>
                      <option value="contract_signed">Contract Signed</option>
                      <option value="discovery">Discovery</option>
                      <option value="integrations">Integrations</option>
                      <option value="live">Live</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editSubmitting || !editForm.name}
                  className="bg-brand-600 text-white font-bold active:scale-95 min-w-[120px] justify-center">
                  {editSubmitting ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Changes</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          NEW INVOICE DRAWER
      ════════════════════════════════════════════════════════════════════ */}
      {invDrawer && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setInvDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">

            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">New Invoice</h2>
                </div>
                <button onClick={() => setInvDrawer(false)} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateInvoice} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                <SectionHeader icon={Building2} label="Billing To" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Client *</label>
                    <select required value={invForm.clientId} onChange={e => { fi({ clientId: e.target.value, projectId: "" }); }}
                      className={SELECT}>
                      <option value="">Select client…</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {invForm.clientId && (
                    <div>
                      <label className={LABEL}>Project (optional)</label>
                      <select value={invForm.projectId} onChange={e => fi({ projectId: e.target.value })} className={SELECT}>
                        <option value="">No specific project</option>
                        {projects.filter(p => {
                          const cl = clients.find(c => c.id === parseInt(invForm.clientId));
                          return cl && (p.clientId === cl.id || p.clientName === cl.name);
                        }).map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.monthlyFee ? `— $${p.monthlyFee}/mo` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <SectionHeader icon={DollarSign} label="Amount & Dates" />
                <div className="space-y-4">
                  <div>
                    <label className={LABEL}>Invoice Amount (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input required type="number" min="1" value={invForm.amount} onChange={e => fi({ amount: e.target.value })} placeholder="3000" className={cn(INPUT, "pl-9")} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Due Date</label>
                    <input type="date" value={invForm.dueDate} onChange={e => fi({ dueDate: e.target.value })} className={INPUT} />
                  </div>
                </div>

                <SectionHeader icon={FileText} label="Notes" />
                <div>
                  <label className={LABEL}>Invoice Notes (optional)</label>
                  <textarea rows={3} value={invForm.notes} onChange={e => fi({ notes: e.target.value })} placeholder="Monthly retainer fee for Meta Ads management…" className={cn(INPUT, "h-auto py-3 resize-none leading-relaxed")} />
                </div>

              </div>

              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setInvDrawer(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={invSubmitting || !invForm.clientId || !invForm.amount}
                  className="bg-brand-600 text-white font-bold active:scale-95 shadow-glow min-w-[140px] justify-center">
                  {invSubmitting ? "Creating…" : <><Receipt className="h-4 w-4 mr-1.5" /> Create Invoice</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────
function KanbanCard({ client, ownerName, onMove, onToggleCheck }: {
  client: DBClient; ownerName: string;
  onMove: (id: number, dir: "left" | "right") => void;
  onToggleCheck: (id: number, idx: number) => void;
}) {
  let checklist: { text: string; checked: boolean }[] = [];
  try { checklist = JSON.parse(client.checklist); } catch { checklist = []; }
  const pct = checklist.length ? Math.round((checklist.filter(i => i.checked).length / checklist.length) * 100) : 0;
  const initials = client.name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
  const d = parseDetails(client.details);

  return (
    <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{client.name}</h4>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-0.5">{d.industry || "General Retainer"}</span>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {client.stage !== "contract_signed" && (
            <button onClick={() => onMove(client.id, "left")} className="h-5 w-5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer" aria-label="Move back">
              <ArrowLeft className="h-3 w-3" />
            </button>
          )}
          {client.stage !== "live" && (
            <button onClick={() => onMove(client.id, "right")} className="h-5 w-5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer" aria-label="Advance">
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {checklist.length > 0 && (
        <div className="space-y-1.5 border-t border-b border-slate-100 dark:border-slate-900 py-2.5">
          {checklist.map((item, idx) => (
            <div key={idx} onClick={() => onToggleCheck(client.id, idx)}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 p-1 rounded-lg transition-colors">
              <input type="checkbox" checked={item.checked} readOnly className="rounded text-brand-600 h-3.5 w-3.5 border-slate-200 cursor-pointer" />
              <span className={cn("text-[10px] select-none", item.checked ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-350 font-bold")}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar name={ownerName} size="xs" />
          <span className="text-[10px] text-slate-400 font-bold truncate max-w-[80px]">{ownerName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-12 bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-brand-600 h-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] font-extrabold text-brand-600 dark:text-brand-400">{pct}%</span>
        </div>
      </div>

      {client.totalMRR > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-bold">MRR</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">${client.totalMRR.toLocaleString()}/mo</span>
        </div>
      )}
    </div>
  );
}
