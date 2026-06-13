"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GlobalSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Smart Polling Mechanism: Automatically synchronizes the UI with the server 
    // every 10 seconds without needing a page refresh.
    // Next.js router.refresh() will seamlessly refetch all Server Components 
    // while preserving React Client state (like form inputs).
    const syncInterval = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [router]);

  return <>{children}</>;
}
