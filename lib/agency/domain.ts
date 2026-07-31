import { z } from "zod";

export const agencyRoleSchema = z.enum(["admin", "employee", "client"]);
export type AgencyRole = z.infer<typeof agencyRoleSchema>;
export const tenantMembershipRoleSchema = z.enum(["owner", "admin", "manager", "member", "client"]);
export type TenantMembershipRole = z.infer<typeof tenantMembershipRoleSchema>;

const id = z.number().int().positive();
const shortText = z.string().trim().min(1).max(255);
const longText = z.string().trim().min(1).max(10_000);
const optionalLongText = z.string().trim().max(10_000).nullable().optional();
const dateOnly = z.string().date();
const dateTime = z.string().datetime({ offset: true });
const url = z.string().url().max(2_048);
const moneyMinor = z.number().int().nonnegative().max(2_147_483_647);

export const agencyActorSchema = z.object({
  userId: z.number().int().positive(),
  organizationId: id,
  role: agencyRoleSchema,
  clientAccountId: id.nullable().optional(),
});
export type AgencyActor = z.infer<typeof agencyActorSchema>;

export function agencyRoleFromMembership(role: TenantMembershipRole): AgencyRole {
  if (role === "owner" || role === "admin") return "admin";
  if (role === "client") return "client";
  return "employee";
}

export const workflowEntityBaseSchema = z.object({
  id,
  organizationId: id,
  projectId: id,
  createdAt: dateTime,
  updatedAt: dateTime,
});

export const discoveryBriefInputSchema = z.object({
  organizationId: id,
  projectId: id,
  title: shortText,
  businessGoals: z.array(shortText).min(1).max(20),
  audiences: z.array(shortText).max(20).default([]),
  competitors: z.array(url).max(20).default([]),
  successMetrics: z.array(shortText).min(1).max(20),
  constraints: optionalLongText,
  dueDate: dateOnly.nullable().optional(),
});
export type DiscoveryBriefInput = z.infer<typeof discoveryBriefInputSchema>;

export const sitemapNodeInputSchema = z.object({
  organizationId: id,
  projectId: id,
  parentId: id.nullable(),
  label: shortText,
  path: z.string().trim().startsWith("/").max(500),
  purpose: z.string().trim().max(2_000).nullable().optional(),
  sortOrder: z.number().int().nonnegative().max(10_000),
});
export type SitemapNodeInput = z.infer<typeof sitemapNodeInputSchema>;

export const approvalInputSchema = z.object({
  organizationId: id,
  projectId: id,
  subjectType: z.enum(["discovery", "sitemap", "design", "deliverable", "report", "change_order"]),
  subjectId: id,
  decision: z.enum(["approved", "changes_requested"]),
  comment: z.string().trim().max(5_000).nullable().optional(),
  version: z.number().int().positive(),
}).superRefine((value, context) => {
  if (value.decision === "changes_requested" && !value.comment) {
    context.addIssue({
      code: "custom",
      path: ["comment"],
      message: "A comment is required when requesting changes.",
    });
  }
});
export type ApprovalInput = z.infer<typeof approvalInputSchema>;

export const deliverableInputSchema = z.object({
  organizationId: id,
  projectId: id,
  title: shortText,
  description: optionalLongText,
  type: z.enum(["design", "copy", "code", "report", "asset", "other"]),
  dueDate: dateOnly.nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  storageObjectId: id.nullable().optional(),
  externalUrl: url.nullable().optional(),
}).refine((value) => !(value.storageObjectId && value.externalUrl), {
  message: "Use either a managed file or an external URL, not both.",
  path: ["externalUrl"],
});
export type DeliverableInput = z.infer<typeof deliverableInputSchema>;

export const environmentInputSchema = z.object({
  organizationId: id,
  projectId: id,
  name: z.enum(["development", "preview", "staging", "production"]),
  baseUrl: url,
  provider: z.enum(["vercel", "netlify", "cloudflare", "aws", "other"]),
  externalEnvironmentId: z.string().trim().max(255).nullable().optional(),
});
export type EnvironmentInput = z.infer<typeof environmentInputSchema>;

export const deploymentInputSchema = z.object({
  organizationId: id,
  projectId: id,
  environmentId: id,
  externalDeploymentId: z.string().trim().min(1).max(255),
  commitSha: z.string().regex(/^[a-f0-9]{7,64}$/i),
  status: z.enum(["queued", "building", "ready", "failed", "cancelled"]),
  initiatedById: z.number().int().positive().nullable().optional(),
  deployedAt: dateTime.nullable().optional(),
});
export type DeploymentInput = z.infer<typeof deploymentInputSchema>;

export const maintenanceCheckInputSchema = z.object({
  organizationId: id,
  projectId: id,
  environmentId: id,
  checkType: z.enum(["uptime", "ssl", "domain_expiry", "core_web_vitals", "backup", "dependency"]),
  status: z.enum(["healthy", "warning", "critical", "unknown"]),
  observedAt: dateTime,
  nextDueAt: dateTime.nullable().optional(),
  summary: z.string().trim().max(2_000).nullable().optional(),
  evidence: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});
export type MaintenanceCheckInput = z.infer<typeof maintenanceCheckInputSchema>;

export const clientRequestInputSchema = z.object({
  organizationId: id,
  projectId: id,
  title: shortText,
  description: longText,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  requestedById: z.number().int().positive(),
  desiredDate: dateOnly.nullable().optional(),
});
export type ClientRequestInput = z.infer<typeof clientRequestInputSchema>;

