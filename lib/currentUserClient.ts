import { getCurrentUser } from "@/app/actions/auth";

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

let cachedUserPromise: Promise<CurrentUser> | null = null;
let cachedAt = 0;

const USER_CACHE_TTL_MS = 30_000;

/**
 * Deduplicates the current-user request shared by layouts, sidebars and top bars.
 * The short TTL keeps mutable session data fresh without issuing several identical
 * requests during every route mount.
 */
export function getCurrentUserCached() {
  const now = Date.now();
  if (!cachedUserPromise || now - cachedAt >= USER_CACHE_TTL_MS) {
    cachedAt = now;
    cachedUserPromise = getCurrentUser().catch((error) => {
      cachedUserPromise = null;
      throw error;
    });
  }
  return cachedUserPromise;
}

export function clearCurrentUserCache() {
  cachedUserPromise = null;
  cachedAt = 0;
}
