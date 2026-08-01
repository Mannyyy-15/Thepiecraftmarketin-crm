"use client";

import { useEffect, useRef } from "react";

/** Refetches mounted portal data when a user returns to the app. */
export function useRefreshOnFocus(refresh: () => void | Promise<void>, minimumIntervalMs = 15_000) {
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(Date.now());
  refreshRef.current = refresh;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRunRef.current < minimumIntervalMs) return;
      lastRunRef.current = now;
      void refreshRef.current();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [minimumIntervalMs]);
}
