import type { AgencyActor, AgencyCommand, AgencyCommandKind } from "./domain";

const adminCommands = new Set<AgencyCommandKind>([
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

const employeeCommands = new Set<AgencyCommandKind>([
  "discovery.create",
  "sitemap.node.create",
  "deliverable.create",
  "deployment.record",
  "maintenance.record",
  "request.create",
  "time_entry.create",
  "checklist.complete",
]);

const clientCommands = new Set<AgencyCommandKind>([
  "approval.decide",
  "request.create",
]);

export interface AgencyPolicyContext {
  actor: AgencyActor;
  command: AgencyCommand;
  /** Must be resolved with an organization-scoped query by the persistence adapter. */
  projectAccessible: boolean;
  /** Employee assignment to the project, also resolved tenant-safely. */
  projectAssigned: boolean;
}

export type AgencyPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: "cross_organization" | "forbidden" | "project_not_accessible" | "not_assigned" | "identity_mismatch" };

export function authorizeAgencyCommand({
  actor,
  command,
  projectAccessible,
  projectAssigned,
}: AgencyPolicyContext): AgencyPolicyDecision {
  if (command.input.organizationId !== actor.organizationId) {
    return { allowed: false, reason: "cross_organization" };
  }

  const roleCommands =
    actor.role === "admin" ? adminCommands :
    actor.role === "employee" ? employeeCommands :
    clientCommands;

  if (!roleCommands.has(command.kind)) return { allowed: false, reason: "forbidden" };
  if (!projectAccessible) return { allowed: false, reason: "project_not_accessible" };
  if (actor.role === "employee" && !projectAssigned) return { allowed: false, reason: "not_assigned" };

  if (command.kind === "time_entry.create" && command.input.employeeId !== actor.userId && actor.role !== "admin") {
    return { allowed: false, reason: "identity_mismatch" };
  }

  if (command.kind === "request.create" && command.input.requestedById !== actor.userId && actor.role !== "admin") {
    return { allowed: false, reason: "identity_mismatch" };
  }

  return { allowed: true };
}

export function allowedAgencyCommands(role: AgencyActor["role"]): AgencyCommandKind[] {
  return Array.from(
    role === "admin" ? adminCommands :
    role === "employee" ? employeeCommands :
    clientCommands,
  );
}
