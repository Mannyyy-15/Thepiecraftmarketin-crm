import crypto from "crypto";

export function constantTimeEqual(
  received: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!received || !expected) return false;
  const receivedDigest = crypto.createHash("sha256").update(received).digest();
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(receivedDigest, expectedDigest);
}

export function contentLengthWithinLimit(
  request: Request,
  maximumBytes: number
): boolean {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return true;
  const length = Number(rawLength);
  return Number.isSafeInteger(length) && length >= 0 && length <= maximumBytes;
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => {
        try {
          const parsed = new URL(origin);
          return (
            (parsed.protocol === "https:" ||
              (process.env.NODE_ENV !== "production" &&
                parsed.protocol === "http:")) &&
            parsed.origin === origin
          );
        } catch {
          return false;
        }
      })
  );
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalWithRateLimits = globalThis as typeof globalThis & {
  __crmRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits =
  globalWithRateLimits.__crmRateLimits ||
  (globalWithRateLimits.__crmRateLimits = new Map<string, RateLimitEntry>());

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = rateLimits.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  backend: "redis" | "memory" | "unavailable";
}

/**
 * Uses a single atomic Lua operation in an Upstash-compatible Redis REST API.
 * Production deliberately fails closed when the shared limiter is unavailable;
 * a per-process fallback would allow limits to be bypassed across instances.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisUrl = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL
  )?.replace(/\/+$/, "");
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    if (process.env.NODE_ENV === "production") {
      console.error("[RateLimit] Shared Redis is not configured.");
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
        backend: "unavailable",
      };
    }
    return { ...checkRateLimit(key, limit, windowMs), backend: "memory" };
  }

  const privateKey = crypto
    .createHash("sha256")
    .update(`${process.env.RATE_LIMIT_KEY_SALT || "crm"}:${key}`)
    .digest("hex");
  const script =
    'local count=redis.call("INCR",KEYS[1]);' +
    'if count==1 then redis.call("PEXPIRE",KEYS[1],ARGV[2]); end;' +
    'local ttl=redis.call("PTTL",KEYS[1]); return {count,ttl};';

  try {
    const response = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        script,
        "1",
        `crm:rate-limit:${privateKey}`,
        String(limit),
        String(windowMs),
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`Redis returned ${response.status}`);

    const body = (await response.json()) as { result?: unknown };
    if (
      !Array.isArray(body.result) ||
      body.result.length !== 2 ||
      !Number.isFinite(Number(body.result[0])) ||
      !Number.isFinite(Number(body.result[1]))
    ) {
      throw new Error("Redis returned an invalid rate-limit response");
    }
    const count = Number(body.result[0]);
    const ttlMs = Math.max(0, Number(body.result[1]));
    return {
      allowed: count <= limit,
      retryAfterSeconds:
        count <= limit ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
      backend: "redis",
    };
  } catch (error) {
    console.error("[RateLimit] Shared Redis request failed.", error);
    if (process.env.NODE_ENV !== "production") {
      return { ...checkRateLimit(key, limit, windowMs), backend: "memory" };
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      backend: "unavailable",
    };
  }
}
