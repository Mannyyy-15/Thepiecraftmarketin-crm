"use server";

import { requireTenantContext, TenantAuthorizationError } from "@/lib/tenancy";
import { agencyRoleFromMembership } from "@/lib/agency/domain";
import { allowedAgencyCommands } from "@/lib/agency/policy";

const modules = [
  "discovery",
  "sitemap",
  "approvals",
  "deliverables",
  "deployments",
  "maintenance",
  "client_requests",
  "change_orders",
  "my_day",
  "campaign_checklists",
  "proof_of_work",
] as const;

export async function getAgencyWorkflowReadiness(organizationId: number) {
  try {
    // organizationId is only a selector. This performs the membership check
    // against the database and never trusts the JWT for tenant identity.
    const tenant = await requireTenantContext(organizationId);
    const role = agencyRoleFromMembership(tenant.role);

    return {
      success: true as const,
      data: {
        organizationId: tenant.organizationId,
        organizationName: tenant.organizationName,
        role,
        persistenceReady: false as const,
        allowedCommands: allowedAgencyCommands(role),
        modules: modules.map((module) => ({
          module,
          status: "not_configured" as const,
        })),
      },
    };
  } catch (error) {
    if (error instanceof TenantAuthorizationError) {
      return {
        success: false as const,
        code: "forbidden" as const,
        error: "You do not have access to this organization.",
      };
    }

    console.error("[AgencyWorkflow] Readiness check failed", { error });
    return {
      success: false as const,
      code: "internal_error" as const,
      error: "Agency workflow readiness could not be loaded.",
    };
  }
}
