"use client";
import { Globe, Database, Boxes } from "lucide-react";
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-[#303030] bg-white dark:bg-[#1f1f1f] cursor-pointer"
    >
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <span className={`h-5 w-9 rounded-full transition-colors relative ${checked ? "bg-brand-600" : "bg-slate-200 dark:bg-[#3a3a3a]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

export function StepWebDev({ form, f }: { form: AddProjectFormState; f: (patch: Partial<AddProjectFormState>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={Globe} label="Site Basics" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Website Type</label>
              <select value={form.websiteType} onChange={e => f({ websiteType: e.target.value })} className={SELECT}>
                <option value="landing_page">Landing Page</option>
                <option value="business_site">Business Site</option>
                <option value="ecommerce">E-commerce</option>
                <option value="web_app">Web App</option>
                <option value="portfolio">Portfolio</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Platform / Stack</label>
              <input value={form.platform} onChange={e => f({ platform: e.target.value })} placeholder="e.g. Next.js, WordPress, Shopify" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Setup Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => f({ setupType: "new" })}
                className={`h-11 rounded-2xl border text-sm font-bold cursor-pointer ${form.setupType === "new" ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400" : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"}`}>
                New Build
              </button>
              <button type="button" onClick={() => f({ setupType: "existing" })}
                className={`h-11 rounded-2xl border text-sm font-bold cursor-pointer ${form.setupType === "existing" ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400" : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"}`}>
                Existing Site
              </button>
            </div>
          </div>
          {form.setupType === "existing" && (
            <div>
              <label className={LABEL}>Old Website URL</label>
              <input value={form.oldWebsiteUrl} onChange={e => f({ oldWebsiteUrl: e.target.value })} placeholder="https://old-site.com" className={INPUT} />
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader icon={Database} label="Domain & Hosting" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Domain</label>
              <input value={form.domain} onChange={e => f({ domain: e.target.value })} placeholder="example.com" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Domain Expiry</label>
              <input type="date" value={form.domainExpiry} onChange={e => f({ domainExpiry: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Hosting Provider</label>
              <input value={form.hostingProvider} onChange={e => f({ hostingProvider: e.target.value })} placeholder="e.g. Hostinger, Vercel" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Hosting Expiry</label>
              <input type="date" value={form.hostingExpiry} onChange={e => f({ hostingExpiry: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Repository Link</label>
            <input value={form.repoLink} onChange={e => f({ repoLink: e.target.value })} placeholder="https://github.com/org/repo" className={INPUT} />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">Uptime, response time, and live status appear on the Website Dev dashboard once monitoring is connected — this project starts in a clean &quot;not yet monitored&quot; state.</p>
        </div>
      </div>

      <div>
        <SectionHeader icon={Boxes} label="Scope" />
        <div className="space-y-3">
          <ToggleRow label="CMS Needed" checked={form.cmsNeeded} onChange={v => f({ cmsNeeded: v })} />
          <ToggleRow label="Admin Panel Needed" checked={form.adminPanelNeeded} onChange={v => f({ adminPanelNeeded: v })} />
          <ToggleRow label="Database Needed" checked={form.dbNeeded} onChange={v => f({ dbNeeded: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Number of Pages</label>
              <input type="number" min={0} value={form.numPages} onChange={e => f({ numPages: e.target.value })} placeholder="e.g. 8" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Target Launch Date</label>
              <input type="date" value={form.launchDate} onChange={e => f({ launchDate: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Integrations</label>
            <input value={form.integrations} onChange={e => f({ integrations: e.target.value })} placeholder="e.g. Stripe, Mailchimp, Zapier" className={INPUT} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Brand Assets</label>
              <input value={form.brandAssets} onChange={e => f({ brandAssets: e.target.value })} placeholder="Drive/Figma link" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Content Assets</label>
              <input value={form.contentAssets} onChange={e => f({ contentAssets: e.target.value })} placeholder="Drive/Docs link" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Reference Links</label>
            <input value={form.referenceLinks} onChange={e => f({ referenceLinks: e.target.value })} placeholder="Sites they like, inspiration links" className={INPUT} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function isStepWebDevValid(_form: AddProjectFormState): boolean {
  return true;
}
