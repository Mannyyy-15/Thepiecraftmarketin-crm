"use client";
import { Pencil } from "lucide-react";
import type { AddProjectFormState } from "./useAddProjectForm";

interface Client { id: number; name: string }
interface TeamUser { id: number; name: string }

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 dark:text-white text-right break-words">{value}</span>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-slate-200 dark:border-[#303030] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-[#2a2a2a]">{children}</div>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { meta_ads: "Meta Ads", web_dev: "Website Dev", agency: "Agency / Internal" };

export function StepReview({
  form, clients, teamUsers, goToStep,
}: {
  form: AddProjectFormState;
  clients: Client[];
  teamUsers: TeamUser[];
  goToStep: (step: number) => void;
}) {
  const clientLabel = form.clientMode === "new"
    ? `${form.newClientName} (new)`
    : clients.find(c => String(c.id) === form.clientId)?.name || "—";
  const leadLabel = teamUsers.find(u => String(u.id) === form.leadId)?.name || "None";
  const teamLabel = form.teamMemberIds.map(id => teamUsers.find(u => u.id === id)?.name).filter(Boolean).join(", ") || "None";
  const isMetaAds = form.kind === "meta_ads" || (form.kind === "agency" && form.agencyFlavor === "meta_ads");
  const isWebDev = form.kind === "web_dev" || (form.kind === "agency" && form.agencyFlavor === "web_dev");
  const isAgency = form.kind === "agency";

  return (
    <div className="space-y-4">
      <ReviewSection title="Overview" onEdit={() => goToStep(0)}>
        <ReviewRow label="Type" value={KIND_LABEL[form.kind] + (isAgency ? ` — ${form.agencyFlavor === "meta_ads" ? "Meta Ads" : "Website Dev"}` : "")} />
        <ReviewRow label="Project Name" value={form.name} />
        {!isAgency && <ReviewRow label="Client" value={clientLabel} />}
      </ReviewSection>

      {isMetaAds && (
        <ReviewSection title="Campaign" onEdit={() => goToStep(1)}>
          <ReviewRow label="Objective" value={form.objective} />
          <ReviewRow label="Primary KPI" value={form.primaryKpi} />
          <ReviewRow label="Starter Campaign" value={form.metaCampaignName || `${form.name} — Launch Campaign`} />
          <ReviewRow label="Campaign Status" value={form.metaCampaignStatus} />
        </ReviewSection>
      )}
      {isWebDev && (
        <ReviewSection title="Technical" onEdit={() => goToStep(1)}>
          <ReviewRow label="Platform" value={form.platform} />
          <ReviewRow label="Domain" value={form.domain} />
          <ReviewRow label="Setup" value={form.setupType === "new" ? "New Build" : "Existing Site"} />
        </ReviewSection>
      )}

      {!isAgency && (
        <ReviewSection title="Billing" onEdit={() => goToStep(2)}>
          <ReviewRow label="Billing Model" value={form.billingModel === "retainer" ? "Retainer" : "Fixed Fee"} />
          {isMetaAds ? (
            <>
              <ReviewRow label="Management Fee" value={form.monthlyFee ? `₹${form.monthlyFee}/mo` : null} />
              <ReviewRow label="Ad Spend Budget" value={form.adSpendBudget ? `₹${form.adSpendBudget}/mo` : null} />
            </>
          ) : (
            <ReviewRow label="Total Budget" value={form.budget ? `₹${form.budget}` : null} />
          )}
          <ReviewRow label="Contract Link" value={form.contractLink} />
        </ReviewSection>
      )}

      <ReviewSection title="Team & Timeline" onEdit={() => goToStep(isAgency ? 2 : 3)}>
        <ReviewRow label="Deadline" value={form.deadline} />
        <ReviewRow label="Priority" value={form.priority} />
        <ReviewRow label="Lead" value={leadLabel} />
        <ReviewRow label="Team" value={teamLabel} />
      </ReviewSection>
    </div>
  );
}
