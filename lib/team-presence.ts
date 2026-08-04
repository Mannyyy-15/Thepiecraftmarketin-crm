import { parseEmployeePermissions } from "@/lib/member-permissions";

/**
 * Combines getTeamUsers() + getTeamPresence() into the shape the admin Team
 * page (and its prefetcher) render. Shared so both stay in sync — if this
 * mapping changes, both the page and the prefetch cache pick it up together.
 */
export function mapTeamMembers(users: any[], presence: Array<{ userId: number; sessionActive: boolean; punchedIn: boolean }>) {
  const presenceMap = new Map<number, { sessionActive: boolean; punchedIn: boolean }>(
    presence.map((p) => [p.userId, { sessionActive: p.sessionActive, punchedIn: p.punchedIn }])
  );

  return users.map((u: any) => {
    const pres = presenceMap.get(u.id);
    const status = pres?.punchedIn
      ? ("online" as const)
      : pres?.sessionActive
      ? ("away" as const)
      : ("offline" as const);

    return {
      id: String(u.id),
      name: u.name,
      role: u.systemRole || (u.role === "admin" ? "Admin" : "Web Developer"),
      email: u.email,
      roleRaw: u.role,
      permissions: parseEmployeePermissions(u.permissions),
      lastLoginAt: u.lastLoginAt,
      status,
      workingDays: u.workingDays ? u.workingDays.split(",").map(Number) : [1, 2, 3, 4, 5],
      shiftStartTime: u.shiftStartTime || "09:00 AM",
      shiftEndTime: u.shiftEndTime || "05:00 PM",
      activeShiftProfile: u.activeShiftProfile || "Standard Core Hours",
    };
  });
}
