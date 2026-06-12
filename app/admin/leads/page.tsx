"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/providers/ToastProvider";
import {
  updateLead, deleteLead, moveLeadStage, convertLeadToClient, getTeamUsers, getLeads,
} from "@/app/actions/crm";
import {
  Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Code2, Copy, IndianRupee, Edit2, ExternalLink, FileText, Link2,
  Loader2, Mail, Megaphone, MessageCircle, Phone, Send, Star,
  Target, TrendingUp, Trash2, UserCheck, X, Zap, ChevronDown,
  Globe, Webhook, Info,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { KanbanSkeleton, Skeleton } from "@/components/ui/Skeleton";
import InboundLeads from "@/components/InboundLeads";

// ── stage / service config ────────────────────────────────────────────────────
const STAGES = [
  { id: "new",         label: "New Lead",      color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-950/30",   border: "border-indigo-200 dark:border-indigo-800/40",  dot: "bg-indigo-500",  strip: "bg-indigo-500"  },
  { id: "contacted",   label: "Contacted",     color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800/40",      dot: "bg-blue-500",    strip: "bg-blue-500"    },
  { id: "proposal",    label: "Proposal Sent", color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800/40",  dot: "bg-violet-500",  strip: "bg-violet-500"  },
  { id: "negotiation", label: "Negotiating",   color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800/40",    dot: "bg-amber-500",   strip: "bg-amber-500"   },
  { id: "won",         label: "Won",           color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40", dot: "bg-emerald-500", strip: "bg-emerald-500" },
  { id: "lost",        label: "Lost",          color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30",       border: "border-rose-200 dark:border-rose-800/40",      dot: "bg-rose-500",    strip: "bg-rose-500"    },
] as const;

type StageId = (typeof STAGES)[number]["id"];

const SERVICES = [
  { id: "meta_ads", label: "Meta Ads",  icon: Megaphone, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40" },
  { id: "web_dev",  label: "Web Dev",   icon: Code2,     color: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800/40" },
  { id: "both",     label: "Both",      icon: Star,      color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40" },
  { id: "other",    label: "Other",     icon: Zap,       color: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700" },
];

const SOURCES = ["referral", "social_media", "cold_outreach", "inbound", "event", "website", "instagram", "facebook", "other"];

const INPUT  = "h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all";
const SELECT = "h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white cursor-pointer transition-all";
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
      body: `Dear ${name},

Thank you for your interest in ThePieCraft's digital marketing services. We're excited about the opportunity to work with ${lead.name}.

Following our conversation, here is our tailored proposal:

SERVICE SCOPE
${desc}

ESTIMATED INVESTMENT
${value}

WHAT YOU GET
• Dedicated account manager
• Monthly strategy calls
• Transparent reporting dashboard
• Creative assets & copy included
• WhatsApp support during business hours

NEXT STEPS
We'd love to schedule a 30-minute call to walk you through the proposal in detail and answer any questions.

📞 Reply to this email or WhatsApp us directly to book your call.

Looking forward to growing your business together.

Warm regards,
ThePieCraft Marketing Team
📧 hello@thepiecraft.com
🌐 thepiecraft.com`,
    };
  }

  // WhatsApp
  return {
    subject: "",
    body: `Hi ${name}! 👋

Thank you for your interest in ThePieCraft. Here's a quick overview of what we can do for *${lead.name}*:

*Service:* ${service.label}
*Investment:* ${value}

*What's included:*
✅ Dedicated account manager
✅ Monthly strategy & reporting
✅ Creative assets included
✅ WhatsApp support

Would you like to hop on a quick 15-min call to discuss? Just reply here 📲

— ThePieCraft Team
🌐 thepiecraft.com`,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter();
  const { toast, confirmDialog } = useToast();

  const [leads, setLeads]     = useState<any[]>([]);
  const [roster, setRoster]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving]   = useState<number | null>(null);
  const [converting, setConverting] = useState<number | null>(null);

  // edit drawer
  const [editLead, setEditLead] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_EDIT });
  const [editing, setEditing]   = useState(false);

  // proposal modal
  const [proposalLead, setProposalLead]   = useState<any>(null);
  const [proposalType, setProposalType]   = useState<"email" | "whatsapp">("email");
  const [proposalCopied, setProposalCopied] = useState(false);

  // integrations panel
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [copiedUrl, setCopiedUrl]   = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // search
  const [search, setSearch] = useState("");

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
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.name || "").toLowerCase().includes(q)
      || (l.contactName || "").toLowerCase().includes(q)
      || (l.contactEmail || "").toLowerCase().includes(q);
  });

  const byStage = (stageId: string) => filtered.filter(l => l.stage === stageId);
  const totalPipeline = leads
    .filter(l => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + (l.estimatedValue || 0), 0);

  // ── handlers ─────────────────────────────────────────────────────────────
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

  const handleMove = async (lead: any, dir: 1 | -1) => {
    const idx  = STAGES.findIndex(s => s.id === lead.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    setMoving(lead.id);
    try {
      const r = await moveLeadStage(lead.id, next.id);
      if (r.success) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: next.id } : l));
      } else toast(r.error || "Failed.", "error");
    } finally { setMoving(null); }
  };

  const handleDelete = async (lead: any) => {
    if (!await confirmDialog(`Delete lead "${lead.name}"?`)) return;
    const r = await deleteLead(lead.id);
    if (r.success) { setLeads(prev => prev.filter(l => l.id !== lead.id)); toast("Lead deleted.", "info"); }
    else toast(r.error || "Failed.", "error");
  };

  const handleConvert = async (lead: any) => {
    if (!await confirmDialog(`Convert "${lead.name}" to a client? This will create a new client profile.`)) return;
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
      name: lead.name || "",
      contactName: lead.contactName || "",
      contactPhone: lead.contactPhone || "",
      contactEmail: lead.contactEmail || "",
      source: lead.source || "",
      service: lead.service || "meta_ads",
      stage: lead.stage || "new",
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
      notes: lead.notes || "",
      assignedTo: lead.assignedTo ? String(lead.assignedTo) : "",
      followUpDate: lead.followUpDate || "",
    });
    setEditLead(lead);
  };

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // ── lead card ─────────────────────────────────────────────────────────────
  const LeadCard = ({ lead }: { lead: any }) => {
    const svc = serviceInfo(lead.service);
    const SvcIcon = svc.icon;
    const stage = stageInfo(lead.stage);
    const stageIdx = STAGES.findIndex(s => s.id === lead.stage);
    const assignee = roster.find(u => u.id === lead.assignedTo);
    const days = daysSince(lead.createdAt);
    const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date();

    return (
      <div className="group rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden">
        <div className={cn("h-0.5 w-full", stage.strip)} />
        <div className="p-3.5">
          {/* header */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{lead.name}</p>
              {lead.contactName && (
                <p className="text-[10px] text-slate-400 truncate">{lead.contactName}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(lead)} title="Edit"
                className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all cursor-pointer">
                <Edit2 className="h-3 w-3" />
              </button>
              <button onClick={() => handleDelete(lead)} title="Delete"
                className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* service + value */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", svc.color)}>
              <SvcIcon className="h-2.5 w-2.5" />{svc.label}
            </span>
            {(lead.estimatedValue || 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
                <IndianRupee className="h-2.5 w-2.5" />{Number(lead.estimatedValue).toLocaleString()}/mo
              </span>
            )}
            {lead.source && (
              <span className="text-[9px] text-slate-400 capitalize">{(lead.source as string).replace(/_/g, " ")}</span>
            )}
          </div>

          {/* contact */}
          {(lead.contactPhone || lead.contactEmail) && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {lead.contactPhone && (
                <a href={`https://wa.me/${(lead.contactPhone as string).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 hover:underline">
                  <Phone className="h-2.5 w-2.5" />{lead.contactPhone}
                </a>
              )}
              {lead.contactEmail && (
                <a href={`mailto:${lead.contactEmail}`}
                  className="inline-flex items-center gap-1 text-[9px] text-slate-400 hover:underline truncate max-w-[120px]">
                  <Mail className="h-2.5 w-2.5" />{lead.contactEmail}
                </a>
              )}
            </div>
          )}

          {/* follow-up */}
          {lead.followUpDate && (
            <div className={cn("inline-flex items-center gap-1 text-[9px] font-semibold mb-2.5 px-1.5 py-0.5 rounded border",
              isOverdue
                ? "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40"
                : "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700")}>
              <Calendar className="h-2.5 w-2.5" />
              {isOverdue ? "Overdue: " : "Follow up: "}{lead.followUpDate}
            </div>
          )}

          {/* notes */}
          {lead.notes && (
            <p className="text-[10px] text-slate-400 line-clamp-2 mb-2.5 italic">&ldquo;{lead.notes}&rdquo;</p>
          )}

          {/* Send Proposal button */}
          {!["won", "lost"].includes(lead.stage) && (
            <button
              onClick={() => { setProposalLead(lead); setProposalType("email"); setProposalCopied(false); }}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 bg-brand-50/60 dark:bg-brand-950/20 hover:bg-brand-100 dark:hover:bg-brand-950/40 rounded-lg py-1.5 mb-2.5 transition-all cursor-pointer">
              <Send className="h-2.5 w-2.5" />Send Proposal
            </button>
          )}

          {/* footer */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              {assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={assignee.name} size="xs" />
                  <span className="text-[9px] font-semibold text-slate-500">{assignee.name.split(" ")[0]}</span>
                </div>
              ) : (
                <span className="text-[9px] text-slate-400">Unassigned</span>
              )}
              <span className="text-[9px] text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[9px] text-slate-400">{days}d ago</span>
            </div>
            <div className="flex items-center gap-1">
              {stageIdx > 0 && !["won", "lost"].includes(lead.stage) && (
                <button onClick={() => handleMove(lead, -1)} disabled={moving === lead.id}
                  className="h-5 w-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40">
                  <ChevronLeft className="h-3 w-3" />
                </button>
              )}
              {stageIdx < STAGES.length - 1 && lead.stage !== "lost" && (
                <button onClick={() => handleMove(lead, 1)} disabled={moving === lead.id}
                  className="h-5 w-5 rounded flex items-center justify-center text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all cursor-pointer disabled:opacity-40">
                  {moving === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              {(lead.stage === "negotiation" || lead.stage === "won") && (
                <button onClick={() => handleConvert(lead)} disabled={converting === lead.id || lead.stage === "won"}
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-0.5 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default ml-1">
                  {converting === lead.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <UserCheck className="h-2.5 w-2.5" />}
                  {lead.stage === "won" ? "Converted" : "Convert"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────
  const wonCount    = leads.filter(l => l.stage === "won").length;
  const lostCount   = leads.filter(l => l.stage === "lost").length;
  const activeCount = leads.filter(l => !["won", "lost"].includes(l.stage)).length;

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

  const proposal = proposalLead ? buildProposal(proposalLead, proposalType) : null;

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sales</p>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Leads Pipeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="h-9 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all" />
          <button
            onClick={() => setShowIntegrations(v => !v)}
            className={cn(
              "h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              showIntegrations
                ? "bg-brand-600 border-brand-600 text-white"
                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600"
            )}>
            <Webhook className="h-3.5 w-3.5" />Integrations
            <ChevronDown className={cn("h-3 w-3 transition-transform", showIntegrations && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* ── Inbound leads from the inquiry sheet ──────────────────────────── */}
      <InboundLeads />

      {/* ── Integrations panel ────────────────────────────────────────────── */}
      {showIntegrations && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-800/40 bg-brand-50/40 dark:bg-brand-950/10 p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
              <Webhook className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connect Your Lead Sources</h3>
              <p className="text-xs text-slate-500 mt-0.5">POST to this endpoint from your website contact form, Typeform, Jotform, Meta Lead Ads, or any automation tool. Leads appear instantly in the pipeline.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Webhook URL */}
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />Webhook URL (POST)
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                <code className="text-[10px] text-brand-600 dark:text-brand-400 flex-1 break-all font-mono">{WEBHOOK_URL}</code>
                <button onClick={() => copyText(WEBHOOK_URL, setCopiedUrl)}
                  className="shrink-0 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer">
                  {copiedUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {[
                  { icon: Globe, label: "Website contact form" },
                  { icon: Megaphone, label: "Meta Lead Ads webhook" },
                  { icon: MessageCircle, label: "Instagram / ManyChat" },
                  { icon: FileText, label: "Typeform / Jotform" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-[10px] text-slate-500">
                    <item.icon className="h-3 w-3 text-slate-400 shrink-0" />{item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* JSON payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="h-3 w-3" />JSON Payload
                </p>
                <button onClick={() => copyText(jsonExample, setCopiedJson)}
                  className="text-[9px] font-semibold text-slate-400 hover:text-brand-600 flex items-center gap-1 cursor-pointer">
                  {copiedJson ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </button>
              </div>
              <pre className="bg-slate-900 dark:bg-black text-emerald-400 text-[9px] rounded-xl p-3 overflow-x-auto font-mono leading-relaxed border border-slate-800 whitespace-pre-wrap">{jsonExample}</pre>
            </div>

            {/* Embed form */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Code2 className="h-3 w-3" />HTML Embed Form
                </p>
                <button onClick={() => copyText(embedCode, setCopiedEmbed)}
                  className="text-[9px] font-semibold text-slate-400 hover:text-brand-600 flex items-center gap-1 cursor-pointer">
                  {copiedEmbed ? <><CheckCircle2 className="h-3 w-3 text-emerald-500" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                </button>
              </div>
              <pre className="bg-slate-900 dark:bg-black text-sky-400 text-[9px] rounded-xl p-3 overflow-x-auto font-mono leading-relaxed border border-slate-800 whitespace-pre-wrap">{embedCode}</pre>
              <p className="text-[9px] text-slate-400 flex items-center gap-1">
                <Info className="h-2.5 w-2.5 shrink-0" />
                Replace <code className="text-brand-500">YOUR_TOKEN_HERE</code> with your <code className="text-brand-500">LEADS_SUBMIT_TOKEN</code> env var value.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Leads",   value: activeCount,                              color: "text-slate-800 dark:text-white",          icon: Target      },
          { label: "Pipeline Value", value: `₹${totalPipeline.toLocaleString()}/mo`,  color: "text-emerald-600 dark:text-emerald-400",  icon: TrendingUp  },
          { label: "Won",            value: wonCount,                                 color: "text-emerald-600 dark:text-emerald-400",  icon: CheckCircle2 },
          { label: "Lost",           value: lostCount,                                color: "text-rose-500",                           icon: X           },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</p>
              <p className={cn("text-2xl font-extrabold mt-0.5 leading-none", k.color)}>{k.value}</p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <k.icon className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Kanban board ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          <KanbanSkeleton columns={6} cardsPerColumn={2} />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center">
            <Webhook className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No leads yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Leads will appear here automatically when someone submits your website form, Instagram ad, or any connected form.</p>
          </div>
          <button onClick={() => setShowIntegrations(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 bg-brand-50 dark:bg-brand-950/20 hover:bg-brand-100 px-4 py-2 rounded-xl transition-all cursor-pointer">
            <Webhook className="h-3.5 w-3.5" />Set up integrations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STAGES.map(stage => {
            const stageLeads = byStage(stage.id);
            const stageValue = stageLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0);
            return (
              <div key={stage.id} className="flex flex-col gap-2">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border", stage.bg, stage.border)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", stage.dot)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider truncate", stage.color)}>{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {stageValue > 0 && (
                      <span className={cn("text-[9px] font-bold", stage.color)}>${(stageValue / 1000).toFixed(1)}k</span>
                    )}
                    <span className={cn("text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center", stage.bg, stage.color)}>
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {stageLeads.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 flex items-center justify-center">
                    <p className="text-[10px] text-slate-300 dark:text-slate-700 font-medium">No leads</p>
                  </div>
                ) : (
                  stageLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Drawer ───────────────────────────────────────────────────── */}
      {editLead && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditLead(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col">
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leads Pipeline</p>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Edit — {editLead.name}</h2>
              </div>
              <button onClick={() => setEditLead(null)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Lead Info</p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Company / Name *</label>
                      <input required value={editForm.name} onChange={e => ef({ name: e.target.value })} className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Service Interest</label>
                        <select value={editForm.service} onChange={e => ef({ service: e.target.value as any })} className={SELECT}>
                          {SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Stage</label>
                        <select value={editForm.stage} onChange={e => ef({ stage: e.target.value as StageId })} className={SELECT}>
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Est. Monthly Value ($)</label>
                        <input type="number" value={editForm.estimatedValue} onChange={e => ef({ estimatedValue: e.target.value })} placeholder="5000" className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Source</label>
                        <select value={editForm.source} onChange={e => ef({ source: e.target.value })} className={SELECT}>
                          <option value="">Unknown</option>
                          {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Contact Person</p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Contact Name</label>
                      <input value={editForm.contactName} onChange={e => ef({ contactName: e.target.value })} placeholder="Rohan Mehta" className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>WhatsApp / Phone</label>
                        <input value={editForm.contactPhone} onChange={e => ef({ contactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Email</label>
                        <input type="email" value={editForm.contactEmail} onChange={e => ef({ contactEmail: e.target.value })} placeholder="rohan@brand.com" className={INPUT} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-100 dark:border-slate-800">Assignment</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Assigned To</label>
                      <select value={editForm.assignedTo} onChange={e => ef({ assignedTo: e.target.value })} className={SELECT}>
                        <option value="">Unassigned</option>
                        {roster.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Follow-up Date</label>
                      <input type="date" value={editForm.followUpDate} onChange={e => ef({ followUpDate: e.target.value })} className={INPUT} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => ef({ notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white placeholder:text-slate-400 transition-all resize-none" />
                </div>
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditLead(null)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editing}
                  className="bg-brand-600 text-white font-bold min-w-[130px] justify-center">
                  {editing ? "Saving…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Save Changes</>}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ── Proposal Modal ────────────────────────────────────────────────── */}
      {proposalLead && proposal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setProposalLead(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
              {/* modal header */}
              <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposal</p>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{proposalLead.name}</h2>
                </div>
                <button onClick={() => setProposalLead(null)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* type toggle */}
              <div className="shrink-0 px-6 pt-4 flex items-center gap-2">
                {(["email", "whatsapp"] as const).map(t => (
                  <button key={t} onClick={() => { setProposalType(t); setProposalCopied(false); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                      proposalType === t
                        ? "bg-brand-600 border-brand-600 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400"
                    )}>
                    {t === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    {t === "email" ? "Email" : "WhatsApp"}
                  </button>
                ))}
              </div>

              {/* proposal preview */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {proposalType === "email" && proposal.subject && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Subject</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">{proposal.subject}</p>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message</p>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{proposal.body}</pre>
                </div>
              </div>

              {/* actions */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copyText(
                    proposalType === "email" ? `Subject: ${proposal.subject}\n\n${proposal.body}` : proposal.body,
                    setProposalCopied
                  )}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                    proposalCopied
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-400"
                  )}>
                  {proposalCopied ? <><CheckCircle2 className="h-3.5 w-3.5" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy text</>}
                </button>

                {proposalType === "email" && proposalLead.contactEmail && (
                  <a href={`mailto:${proposalLead.contactEmail}?subject=${encodeURIComponent(proposal.subject)}&body=${encodeURIComponent(proposal.body)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-400 transition-all">
                    <ExternalLink className="h-3.5 w-3.5" />Open in Gmail
                  </a>
                )}

                {proposalType === "whatsapp" && proposalLead.contactPhone && (
                  <a href={`https://wa.me/${(proposalLead.contactPhone as string).replace(/\D/g, "")}?text=${encodeURIComponent(proposal.body)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500 transition-all">
                    <MessageCircle className="h-3.5 w-3.5" />Send on WhatsApp
                  </a>
                )}

                <button
                  onClick={() => {
                    handleMove(proposalLead, 1);
                    setProposalLead(null);
                  }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white border border-brand-600 transition-all cursor-pointer">
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
