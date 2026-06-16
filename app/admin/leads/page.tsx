"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import {
  updateLead, deleteLead, moveLeadStage, convertLeadToClient, getTeamUsers, getLeads,
} from "@/app/actions/crm";
import {
  Calendar, CheckCircle2, ChevronRight,
  Code2, Copy, IndianRupee, Edit2, ExternalLink, FileText, Link2,
  Loader2, Mail, Megaphone, MessageCircle, Phone, Send, Star,
  Target, TrendingUp, Trash2, UserCheck, X, Zap, ChevronDown,
  Globe, Webhook, Info, Search, SlidersHorizontal,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import InboundLeads from "@/components/InboundLeads";

// ── config ────────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "new",         label: "New",         dot: "bg-slate-400",    pill: "bg-slate-100 text-slate-600 dark:bg-[#303030] dark:text-[#9999a8]" },
  { id: "contacted",   label: "Contacted",   dot: "bg-blue-500",     pill: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-[#60a5fa]" },
  { id: "proposal",    label: "Proposal",    dot: "bg-violet-500",   pill: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" },
  { id: "negotiation", label: "Negotiating", dot: "bg-amber-500",    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  { id: "won",         label: "Won",         dot: "bg-emerald-500",  pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  { id: "lost",        label: "Lost",        dot: "bg-rose-500",     pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" },
] as const;

type StageId = (typeof STAGES)[number]["id"];

const STAGE_ORDER: StageId[] = ["new", "contacted", "proposal", "negotiation", "won", "lost"];

const SERVICES = [
  { id: "meta_ads", label: "Meta Ads",  icon: Megaphone, light: "text-blue-600",   dark: "dark:text-[#60a5fa]" },
  { id: "web_dev",  label: "Web Dev",   icon: Code2,     light: "text-violet-600", dark: "dark:text-violet-400" },
  { id: "both",     label: "Both",      icon: Star,      light: "text-amber-600",  dark: "dark:text-amber-400" },
  { id: "other",    label: "Other",     icon: Zap,       light: "text-slate-500",  dark: "dark:text-[#9999a8]" },
];

const SOURCES = ["referral", "social_media", "cold_outreach", "inbound", "event", "website", "instagram", "facebook", "other"];

const INPUT  = "h-10 w-full rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT = "h-10 w-full rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 text-slate-800 dark:text-white cursor-pointer transition-all";
const LABEL  = "block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5";

const BLANK_EDIT = {
  name: "", contactName: "", contactPhone: "", contactEmail: "",
  source: "", service: "meta_ads", stage: "new" as StageId,
  estimatedValue: "", notes: "", assignedTo: "", followUpDate: "",
};

function serviceInfo(id: string | null | undefined) {
  return SERVICES.find(s => s.id === id) || SERVICES[3];
}
function stageInfo(id: string | null | undefined) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}
function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ── Proposal generator ────────────────────────────────────────────────────────
function buildProposal(lead: any, type: "email" | "whatsapp") {
  const service = serviceInfo(lead.service);
  const name  = lead.contactName || lead.name;
  const value = lead.estimatedValue ? `₹${Number(lead.estimatedValue).toLocaleString()}/month` : "to be discussed";
  const serviceDesc: Record<string, string> = {
    meta_ads: "Meta Ads management — including Facebook & Instagram ad campaigns, creative strategy, audience targeting, A/B testing, and monthly performance reports.",
    web_dev:  "Website development — including design, development, SEO foundation, mobile optimisation, and post-launch support.",
    both:     "Full digital package — Meta Ads management + Website development, giving you a complete online presence and lead-generation engine.",
    other:    "Digital marketing services tailored to your business goals.",
  };
  const desc = serviceDesc[lead.service || "other"] || serviceDesc.other;
  if (type === "email") {
    return {
      subject: `Proposal: ${service.label} Services for ${lead.name} — ThePieCraft`,
      body: `Dear ${name},\n\nThank you for your interest in ThePieCraft's digital marketing services. We're excited about the opportunity to work with ${lead.name}.\n\nFollowing our conversation, here is our tailored proposal:\n\nSERVICE SCOPE\n${desc}\n\nESTIMATED INVESTMENT\n${value}\n\nWHAT YOU GET\n• Dedicated account manager\n• Monthly strategy calls\n• Transparent reporting dashboard\n• Creative assets & copy included\n• WhatsApp support during business hours\n\nNEXT STEPS\nWe'd love to schedule a 30-minute call to walk you through the proposal in detail and answer any questions.\n\n📞 Reply to this email or WhatsApp us directly to book your call.\n\nLooking forward to growing your business together.\n\nWarm regards,\nThePieCraft Marketing Team\n📧 hello@thepiecraft.com\n🌐 thepiecraft.com`,
    };
  }
  return {
    subject: "",
    body: `Hi ${name}! 👋\n\nThank you for your interest in ThePieCraft. Here's a quick overview of what we can do for *${lead.name}*:\n\n*Service:* ${service.label}\n*Investment:* ${value}\n\n*What's included:*\n✅ Dedicated account manager\n✅ Monthly strategy & reporting\n✅ Creative assets included\n✅ WhatsApp support\n\nWould you like to hop on a quick 15-min call to discuss? Just reply here 📲\n\n— ThePieCraft Team\n🌐 thepiecraft.com`,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();
  const { toast, confirmDialog } = useToast();

  const [leads, setLeads]       = useState<any[]>([]);
  const [roster, setRoster]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [moving, setMoving]     = useState<number | null>(null);
  const [converting, setConverting] = useState<number | null>(null);

  const [editLead, setEditLead]   = useState<any>(null);
  const [editForm, setEditForm]   = useState({ ...BLANK_EDIT });
  const [editing, setEditing]     = useState(false);

  const [proposalLead, setProposalLead]     = useState<any>(null);
  const [proposalType, setProposalType]     = useState<"email" | "whatsapp">("email");
  const [proposalCopied, setProposalCopied] = useState(false);

  const [showIntegrations, setShowIntegrations] = useState(false);
  const [copiedUrl, setCopiedUrl]   = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const [search, setSearch]         = useState("");
  const [stageFilter, setStageFilter] = useState<StageId | "all">("all");

  const WEBHOOK_URL = typeof window !== "undefined"
    ? `${window.location.origin}/api/leads/submit`
    : "/api/leads/submit";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, tr] = await Promise.all([getLeads(), getTeamUsers()]);
      if (lr.success) setLeads((lr.data as any[]) || []);
      if (tr.success && tr.data) setRoster((tr.data as any[]).filter((u: any) => u.role !== "client"));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ef = (v: Partial<typeof BLANK_EDIT>) => setEditForm(p => ({ ...p, ...v }));

  const filtered = leads.filter(l => {
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    if (!search) return matchStage;
    const q = search.toLowerCase();
    return matchStage && (
      (l.name || "").toLowerCase().includes(q) ||
      (l.contactName || "").toLowerCase().includes(q) ||
      (l.contactEmail || "").toLowerCase().includes(q)
    );
  });

  const totalPipeline = leads.filter(l => !["won", "lost"].includes(l.stage)).reduce((s, l) => s + (l.estimatedValue || 0), 0);
  const wonCount    = leads.filter(l => l.stage === "won").length;
  const lostCount   = leads.filter(l => l.stage === "lost").length;
  const activeCount = leads.filter(l => !["won", "lost"].includes(l.stage)).length;

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    setEditing(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      const r = await updateLead(editLead.id, fd);
      if (r.success) { setEditLead(null); await load(); toast("Lead updated.", "success"); }
      else toast(r.error || "Failed.", "error");
    } finally { setEditing(false); }
  };

  const handleMove = async (lead: any, nextStageId: StageId) => {
    setMoving(lead.id);
    try {
      const r = await moveLeadStage(lead.id, nextStageId);
      if (r.success) setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: nextStageId } : l));
      else toast(r.error || "Failed.", "error");
    } finally { setMoving(null); }
  };

  const handleDelete = async (lead: any) => {
    if (!await confirmDialog(`Delete lead "${lead.name}"?`)) return;
    const r = await deleteLead(lead.id);
    if (r.success) { setLeads(prev => prev.filter(l => l.id !== lead.id)); toast("Lead deleted.", "info"); }
    else toast(r.error || "Failed.", "error");
  };

  const handleConvert = async (lead: any) => {
    if (!await confirmDialog(`Convert "${lead.name}" to a client?`)) return;
    setConverting(lead.id);
    try {
      const r = await convertLeadToClient(lead.id);
      if (r.success) {
        await load();
        toast(`${lead.name} converted to client!`, "success");
        if (r.clientId) router.push(`/admin/clients/${r.clientId}`);
      } else toast(r.error || "Failed.", "error");
    } finally { setConverting(null); }
  };

  const openEdit = (lead: any) => {
    setEditForm({
      name: lead.name || "", contactName: lead.contactName || "",
      contactPhone: lead.contactPhone || "", contactEmail: lead.contactEmail || "",
      source: lead.source || "", service: lead.service || "meta_ads",
      stage: lead.stage || "new", estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
      notes: lead.notes || "", assignedTo: lead.assignedTo ? String(lead.assignedTo) : "",
      followUpDate: lead.followUpDate || "",
    });
    setEditLead(lead);
  };

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const proposal = proposalLead ? buildProposal(proposalLead, proposalType) : null;

  const embedCode = `<form action="${WEBHOOK_URL}" method="POST" enctype="application/json">
  <input type="hidden" name="token" value="YOUR_TOKEN_HERE" />
  <input name="name" placeholder="Company / Your Name" required />
  <input name="contactEmail" type="email" placeholder="Email" />
  <input name="contactPhone" placeholder="WhatsApp / Phone" />
  <select name="service">
    <option value="meta_ads">Meta Ads</option>
    <option value="web_dev">Website Development</option>
    <option value="both">Both</option>
  </select>
  <textarea name="notes" placeholder="Tell us about your project"></textarea>
  <button type="submit">Get a Free Proposal</button>
</form>`;

  const jsonExample = `{
  "token": "YOUR_TOKEN_HERE",
  "name": "Chaat Lounge",
  "contactName": "Rohan Mehta",
  "contactPhone": "+91 98765 43210",
  "contactEmail": "rohan@chaatlounge.com",
  "service": "meta_ads",
  "source": "instagram",
  "notes": "Wants to run Ramadan campaign"
}`;

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-[#9999a8] uppercase tracking-widest mb-0.5">Sales</p>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Leads Pipeline</h1>
        </div>
        <button
          onClick={() => setShowIntegrations(v => !v)}
          className={cn(
            "h-9 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
            showIntegrations
              ? "bg-[#3b82f6] border-[#3b82f6] text-white"
              : "bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-[#303030] text-slate-700 dark:text-[#9999a8] hover:border-[#3b82f6] hover:text-[#3b82f6]"
          )}>
          <Webhook className="h-3.5 w-3.5" />Integrations
          <ChevronDown className={cn("h-3 w-3 transition-transform", showIntegrations && "rotate-180")} />
        </button>
      </div>

      {/* ── Inbound leads ── */}
      <InboundLeads />

      {/* ── Integrations panel ── */}
      {showIntegrations && (
        <div className="rounded-[20px] border border-blue-200 dark:border-[#303030] bg-blue-50/40 dark:bg-[#1f1f1f] p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-2xl bg-blue-50 dark:bg-[#303030] flex items-center justify-center shrink-0">
              <Webhook className="h-4 w-4 text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connect Your Lead Sources</h3>
              <p className="text-xs text-slate-500 dark:text-[#9999a8] mt-0.5">POST to this endpoint from your website, Typeform, Meta Lead Ads, or any automation tool.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Link2 className="h-3 w-3" />Webhook URL</p>
              <div className="flex items-center gap-2 bg-white dark:bg-[#303030] rounded-2xl border border-slate-200 dark:border-[#303030] px-3 py-2">
                <code className="text-[10px] text-[#3b82f6] dark:text-[#60a5fa] flex-1 break-all font-mono">{WEBHOOK_URL}</code>
                <button onClick={() => copyText(WEBHOOK_URL, setCopiedUrl)} className="shrink-0 text-slate-400 hover:text-[#3b82f6] transition-colors cursor-pointer">
                  {copiedUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {[{ icon: Globe, label: "Website contact form" }, { icon: Megaphone, label: "Meta Lead Ads webhook" }, { icon: MessageCircle, label: "Instagram / ManyChat" }, { icon: FileText, label: "Typeform / Jotform" }].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-[#9999a8]">
                    <item.icon className="h-3 w-3 text-slate-400 shrink-0" />{item.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Info className="h-3 w-3" />JSON Payload</p>
                <button onClick={() => copyText(jsonExample, setCopiedJson)} className="text-[9px] font-semibold text-slate-400 hover:text-[#3b82f6] flex items-center gap-1 cursor-pointer">
                  {copiedJson ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </button>
              </div>
              <pre className="bg-slate-900 dark:bg-black text-emerald-400 text-[9px] rounded-2xl p-3 overflow-x-auto font-mono leading-relaxed border border-slate-800 whitespace-pre-wrap">{jsonExample}</pre>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Code2 className="h-3 w-3" />HTML Embed</p>
                <button onClick={() => copyText(embedCode, setCopiedEmbed)} className="text-[9px] font-semibold text-slate-400 hover:text-[#3b82f6] flex items-center gap-1 cursor-pointer">
                  {copiedEmbed ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </button>
              </div>
              <pre className="bg-slate-900 dark:bg-black text-sky-400 text-[9px] rounded-2xl p-3 overflow-x-auto font-mono leading-relaxed border border-slate-800 whitespace-pre-wrap">{embedCode}</pre>
              <p className="text-[9px] text-slate-400 flex items-center gap-1">
                <Info className="h-2.5 w-2.5 shrink-0" />Replace <code className="text-[#3b82f6]">YOUR_TOKEN_HERE</code> with your <code className="text-[#3b82f6]">LEADS_SUBMIT_TOKEN</code> env var.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active",         value: activeCount,                             color: "text-slate-900 dark:text-white",         icon: Target },
          { label: "Pipeline Value", value: `₹${totalPipeline.toLocaleString()}`,   color: "text-emerald-600 dark:text-emerald-400", icon: TrendingUp },
          { label: "Won",            value: wonCount,                                color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
          { label: "Lost",           value: lostCount,                               color: "text-rose-500",                          icon: X },
        ].map(k => (
          <div key={k.label} className="rounded-[20px] border border-slate-200/80 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest">{k.label}</p>
              <p className={cn("text-2xl font-extrabold mt-0.5 leading-none tabular-nums", k.color)}>{k.value}</p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0">
              <k.icon className="h-4 w-4 text-[#8888a0] dark:text-[#5a5a68]" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline List ── */}
      <div className="rounded-[20px] border border-slate-200/80 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-[#303030] flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030] pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all"
            />
          </div>
          {/* Stage filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStageFilter("all")}
              className={cn("h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
                stageFilter === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                  : "bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] text-slate-500 dark:text-[#9999a8] hover:border-slate-300"
              )}>All</button>
            {STAGES.map(s => (
              <button key={s.id}
                onClick={() => setStageFilter(s.id)}
                className={cn("h-7 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer border",
                  stageFilter === s.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                    : "bg-white dark:bg-[#303030] border-slate-200 dark:border-[#303030] text-slate-500 dark:text-[#9999a8] hover:border-slate-300"
                )}>
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5", s.dot)} />
                {s.label}
                <span className="ml-1.5 opacity-50 tabular-nums">{leads.filter(l => l.stage === s.id).length}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-[#9999a8]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-[#303030]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg hidden sm:block" />
                <Skeleton className="h-6 w-16 rounded-lg hidden md:block" />
                <Skeleton className="h-6 w-24 rounded-lg hidden lg:block" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-14 w-14 rounded-[20px] bg-slate-100 dark:bg-[#303030] flex items-center justify-center">
              <Webhook className="h-6 w-6 text-[#8888a0] dark:text-[#5a5a68]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-white">
                {leads.length === 0 ? "No leads yet" : "No results"}
              </p>
              <p className="text-xs text-slate-400 dark:text-[#9999a8] mt-1 max-w-xs">
                {leads.length === 0
                  ? "Leads appear here when someone submits your website form or connected source."
                  : "Try adjusting your search or stage filter."}
              </p>
            </div>
            {leads.length === 0 && (
              <button onClick={() => setShowIntegrations(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3b82f6] border border-blue-200 dark:border-[#303030] bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 px-4 py-2 rounded-2xl transition-all cursor-pointer">
                <Webhook className="h-3.5 w-3.5" />Set up integrations
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#303030]">
            {filtered.map(lead => {
              const svc = serviceInfo(lead.service);
              const SvcIcon = svc.icon;
              const stage = stageInfo(lead.stage);
              const stageIdx = STAGE_ORDER.indexOf(lead.stage as StageId);
              const assignee = roster.find(u => u.id === lead.assignedTo);
              const days = daysSince(lead.createdAt);
              const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date();
              const nextStage = STAGE_ORDER[stageIdx + 1] as StageId | undefined;

              return (
                <div key={lead.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 dark:hover:bg-[#303030]/40 transition-colors">

                  {/* Avatar / initials */}
                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0 text-sm font-bold text-slate-500 dark:text-[#9999a8]">
                    {(lead.name || "?")[0].toUpperCase()}
                  </div>

                  {/* Name + contact */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lead.name}</p>
                      {lead.source && (
                        <span className="text-[10px] text-[#9999a8] capitalize hidden sm:inline">{(lead.source as string).replace(/_/g, " ")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {lead.contactName && <span className="text-[11px] text-slate-500 dark:text-[#9999a8] truncate">{lead.contactName}</span>}
                      {lead.contactPhone && (
                        <a href={`https://wa.me/${(lead.contactPhone as string).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline">
                          <Phone className="h-2.5 w-2.5" />{lead.contactPhone}
                        </a>
                      )}
                      {lead.contactEmail && (
                        <a href={`mailto:${lead.contactEmail}`}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:underline truncate max-w-[140px] hidden md:inline-flex">
                          <Mail className="h-2.5 w-2.5" />{lead.contactEmail}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Service */}
                  <div className={cn("hidden sm:flex items-center gap-1.5 text-[11px] font-semibold shrink-0", svc.light, svc.dark)}>
                    <SvcIcon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{svc.label}</span>
                  </div>

                  {/* Value */}
                  <div className="hidden md:block shrink-0 text-right min-w-[80px]">
                    {(lead.estimatedValue || 0) > 0 ? (
                      <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        ₹{Number(lead.estimatedValue).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 dark:text-[#5a5a68]">—</p>
                    )}
                    <p className="text-[10px] text-[#9999a8]">/mo</p>
                  </div>

                  {/* Follow-up */}
                  <div className="hidden lg:block shrink-0 min-w-[90px]">
                    {lead.followUpDate ? (
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg",
                        isOverdue
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : "bg-slate-100 text-slate-500 dark:bg-[#303030] dark:text-[#9999a8]"
                      )}>
                        <Calendar className="h-2.5 w-2.5" />{lead.followUpDate}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-[#5a5a68]">—</span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div className="hidden xl:block shrink-0">
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={assignee.name} size="xs" />
                        <span className="text-[11px] text-slate-500 dark:text-[#9999a8]">{assignee.name.split(" ")[0]}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300 dark:text-[#5a5a68]">Unassigned</span>
                    )}
                  </div>

                  {/* Age */}
                  <div className="hidden sm:block shrink-0 text-[11px] text-slate-400 dark:text-[#5a5a68] tabular-nums min-w-[36px] text-right">
                    {days}d
                  </div>

                  {/* Stage pill */}
                  <div className="shrink-0">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg", stage.pill)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", stage.dot)} />
                      {stage.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Advance stage */}
                    {nextStage && lead.stage !== "lost" && (
                      <button
                        onClick={() => handleMove(lead, nextStage)}
                        disabled={moving === lead.id}
                        title={`Move to ${stageInfo(nextStage).label}`}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#3b82f6] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer disabled:opacity-40">
                        {moving === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {/* Convert */}
                    {(lead.stage === "negotiation" || lead.stage === "won") && (
                      <button
                        onClick={() => handleConvert(lead)}
                        disabled={converting === lead.id || lead.stage === "won"}
                        title="Convert to client"
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer disabled:opacity-40">
                        {converting === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {/* Proposal */}
                    {!["won", "lost"].includes(lead.stage) && (
                      <button
                        onClick={() => { setProposalLead(lead); setProposalType("email"); setProposalCopied(false); }}
                        title="Send proposal"
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all cursor-pointer">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(lead)}
                      title="Edit"
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(lead)}
                      title="Delete"
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Drawer ── */}
      {editLead && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setEditLead(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-[#1f1f1f] z-50 shadow-2xl flex flex-col">
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-[#303030] flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-[#9999a8] uppercase tracking-widest">Leads Pipeline</p>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Edit — {editLead.name}</h2>
              </div>
              <button onClick={() => setEditLead(null)}
                className="h-8 w-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-[#303030]">Lead Info</p>
                  <div className="space-y-3">
                    <div><label className={LABEL}>Company / Name *</label><input required value={editForm.name} onChange={e => ef({ name: e.target.value })} className={INPUT} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL}>Service</label>
                        <select value={editForm.service} onChange={e => ef({ service: e.target.value as any })} className={SELECT}>
                          {SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div><label className={LABEL}>Stage</label>
                        <select value={editForm.stage} onChange={e => ef({ stage: e.target.value as StageId })} className={SELECT}>
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL}>Est. Monthly Value (₹)</label><input type="number" value={editForm.estimatedValue} onChange={e => ef({ estimatedValue: e.target.value })} placeholder="5000" className={INPUT} /></div>
                      <div><label className={LABEL}>Source</label>
                        <select value={editForm.source} onChange={e => ef({ source: e.target.value })} className={SELECT}>
                          <option value="">Unknown</option>
                          {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-[#303030]">Contact Person</p>
                  <div className="space-y-3">
                    <div><label className={LABEL}>Contact Name</label><input value={editForm.contactName} onChange={e => ef({ contactName: e.target.value })} placeholder="Rohan Mehta" className={INPUT} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL}>WhatsApp / Phone</label><input value={editForm.contactPhone} onChange={e => ef({ contactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} /></div>
                      <div><label className={LABEL}>Email</label><input type="email" value={editForm.contactEmail} onChange={e => ef({ contactEmail: e.target.value })} placeholder="rohan@brand.com" className={INPUT} /></div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-[#303030]">Assignment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Assigned To</label>
                      <select value={editForm.assignedTo} onChange={e => ef({ assignedTo: e.target.value })} className={SELECT}>
                        <option value="">Unassigned</option>
                        {roster.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div><label className={LABEL}>Follow-up Date</label><input type="date" value={editForm.followUpDate} onChange={e => ef({ followUpDate: e.target.value })} className={INPUT} /></div>
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => ef({ notes: e.target.value })} rows={3}
                    className="w-full rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#303030] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all resize-none" />
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-[#303030] flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditLead(null)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editing} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold min-w-[130px] justify-center">
                  {editing ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Save Changes</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Proposal Modal ── */}
      {proposalLead && proposal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setProposalLead(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1f1f1f] rounded-[20px] border border-slate-200/80 dark:border-[#303030] shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
              <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-[#303030] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-[#9999a8] uppercase tracking-widest">Proposal</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{proposalLead.name}</h2>
                </div>
                <button onClick={() => setProposalLead(null)}
                  className="h-8 w-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="shrink-0 px-6 pt-4 flex items-center gap-2">
                {(["email", "whatsapp"] as const).map(t => (
                  <button key={t} onClick={() => { setProposalType(t); setProposalCopied(false); }}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer",
                      proposalType === t
                        ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                        : "bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-[#303030] text-slate-600 dark:text-[#9999a8] hover:border-[#3b82f6]"
                    )}>
                    {t === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    {t === "email" ? "Email" : "WhatsApp"}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {proposalType === "email" && proposal.subject && (
                  <div className="rounded-2xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030] px-4 py-2.5">
                    <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-0.5">Subject</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">{proposal.subject}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 dark:border-[#303030] bg-slate-50 dark:bg-[#303030] px-4 py-3">
                  <p className="text-[9px] font-bold text-[#9999a8] uppercase tracking-widest mb-2">Message</p>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{proposal.body}</pre>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-[#303030] flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copyText(proposalType === "email" ? `Subject: ${proposal.subject}\n\n${proposal.body}` : proposal.body, setProposalCopied)}
                  className={cn("flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer",
                    proposalCopied
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      : "bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-[#303030] text-slate-700 dark:text-[#9999a8] hover:border-[#3b82f6]"
                  )}>
                  {proposalCopied ? <><CheckCircle2 className="h-3.5 w-3.5" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy text</>}
                </button>
                {proposalType === "email" && proposalLead.contactEmail && (
                  <a href={`mailto:${proposalLead.contactEmail}?subject=${encodeURIComponent(proposal.subject)}&body=${encodeURIComponent(proposal.body)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border bg-white dark:bg-[#1f1f1f] border-slate-200 dark:border-[#303030] text-slate-700 dark:text-[#9999a8] hover:border-[#3b82f6] transition-all">
                    <ExternalLink className="h-3.5 w-3.5" />Open in Gmail
                  </a>
                )}
                {proposalType === "whatsapp" && proposalLead.contactPhone && (
                  <a href={`https://wa.me/${(proposalLead.contactPhone as string).replace(/\D/g, "")}?text=${encodeURIComponent(proposal.body)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500 transition-all">
                    <MessageCircle className="h-3.5 w-3.5" />Send on WhatsApp
                  </a>
                )}
                <button
                  onClick={() => { const next = STAGE_ORDER[STAGE_ORDER.indexOf(proposalLead.stage) + 1]; if (next) handleMove(proposalLead, next); setProposalLead(null); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white border border-[#3b82f6] transition-all cursor-pointer">
                  <Send className="h-3.5 w-3.5" />Mark as Proposal Sent
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
