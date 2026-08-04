"use client";

import { usePrefetchOnIdle } from "@/hooks/usePrefetchOnIdle";
import {
  getTeamUsers,
  getPendingLeaves,
  getTeamPresence,
  getClientsEnriched,
  getProjects,
  getInvoices,
  getProjectTasksGrouped,
} from "@/app/actions/crm";
import { mapTeamMembers } from "@/lib/team-presence";

/**
 * Warms the Team / Clients / Projects pages' caches shortly after the admin
 * opens the app, so navigating to them shows real data immediately instead
 * of a fresh loading skeleton. Mount once at the portal root — see
 * useLocalNotifications() in this same layout for the identical pattern.
 */
export default function AdminPrefetch() {
  usePrefetchOnIdle([
    { key: "admin:team:members", fetcher: async () => {
      const [usersRes, presenceRes] = await Promise.all([getTeamUsers(), getTeamPresence()]);
      if (!usersRes.success || !usersRes.data) return usersRes;
      const mapped = mapTeamMembers(usersRes.data, presenceRes.success && presenceRes.data ? presenceRes.data : []);
      return { success: true, data: mapped };
    } },
    { key: "admin:team:pendingLeaves", fetcher: getPendingLeaves },
    { key: "admin:clients:list", fetcher: getClientsEnriched },
    { key: "admin:clients:roster", fetcher: async () => {
      const res = await getTeamUsers();
      if (!res.success || !res.data) return res;
      return { success: true, data: res.data.filter((u: any) => u.role !== "client") };
    } },
    { key: "admin:clients:projects", fetcher: getProjects },
    { key: "admin:clients:invoices", fetcher: getInvoices },
    { key: "admin:projects:list", fetcher: getProjects },
    { key: "admin:projects:roster", fetcher: async () => {
      const res = await getTeamUsers();
      if (!res.success || !res.data) return res;
      return { success: true, data: res.data.filter((u: any) => u.role !== "client") };
    } },
    { key: "admin:projects:clients", fetcher: getClientsEnriched },
    { key: "admin:projects:taskMap", fetcher: getProjectTasksGrouped },
  ]);

  return null;
}
