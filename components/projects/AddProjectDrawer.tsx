"use client";
import { Fragment, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/providers/ToastProvider";
import { createProject, createClientBrand, getMyClients, getTeamUsers } from "@/app/actions/crm";
import {
  useAddProjectForm, effectiveFlavor, type AddProjectFormState,
} from "./useAddProjectForm";
import { StepTypeSelect, isStepTypeValid } from "./StepTypeSelect";
import { StepMetaAds } from "./StepMetaAds";
import { StepWebDev } from "./StepWebDev";
import { StepBilling } from "./StepBilling";
import { StepTeamAssign } from "./StepTeamAssign";
import { StepReview } from "./StepReview";

interface Client { id: number; name: string; details?: string }
interface TeamUser { id: number; name: string; role?: string }

function buildServiceDetails(form: AddProjectFormState) {
  const flavor = effectiveFlavor(form);
  const isAgency = form.kind === "agency";
  if (flavor === "meta_ads") {
    return {
      adAccountId: form.adAccountId, businessManagerId: form.businessManagerId, pixelId: form.pixelId,
      conversionLocation: form.conversionLocation, landingPage: form.landingPage, objective: form.objective,
      primaryKpi: form.primaryKpi, targetKpiValue: form.targetKpiValue,
      notes: form.notes,
      ...(isAgency ? { agencyFlavor: "meta_ads" } : {}),
    };
  }
  if (flavor === "web_dev") {
    return {
      platform: form.platform, domain: form.domain, domainExpiry: form.domainExpiry, repoLink: form.repoLink,
      websiteType: form.websiteType, setupType: form.setupType, hostingProvider: form.hostingProvider,
      hostingExpiry: form.hostingExpiry, cmsNeeded: form.cmsNeeded, adminPanelNeeded: form.adminPanelNeeded,
      dbNeeded: form.dbNeeded, integrations: form.integrations, brandAssets: form.brandAssets,
      contentAssets: form.contentAssets, referenceLinks: form.referenceLinks, numPages: form.numPages,
      launchDate: form.launchDate, oldWebsiteUrl: form.oldWebsiteUrl, notes: form.notes,
      status: "unconfigured", uptime: null, response: null, isLive: false,
      ...(isAgency ? { agencyFlavor: "web_dev" } : {}),
    };
  }
  return { notes: form.notes };
}

function stepsForKind(kind: AddProjectFormState["kind"]): string[] {
  if (kind === "agency") return ["Type", "Details", "Team & Timeline", "Review"];
  return ["Type & Client", "Details", "Billing", "Team & Timeline", "Review"];
}

export function AddProjectDrawer({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const { form, f, reset } = useAddProjectForm();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  useEffect(() => {
    if (!open) return;
    reset();
    setStep(0);
    (async () => {
      const [cl, tu] = await Promise.all([getMyClients(), getTeamUsers()]);
      if (cl.success && cl.data) setClients(cl.data as any[]);
      if (tu.success && tu.data) setTeamUsers(tu.data as any[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const steps = stepsForKind(form.kind);
  const isAgency = form.kind === "agency";
  const flavor = effectiveFlavor(form);
  const isMetaAds = flavor === "meta_ads";
  const isWebDev = flavor === "web_dev";
  const lastStep = steps.length - 1;

  const canAdvance = () => {
    if (step === 0) return isStepTypeValid(form);
    return true;
  };

  const handleSubmit = async () => {
    if (!isStepTypeValid(form)) { toast("Fill in the required project details.", "error"); return; }
    setSubmitting(true);
    try {
      let clientId = form.clientId;
      if (!isAgency && form.clientMode === "new") {
        const cfd = new FormData();
        cfd.append("brandName", form.newClientName.trim());
        cfd.append("contactName", form.newClientContactName);
        cfd.append("contactPhone", form.newClientContactPhone);
        const cr = await createClientBrand(cfd);
        if (!cr.success || !cr.clientId) {
          toast(cr.error || "Failed to create the new client.", "error");
          setSubmitting(false);
          return;
        }
        clientId = String(cr.clientId);
      }

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("clientId", isAgency ? "__agency__" : clientId);
      fd.append("leadId", form.leadId);
      fd.append("projectType", form.kind);
      fd.append("startDate", form.startDate);
      fd.append("deadline", form.deadline);
      fd.append("status", "planning");
      fd.append("priority", form.priority);
      fd.append("billingModel", isMetaAds ? "retainer" : form.billingModel);
      fd.append("budget", isMetaAds || isAgency ? "0" : form.budget || "0");
      fd.append("monthlyFee", isMetaAds && !isAgency ? form.monthlyFee || "0" : "0");
      fd.append("adSpendBudget", isMetaAds && !isAgency ? form.adSpendBudget || "0" : "0");
      fd.append("serviceDetails", JSON.stringify(buildServiceDetails(form)));
      fd.append("billingCycleStart", isAgency ? "" : form.billingCycleStart);
      fd.append("contractDuration", isAgency ? "0" : form.contractDuration || "0");
      fd.append("clientContactName", isAgency ? "" : form.clientContactName);
      fd.append("clientContactPhone", isAgency ? "" : form.clientContactPhone);
      fd.append("accessGranted", isAgency ? "false" : String(form.accessGranted));
      fd.append("contractLink", isAgency ? "" : form.contractLink);
      fd.append("teamMemberIds", JSON.stringify(form.teamMemberIds));
      if (isMetaAds) {
        fd.append("metaCampaignName", form.metaCampaignName);
        fd.append("metaCampaignStatus", form.metaCampaignStatus);
      }

      const res = await createProject(fd);
      if (res.success) {
        onClose();
        await onCreated();
        toast(`${form.name} created.`, "success");
      } else {
        toast(res.error || "Failed to create project.", "error");
      }
    } catch (err: any) {
      toast(err.message || "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (isAgency) {
      if (step === 0) return <StepTypeSelect form={form} f={f} clients={clients} canCreateClient={false} />;
      if (step === 1) return isMetaAds ? <StepMetaAds form={form} f={f} /> : isWebDev ? <StepWebDev form={form} f={f} /> : null;
      if (step === 2) return <StepTeamAssign form={form} f={f} teamUsers={teamUsers} />;
      if (step === 3) return <StepReview form={form} clients={clients} teamUsers={teamUsers} goToStep={setStep} />;
    } else {
      if (step === 0) return <StepTypeSelect form={form} f={f} clients={clients} canCreateClient />;
      if (step === 1) return isMetaAds ? <StepMetaAds form={form} f={f} /> : <StepWebDev form={form} f={f} />;
      if (step === 2) return <StepBilling form={form} f={f} isMetaAds={isMetaAds} />;
      if (step === 3) return <StepTeamAssign form={form} f={f} teamUsers={teamUsers} />;
      if (step === 4) return <StepReview form={form} clients={clients} teamUsers={teamUsers} goToStep={setStep} />;
    }
    return null;
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-[560px] bg-white dark:bg-[#1f1f1f] z-50 shadow-2xl flex flex-col animate-[slide-in-right_280ms_cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200 dark:border-[#303030]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Project</p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{steps[step]}</h2>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303030] transition-all cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicator: circles on sm+, plain text below */}
          <div className="mt-4 hidden sm:flex items-center gap-2">
            {steps.map((label, i) => (
              <Fragment key={i}>
                <button type="button" onClick={() => i < step && setStep(i)}
                  className={cn("flex items-center gap-1.5 text-[10px] font-bold transition-all",
                    i <= step ? "cursor-pointer" : "cursor-default",
                    step === i ? "text-brand-600 dark:text-brand-400" : step > i ? "text-slate-500" : "text-slate-400")}>
                  <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0 transition-all",
                    step === i ? "bg-brand-600 text-white" : step > i ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600" : "bg-slate-200 dark:bg-[#303030] text-slate-500")}>
                    {step > i ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </span>
                </button>
                {i < steps.length - 1 && <div className={cn("flex-1 h-px transition-all", step > i ? "bg-brand-300 dark:bg-brand-700" : "bg-slate-200 dark:bg-[#303030]")} />}
              </Fragment>
            ))}
          </div>
          <p className="mt-3 sm:hidden text-[10px] font-semibold text-slate-400">Step {step + 1} of {steps.length}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-[#303030] bg-slate-50/40 dark:bg-[#1f1f1f]/20 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold text-slate-400 hidden sm:block">Step {step + 1} of {steps.length}</p>
          <div className="flex gap-2 w-full sm:w-auto">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Back
              </Button>
            )}
            {step < lastStep ? (
              <Button type="button" size="sm" disabled={!canAdvance()} onClick={() => setStep(s => s + 1)} className="flex-1 sm:flex-none bg-brand-600 text-white font-bold active:scale-95">
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button type="button" size="sm" disabled={submitting} onClick={handleSubmit} className="flex-1 sm:flex-none bg-brand-600 text-white font-bold active:scale-95 min-w-[140px] justify-center">
                {submitting ? "Creating…" : <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Create Project</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
