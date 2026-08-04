"use client";

import { usePrefetchOnIdle } from "@/hooks/usePrefetchOnIdle";
import {
  getClientDashboardData,
  getProjects,
  getClientInvoices,
  getClientDocuments,
} from "@/app/actions/crm";

/**
 * Warms the client portal's Projects / Invoices / Documents caches shortly
 * after the app opens, so navigating there shows real data immediately
 * instead of a fresh loading state.
 */
export default function ClientPrefetch() {
  usePrefetchOnIdle([
    { key: "client:dashboard", fetcher: getClientDashboardData },
    { key: "client:projects:list", fetcher: getProjects },
    { key: "client:invoices:list", fetcher: getClientInvoices },
    { key: "client:documents:list", fetcher: getClientDocuments },
  ]);

  return null;
}
