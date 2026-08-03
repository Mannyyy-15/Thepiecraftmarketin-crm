export const EMPLOYEE_PERMISSIONS = [
  "manage_clients",   // create/edit client accounts
  "manage_projects",  // create/edit projects
  "manage_tasks",     // create/assign tasks beyond their own
  "manage_invoices",  // create/edit invoices
  "manage_expenses",  // approve/edit expenses
] as const;

export type EmployeePermission = typeof EMPLOYEE_PERMISSIONS[number];

export function parseEmployeePermissions(raw: string | null | undefined): EmployeePermission[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validSet = new Set<string>(EMPLOYEE_PERMISSIONS);
    return parsed.filter((item): item is EmployeePermission => typeof item === "string" && validSet.has(item));
  } catch {
    return [];
  }
}

export function serializeEmployeePermissions(perms: EmployeePermission[]): string {
  if (!Array.isArray(perms)) return "[]";
  const validSet = new Set<string>(EMPLOYEE_PERMISSIONS);
  const filtered = Array.from(new Set(perms)).filter((item): item is EmployeePermission => validSet.has(item));
  return JSON.stringify(filtered);
}
