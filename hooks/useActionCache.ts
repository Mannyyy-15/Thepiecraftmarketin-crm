import { useState, useEffect, useRef, useCallback } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const listeners = new Map<string, Set<() => void>>();

/**
 * Invalidates cached entries in memoryCache matching a key pattern or all if no pattern provided.
 */
export function invalidateActionCache(keyPattern?: string) {
  if (!keyPattern) {
    memoryCache.clear();
    listeners.forEach((set) => set.forEach((cb) => cb()));
    return;
  }
  const keysToInvalidate: string[] = [];
  for (const key of memoryCache.keys()) {
    if (key.includes(keyPattern)) keysToInvalidate.push(key);
  }
  for (const k of keysToInvalidate) {
    memoryCache.delete(k);
    listeners.get(k)?.forEach((cb) => cb());
  }
}

/**
 * Stale-while-revalidate client-side action cache hook to eliminate unnecessary loaders and speed up navigation.
 */
export function useActionCache<T>(
  key: string,
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  options: { ttlMs?: number; enabled?: boolean } = {}
) {
  const { ttlMs = 30_000, enabled = true } = options;
  const cachedEntry = memoryCache.get(key);
  const isFresh = cachedEntry ? Date.now() - cachedEntry.timestamp < ttlMs : false;

  const [data, setData] = useState<T | null>(cachedEntry ? cachedEntry.data : null);
  const [isLoading, setIsLoading] = useState<boolean>(!isFresh && enabled);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!enabled) return;
      if (showLoading && !memoryCache.has(key)) setIsLoading(true);
      try {
        const res = await fetcherRef.current();
        if (res.success && res.data !== undefined) {
          memoryCache.set(key, { data: res.data, timestamp: Date.now() });
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
    const cb = () => { refresh(false); };
    listeners.get(key)!.add(cb);

    if (!isFresh) {
      refresh(!cachedEntry);
    }

    return () => {
      listeners.get(key)?.delete(cb);
    };
  }, [key, enabled, isFresh, cachedEntry, refresh]);

  return { data, isLoading, error, refresh, setData };
}