export const changeOrderInputSchema = z.object({
  organizationId: id,
  projectId: id,
  requestId: id.nullable().optional(),
  title: shortText,
  scope: longText,
  reason: longText,
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  amountMinor: moneyMinor,
  effortMinutes: z.number().int().nonnegative().max(1_000_000),
  scheduleImpactDays: z.number().int().min(-365).max(3_650),
  expiresAt: dateTime,
});
export type ChangeOrderInput = z.infer<typeof changeOrderInputSchema>;

export const timeEntryInputSchema = z.object({
  organizationId: id,
  projectId: id,
  employeeId: z.number().int().positive(),
  taskId: z.number().int().positive().nullable().optional(),
  description: shortText,
  startedAt: dateTime,
  endedAt: dateTime,
  billable: z.boolean().default(true),
  proofObjectId: id.nullable().optional(),
}).refine(
  ({ startedAt, endedAt }) => new Date(endedAt).getTime() > new Date(startedAt).getTime(),
  { message: "End time must be after start time.", path: ["endedAt"] },
);
export type TimeEntryInput = z.infer<typeof timeEntryInputSchema>;

export const checklistTemplateInputSchema = z.object({
  organizationId: id,
  name: shortText,
  channel: z.enum(["google_ads", "meta_ads", "ga4", "search_console", "web_development", "seo", "other"]),
  items: z.array(z.object({
    key: z.string().trim().min(1).max(100).regex(/^[a-z0-9_-]+$/),
    label: shortText,
    required: z.boolean().default(true),
    evidenceRequired: z.boolean().default(false),
  })).min(1).max(200),
});
export type ChecklistTemplateInput = z.infer<typeof checklistTemplateInputSchema>;

export const checklistCompletionInputSchema = z.object({
  organizationId: id,
  projectId: id,
  checklistId: id,
  itemKey: z.string().trim().min(1).max(100),
  completed: z.boolean(),
  evidenceObjectId: id.nullable().optional(),
  note: z.string().trim().max(2_000).nullable().optional(),
});
export type ChecklistCompletionInput = z.infer<typeof checklistCompletionInputSchema>;

export const workloadItemSchema = z.object({
  taskId: z.number().int().positive(),
  projectId: z.number().int().positive().nullable(),
  title: shortText,
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "in-progress", "in-review", "done"]),
  dueDate: dateOnly.nullable(),
  estimatedMinutes: z.number().int().nonnegative().nullable(),
  loggedMinutes: z.number().int().nonnegative(),
});
export type WorkloadItem = z.infer<typeof workloadItemSchema>;

export const myDaySchema = z.object({
  date: dateOnly,
  employeeId: z.number().int().positive(),
  activeTimer: z.object({
    timeEntryId: id,
    projectId: id,
    startedAt: dateTime,
    description: shortText,
  }).nullable(),
  work: z.array(workloadItemSchema),
  dueChecklistItems: z.number().int().nonnegative(),
  pendingProofItems: z.number().int().nonnegative(),
  capacityMinutes: z.number().int().positive(),
  scheduledMinutes: z.number().int().nonnegative(),
});
export type MyDay = z.infer<typeof myDaySchema>;

export type AgencyCommand =
  | { kind: "discovery.create"; input: DiscoveryBriefInput }
  | { kind: "sitemap.node.create"; input: SitemapNodeInput }
  | { kind: "approval.decide"; input: ApprovalInput }
  | { kind: "deliverable.create"; input: DeliverableInput }
  | { kind: "environment.create"; input: EnvironmentInput }
  | { kind: "deployment.record"; input: DeploymentInput }
  | { kind: "maintenance.record"; input: MaintenanceCheckInput }
  | { kind: "request.create"; input: ClientRequestInput }
  | { kind: "change_order.create"; input: ChangeOrderInput }
  | { kind: "time_entry.create"; input: TimeEntryInput }
  | { kind: "checklist.template.create"; input: ChecklistTemplateInput }
  | { kind: "checklist.complete"; input: ChecklistCompletionInput };

export const agencyCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("discovery.create"), input: discoveryBriefInputSchema }),
  z.object({ kind: z.literal("sitemap.node.create"), input: sitemapNodeInputSchema }),
  z.object({ kind: z.literal("approval.decide"), input: approvalInputSchema }),
  z.object({ kind: z.literal("deliverable.create"), input: deliverableInputSchema }),
  z.object({ kind: z.literal("environment.create"), input: environmentInputSchema }),
  z.object({ kind: z.literal("deployment.record"), input: deploymentInputSchema }),
  z.object({ kind: z.literal("maintenance.record"), input: maintenanceCheckInputSchema }),
  z.object({ kind: z.literal("request.create"), input: clientRequestInputSchema }),
  z.object({ kind: z.literal("change_order.create"), input: changeOrderInputSchema }),
  z.object({ kind: z.literal("time_entry.create"), input: timeEntryInputSchema }),
  z.object({ kind: z.literal("checklist.template.create"), input: checklistTemplateInputSchema }),
  z.object({ kind: z.literal("checklist.complete"), input: checklistCompletionInputSchema }),
]);

export const commandKindSchema = z.enum([
  "discovery.create",
  "sitemap.node.create",
  "approval.decide",
  "deliverable.create",
  "environment.create",
  "deployment.record",
  "maintenance.record",
  "request.create",
  "change_order.create",
  "time_entry.create",
  "checklist.template.create",
  "checklist.complete",
]);
export type AgencyCommandKind = z.infer<typeof commandKindSchema>;
