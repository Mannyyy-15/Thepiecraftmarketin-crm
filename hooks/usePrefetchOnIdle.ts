"use client";

import { useEffect } from "react";

interface PrefetchTask {
  key: string;
  fetcher: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

const PERSISTENT_PREFIX = "crm.cache.";
const DEFER_MS = 1500;

/**
 * Warms the same localStorage-backed cache that useActionCache reads, for
 * pages the user hasn't opened yet. Runs once per portal root, well after
 * the current page's own data has had time to load, so it never competes
 * with what's actually on screen for network/main-thread time.
 *
 * Skips any key that's already fresh (written recently by useActionCache
 * itself or a previous prefetch), so re-mounting the layout on every
 * navigation doesn't re-fetch everything over and over.
 */
export function usePrefetchOnIdle(tasks: PrefetchTask[], ttlMs = 60_000) {
  useEffect(() => {
    if (typeof window === "undefined" || tasks.length === 0) return;

    let cancelled = false;

    const run = async () => {
      for (const task of tasks) {
        if (cancelled) return;
        if (isFresh(task.key, ttlMs)) continue;
        try {
          const res = await task.fetcher();
          if (cancelled) return;
          if (res.success && res.data !== undefined) {
            writeEntry(task.key, res.data);
          }
        } catch {
          /* best-effort — the destination page will fetch normally if this failed */
        }
      }
    };

    const schedule = () => {
      const idle = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
      if (idle) {
        idle(() => { if (!cancelled) void run(); }, { timeout: DEFER_MS + 1000 });
      } else {
        setTimeout(() => { if (!cancelled) void run(); }, DEFER_MS);
      }
    };

    const timer = setTimeout(schedule, DEFER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Tasks are built fresh each render from stable server-action references;
    // only re-run this effect if the number/identity of keys actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.map((t) => t.key).join(",")]);
}

function isFresh(key: string, ttlMs: number): boolean {
  try {
    const raw = window.localStorage.getItem(PERSISTENT_PREFIX + key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { timestamp?: number };
    return typeof parsed.timestamp === "number" && Date.now() - parsed.timestamp < ttlMs;
  } catch {
    return false;
  }
}

function writeEntry(key: string, data: unknown) {
  try {
    window.localStorage.setItem(
      PERSISTENT_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    /* storage full or unavailable — silent, matches useActionCache's own fallback */
  }
}
