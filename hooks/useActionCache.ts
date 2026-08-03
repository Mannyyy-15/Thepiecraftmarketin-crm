import { useState, useEffect, useRef, useCallback } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const listeners = new Map<string, Set<() => void>>();

function getPersistentEntry<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`crm.cache.${key}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* silent fallback */
  }
  return null;
}

function setPersistentEntry<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`crm.cache.${key}`, JSON.stringify(entry));
  } catch {
    /* silent fallback */
  }
}

/**
 * Purges all persistent crm.cache.* entries on user logout for security.
 */
export function clearPersistentCache() {
  memoryCache.clear();
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("crm.cache.")) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* silent */
  }
}

/**
 * Invalidates cached entries in memoryCache matching a key pattern or all if no pattern provided.
 */
export function invalidateActionCache(keyPattern?: string) {
  if (!keyPattern) {
    clearPersistentCache();
    listeners.forEach((set) => set.forEach((cb) => cb()));
    return;
  }
  const keysToInvalidate: string[] = [];
  for (const key of memoryCache.keys()) {
    if (key.includes(keyPattern)) keysToInvalidate.push(key);
  }
  for (const k of keysToInvalidate) {
    memoryCache.delete(k);
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(`crm.cache.${k}`); } catch {}
    }
    listeners.get(k)?.forEach((cb) => cb());
  }
}

/**
 * Stale-while-revalidate client-side persistent action cache hook.
 * Loads 0ms instantly from LocalStorage on 2nd open onwards with silent background revalidation.
 */
export function useActionCache<T>(
  key: string,
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  options: { ttlMs?: number; enabled?: boolean } = {}
) {
  const { ttlMs = 60_000, enabled = true } = options;

  // 1. Synchronously inspect memoryCache -> fallback to localStorage
  const initialEntry = memoryCache.get(key) || getPersistentEntry<T>(key);
  if (initialEntry && !memoryCache.has(key)) {
    memoryCache.set(key, initialEntry);
  }

  const isFresh = initialEntry ? Date.now() - initialEntry.timestamp < ttlMs : false;

  const [data, setData] = useState<T | null>(initialEntry ? initialEntry.data : null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialEntry && enabled);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!enabled) return;
      if (showLoading && !memoryCache.has(key) && !getPersistentEntry(key)) {
        setIsLoading(true);
      }
      try {
        const res = await fetcherRef.current();
        if (res.success && res.data !== undefined) {
          const newEntry = { data: res.data, timestamp: Date.now() };
          memoryCache.set(key, newEntry);
          setPersistentEntry(key, newEntry);
          setData(res.data);
          setError(null);
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    },
    [key, enabled]
  );

  useEffect(() => {
    if (!enabled) return;
    if (!listeners.has(key)) listeners.set(key, new Set());
    const cb = () => { void refresh(false); };
    listeners.get(key)!.add(cb);

    if (!isFresh) {
      void refresh(!initialEntry);
    }

    return () => {
      listeners.get(key)?.delete(cb);
    };
  }, [key, enabled, isFresh, initialEntry, refresh]);

  return { data, isLoading, error, refresh, setData };
}
