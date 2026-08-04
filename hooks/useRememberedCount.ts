"use client";

import { useRef } from "react";

/**
 * Remembers the last real item count for a given list (per browser, via
 * localStorage) so a skeleton loader can render that many placeholder cards
 * instead of a hardcoded guess. First-ever visit (no memory yet) falls back
 * to `fallback`. Call `record(realLength)` once real data arrives to update
 * the memory for next time.
 */
export function useRememberedCount(key: string, fallback = 3) {
  const storageKey = `crm.count.${key}`;

  const remembered = useRef<number | null>(null);
  if (remembered.current === null) {
    remembered.current = readCount(storageKey);
  }

  const skeletonCount = remembered.current ?? fallback;

  const record = (length: number) => {
    if (!Number.isFinite(length) || length < 0) return;
    remembered.current = length;
    writeCount(storageKey, length);
  };

  return { skeletonCount, record };
}

function readCount(storageKey: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeCount(storageKey: string, length: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, String(length));
  } catch {
    /* silent fallback */
  }
}
