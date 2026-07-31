export const TENANT_ROLES = Object.freeze([
  "owner",
  "admin",
  "manager",
  "member",
  "client",
]);

const WRITE_ROLES = new Set(["owner", "admin", "manager", "member"]);
const MANAGE_ROLES = new Set(["owner", "admin"]);

export function isTenantRole(role) {
  return TENANT_ROLES.includes(role);
}

export function canReadTenant(role) {
  return isTenantRole(role);
}

export function canWriteCrm(role) {
  return WRITE_ROLES.has(role);
}

export function canManageTenant(role) {
  return MANAGE_ROLES.has(role);
}

export function isAllowedTenantRole(role, allowedRoles) {
  return isTenantRole(role) && allowedRoles.includes(role);
}
