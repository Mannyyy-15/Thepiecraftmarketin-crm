import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/app/actions/auth";
import { db } from "@/lib/db";
import { organizationMemberships, organizations } from "@/lib/schema";
import {
  isAllowedTenantRole,
} from "./policy.mjs";

export type TenantRole = "owner" | "admin" | "manager" | "member" | "client";

export type TenantContext = {
  organizationId: number;
  organizationName: string;
  userId: number;
  role: TenantRole;
};

export class TenantAuthorizationError extends Error {
  constructor(message = "You do not have access to this organization.") {
    super(message);
    this.name = "TenantAuthorizationError";
  }
}

/**
 * Resolves tenant identity from the database on every protected operation.
 * Organization IDs received from a browser are selectors, never authorization.
 */
export async function requireTenantContext(
  organizationId: number,
  allowedRoles: readonly TenantRole[] = ["owner", "admin", "manager", "member", "client"]
): Promise<TenantContext> {
  if (!Number.isSafeInteger(organizationId) || organizationId <= 0) {
    throw new TenantAuthorizationError();
  }

  const user = await getCurrentUser();
  if (!user || !db) {
    throw new TenantAuthorizationError();
  }

  const rows = await db
    .select({
      organizationId: organizationMemberships.organizationId,
      organizationName: organizations.name,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMemberships.organizationId)
    )
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, Number(user.id)),
        eq(organizationMemberships.status, "active"),
        eq(organizations.status, "active")
      )
    )
    .limit(1);

  const membership = rows[0];
  if (!membership || !isAllowedTenantRole(membership.role, allowedRoles)) {
    throw new TenantAuthorizationError();
  }

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    userId: Number(user.id),
    role: membership.role,
  };
}
