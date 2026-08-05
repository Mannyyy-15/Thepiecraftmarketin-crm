"use client";
import { DollarSign, FileText, ShieldCheck } from "lucide-react";
import { INPUT, LABEL, SELECT, TEXTAREA } from "./formStyles";
import type { AddProjectFormState } from "./useAddProjectForm";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-6 w-6 rounded-xl bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-[#303030]" />
    </div>
  );
}

export function StepBilling({
  form, f, isMetaAds,
}: {
  form: AddProjectFormState;
  f: (patch: Partial<AddProjectFormState>) => void;
  isMetaAds: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={DollarSign} label="Budget & Billing" />
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Billing Model</label>
            <select value={form.billingModel} onChange={e => f({ billingModel: e.target.value as any })} className={SELECT}>
              <option value="fixed_fee">Fixed Fee (project)</option>
              <option value="retainer">Retainer (recurring)</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isMetaAds ? (
              <>
                <div>
                  <label className={LABEL}>Management Fee / mo</label>
                  <input type="number" min={0} value={form.monthlyFee} onChange={e => f({ monthlyFee: e.target.value })} placeholder="0" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Ad Spend Budget / mo</label>
                  <input type="number" min={0} value={form.adSpendBudget} onChange={e => f({ adSpendBudget: e.target.value })} placeholder="0" className={INPUT} />
                </div>
              </>
            ) : (
              <div>
                <label className={LABEL}>Total Budget</label>
                <input type="number" min={0} value={form.budget} onChange={e => f({ budget: e.target.value })} placeholder="0" className={INPUT} />
              </div>
            )}
            <div>
              <label className={LABEL}>Billing Cycle Start</label>
              <input type="date" value={form.billingCycleStart} onChange={e => f({ billingCycleStart: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Contract Duration (months)</label>
            <input type="number" min={0} value={form.contractDuration} onChange={e => f({ contractDuration: e.target.value })} placeholder="e.g. 6" className={INPUT} />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader icon={FileText} label="Contract & Access" />
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Contract / SOW Link</label>
            <input value={form.contractLink} onChange={e => f({ contractLink: e.target.value })} placeholder="https://…" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Client Contact Name</label>
              <input value={form.clientContactName} onChange={e => f({ clientContactName: e.target.value })} placeholder="Point of contact" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Client Contact Phone</label>
              <input value={form.clientContactPhone} onChange={e => f({ clientContactPhone: e.target.value })} placeholder="+91 98765 43210" className={INPUT} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => f({ accessGranted: !form.accessGranted })}
            className="flex items-center justify-between w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] cursor-pointer"
          >
            <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Client Access Granted
            </span>
            <span className={`h-5 w-9 rounded-full transition-colors relative ${form.accessGranted ? "bg-brand-600" : "bg-slate-200 dark:bg-[#3a3a3a]"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.accessGranted ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className={LABEL}>Strategy Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => f({ notes: e.target.value })} placeholder="Brief, context, anything worth remembering about this engagement…" className={TEXTAREA} />
      </div>
    </div>
  );
}

export function isStepBillingValid(_form: AddProjectFormState): boolean {
  return true;
}
