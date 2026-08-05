"use client";
import { Target, BarChart3 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { INPUT, LABEL, SELECT } from "./formStyles";
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

export function StepMetaAds({ form, f }: { form: AddProjectFormState; f: (patch: Partial<AddProjectFormState>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Target} label="Campaign Setup" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Ad Account ID</label>
              <input value={form.adAccountId} onChange={e => f({ adAccountId: e.target.value })} placeholder="act_123456789" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Business Manager ID</label>
              <input value={form.businessManagerId} onChange={e => f({ businessManagerId: e.target.value })} placeholder="123456789" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Pixel ID</label>
              <input value={form.pixelId} onChange={e => f({ pixelId: e.target.value })} placeholder="Meta Pixel ID" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Conversion Location</label>
              <select value={form.conversionLocation} onChange={e => f({ conversionLocation: e.target.value })} className={SELECT}>
                <option value="website">Website</option>
                <option value="app">App</option>
                <option value="calls">Calls</option>
                <option value="messaging_apps">Messaging Apps</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Landing Page URL</label>
            <input value={form.landingPage} onChange={e => f({ landingPage: e.target.value })} placeholder="https://example.com/offer" className={INPUT} />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader icon={BarChart3} label="Objective & KPI" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Objective</label>
              <select value={form.objective} onChange={e => f({ objective: e.target.value })} className={SELECT}>
                <option value="leads">Leads</option>
                <option value="sales">Sales / Conversions</option>
                <option value="traffic">Traffic</option>
                <option value="awareness">Awareness</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Primary KPI</label>
              <select value={form.primaryKpi} onChange={e => f({ primaryKpi: e.target.value })} className={SELECT}>
                <option value="CPL">CPL (Cost per Lead)</option>
                <option value="ROAS">ROAS</option>
                <option value="CPA">CPA (Cost per Acquisition)</option>
                <option value="CTR">CTR</option>
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Target KPI Value</label>
            <input type="number" min={0} value={form.targetKpiValue} onChange={e => f({ targetKpiValue: e.target.value })} placeholder="e.g. 500" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Starter Campaign Name</label>
              <input value={form.metaCampaignName} onChange={e => f({ metaCampaignName: e.target.value })} placeholder={`${form.name || "Project"} — Launch Campaign`} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Campaign Status</label>
              <select value={form.metaCampaignStatus} onChange={e => f({ metaCampaignStatus: e.target.value as any })} className={SELECT}>
                <option value="draft">Draft — not yet running</option>
                <option value="active">Active — already live</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">This creates a starter campaign that shows up immediately on the Meta Ads dashboard. Add real spend/performance data there once it&apos;s running.</p>
        </div>
      </div>
    </div>
  );
}

export function isStepMetaAdsValid(_form: AddProjectFormState): boolean {
  return true; // all fields optional beyond project name (validated in StepTypeSelect)
}
