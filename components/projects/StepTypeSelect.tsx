"use client";
import { Megaphone, Code2, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { INPUT, LABEL, SELECT } from "./formStyles";
import type { AddProjectFormState, ProjectKind } from "./useAddProjectForm";

const TYPE_CARDS: { kind: ProjectKind; label: string; Icon: any; accent: string; description: string }[] = [
  { kind: "meta_ads", label: "Meta Ads", Icon: Megaphone, accent: "from-indigo-500 to-indigo-600", description: "Ad campaigns, retainer billing, KPI tracking." },
  { kind: "web_dev", label: "Website Dev", Icon: Code2, accent: "from-emerald-500 to-teal-500", description: "Build or manage a site — budget, stack, timeline." },
  { kind: "agency", label: "Agency / Internal", Icon: Sparkles, accent: "from-brand-500 to-brand-600", description: "Our own work — no client, no external billing." },
];

interface Client { id: number; name: string; details?: string }

export function StepTypeSelect({
  form, f, clients, canCreateClient,
}: {
  form: AddProjectFormState;
  f: (patch: Partial<AddProjectFormState>) => void;
  clients: Client[];
  canCreateClient: boolean;
}) {
  const showClientPicker = form.kind === "meta_ads" || form.kind === "web_dev";

  return (
    <div className="space-y-6">
      <div>
        <label className={LABEL}>Project Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {TYPE_CARDS.map(({ kind, label, Icon, accent, description }) => {
            const active = form.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => f({ kind, agencyFlavor: "", clientId: "", clientMode: "existing" })}
                className={cn(
                  "text-left rounded-[20px] border p-4 min-h-[44px] transition-all cursor-pointer",
                  active
                    ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/30"
                    : "border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] hover:border-slate-300 dark:hover:border-[#4a4a4a]"
                )}
              >
                <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", accent)}>
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {form.kind === "agency" && (
        <div>
          <label className={LABEL}>What kind of work is this?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => f({ agencyFlavor: "meta_ads" })}
              className={cn(
                "h-11 rounded-2xl border text-sm font-bold transition-all cursor-pointer",
                form.agencyFlavor === "meta_ads"
                  ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400"
                  : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"
              )}
            >
              Meta Ads
            </button>
            <button
              type="button"
              onClick={() => f({ agencyFlavor: "web_dev" })}
              className={cn(
                "h-11 rounded-2xl border text-sm font-bold transition-all cursor-pointer",
                form.agencyFlavor === "web_dev"
                  ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400"
                  : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"
              )}
            >
              Website Dev
            </button>
          </div>
        </div>
      )}

      {showClientPicker && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={cn(LABEL, "mb-0")}>Client</label>
            <div className="flex rounded-full border border-slate-200 dark:border-[#303030] p-0.5">
              <button
                type="button"
                onClick={() => f({ clientMode: "existing" })}
                className={cn(
                  "px-3 h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer",
                  form.clientMode === "existing" ? "bg-brand-600 text-white" : "text-slate-500"
                )}
              >
                Existing
              </button>
              {canCreateClient && (
                <button
                  type="button"
                  onClick={() => f({ clientMode: "new" })}
                  className={cn(
                    "px-3 h-7 rounded-full text-[11px] font-bold transition-all cursor-pointer",
                    form.clientMode === "new" ? "bg-brand-600 text-white" : "text-slate-500"
                  )}
                >
                  + New Client
                </button>
              )}
            </div>
          </div>

          {form.clientMode === "existing" ? (
            <select value={form.clientId} onChange={e => f({ clientId: e.target.value })} className={SELECT}>
              <option value="">Select a client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div className="space-y-3 p-4 rounded-[20px] bg-brand-500/5 border border-brand-500/10">
              <div>
                <label className={LABEL}>Brand / Company Name *</label>
                <input value={form.newClientName} onChange={e => f({ newClientName: e.target.value })} placeholder="e.g. Client company" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Contact Name</label>
                  <input value={form.newClientContactName} onChange={e => f({ newClientContactName: e.target.value })} placeholder="e.g. Pepper Potts" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Phone / WhatsApp</label>
                  <input value={form.newClientContactPhone} onChange={e => f({ newClientContactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className={LABEL}>Project Name *</label>
        <input required value={form.name} onChange={e => f({ name: e.target.value })} placeholder="e.g. Q3 Website Revamp" className={INPUT} />
      </div>
    </div>
  );
}

export function isStepTypeValid(form: AddProjectFormState): boolean {
  if (!form.kind) return false;
  if (form.kind === "agency" && !form.agencyFlavor) return false;
  if (form.kind === "meta_ads" || form.kind === "web_dev") {
    if (form.clientMode === "existing" && !form.clientId) return false;
    if (form.clientMode === "new" && !form.newClientName.trim()) return false;
  }
  if (!form.name.trim()) return false;
  return true;
}
