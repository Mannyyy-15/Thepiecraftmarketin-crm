"use client";
import { useState } from "react";

export type ProjectKind = "meta_ads" | "web_dev" | "agency";
export type AgencyFlavor = "meta_ads" | "web_dev";
export type ClientMode = "existing" | "new";

export interface AddProjectFormState {
  // Type + client
  kind: ProjectKind | "";
  agencyFlavor: AgencyFlavor | "";
  clientMode: ClientMode;
  clientId: string;
  newClientName: string;
  newClientContactName: string;
  newClientContactPhone: string;

  // Core
  name: string;
  leadId: string;
  teamMemberIds: number[];
  startDate: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  notes: string;

  // Meta Ads
  adAccountId: string;
  businessManagerId: string;
  pixelId: string;
  conversionLocation: string;
  landingPage: string;
  objective: string;
  primaryKpi: string;
  targetKpiValue: string;
  metaCampaignName: string;
  metaCampaignStatus: "draft" | "active" | "paused";

  // Web Dev
  websiteType: string;
  platform: string;
  setupType: "new" | "existing";
  domain: string;
  domainExpiry: string;
  hostingProvider: string;
  hostingExpiry: string;
  repoLink: string;
  cmsNeeded: boolean;
  adminPanelNeeded: boolean;
  dbNeeded: boolean;
  integrations: string;
  brandAssets: string;
  contentAssets: string;
  referenceLinks: string;
  numPages: string;
  launchDate: string;
  oldWebsiteUrl: string;

  // Billing (hidden for agency)
  billingModel: "fixed_fee" | "retainer";
  budget: string;
  monthlyFee: string;
  adSpendBudget: string;
  billingCycleStart: string;
  contractDuration: string;
  contractLink: string;
  clientContactName: string;
  clientContactPhone: string;
  accessGranted: boolean;
}

export const BLANK_ADD_PROJECT_FORM: AddProjectFormState = {
  kind: "",
  agencyFlavor: "",
  clientMode: "existing",
  clientId: "",
  newClientName: "",
  newClientContactName: "",
  newClientContactPhone: "",

  name: "",
  leadId: "",
  teamMemberIds: [],
  startDate: "",
  deadline: "",
  priority: "medium",
  notes: "",

  adAccountId: "",
  businessManagerId: "",
  pixelId: "",
  conversionLocation: "website",
  landingPage: "",
  objective: "leads",
  primaryKpi: "CPL",
  targetKpiValue: "",
  metaCampaignName: "",
  metaCampaignStatus: "draft",

  websiteType: "landing_page",
  platform: "Next.js",
  setupType: "new",
  domain: "",
  domainExpiry: "",
  hostingProvider: "Hostinger",
  hostingExpiry: "",
  repoLink: "",
  cmsNeeded: false,
  adminPanelNeeded: false,
  dbNeeded: false,
  integrations: "",
  brandAssets: "",
  contentAssets: "",
  referenceLinks: "",
  numPages: "",
  launchDate: "",
  oldWebsiteUrl: "",

  billingModel: "fixed_fee",
  budget: "",
  monthlyFee: "",
  adSpendBudget: "",
  billingCycleStart: "",
  contractDuration: "",
  contractLink: "",
  clientContactName: "",
  clientContactPhone: "",
  accessGranted: false,
};

/** Effective flavor once "agency" work is broken down into meta_ads / web_dev content. */
export function effectiveFlavor(form: AddProjectFormState): "meta_ads" | "web_dev" | "" {
  if (form.kind === "agency") return form.agencyFlavor || "";
  return form.kind || "";
}

export function useAddProjectForm() {
  const [form, setForm] = useState<AddProjectFormState>({ ...BLANK_ADD_PROJECT_FORM });
  const f = (patch: Partial<AddProjectFormState>) => setForm(prev => ({ ...prev, ...patch }));
  const reset = () => setForm({ ...BLANK_ADD_PROJECT_FORM });
  return { form, f, reset };
}
