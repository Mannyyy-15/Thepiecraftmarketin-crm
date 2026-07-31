export type TenantRole = "owner" | "admin" | "manager" | "member" | "client";
export const TENANT_ROLES: readonly TenantRole[];
export function isTenantRole(role: unknown): role is TenantRole;
export function canReadTenant(role: unknown): role is TenantRole;
export function canWriteCrm(role: unknown): role is Exclude<TenantRole, "client">;
export function canManageTenant(role: unknown): role is "owner" | "admin";
export function isAllowedTenantRole(role: unknown, allowedRoles: readonly TenantRole[]): role is TenantRole;
