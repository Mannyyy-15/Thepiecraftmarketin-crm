"use client";

import { usePrefetchOnIdle } from "@/hooks/usePrefetchOnIdle";
import {
  getMyClients,
  getFreshUserProfile,
  getProjects,
  getProjectTasksGrouped,
} from "@/app/actions/crm";

/**
 * Warms the employee Clients / Projects pages' caches shortly after the app
 * opens, so navigating there shows real data immediately. Home/Overview
 * already preload themselves via RSC + useActionCache — see
 * app/employee/EmployeeHome.tsx — this covers the rest of the bottom nav.
 */
export default function EmployeePrefetch() {
  usePrefetchOnIdle([
    { key: "employee:clients:list", fetcher: getMyClients },
    { key: "user_profile", fetcher: getFreshUserProfile },
    { key: "employee:projects:list", fetcher: getProjects },
    { key: "employee:projects:taskMap", fetcher: getProjectTasksGrouped },
    { key: "employee:projects:myClients", fetcher: getMyClients },
  ]);

  return null;
}
