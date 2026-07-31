import { z } from "zod";

export const NonEmptyId = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
export const Money = z.number().finite().nonnegative().max(1_000_000_000_000);
export const IsoDateTime = z.string().datetime({ offset: true });

export const AttributionSchema = z
  .object({
    utmSource: z.string().trim().max(256).optional(),
    utmMedium: z.string().trim().max(256).optional(),
    utmCampaign: z.string().trim().max(512).optional(),
    utmTerm: z.string().trim().max(512).optional(),
    utmContent: z.string().trim().max(512).optional(),
    gclid: z.string().trim().max(512).optional(),
    gbraid: z.string().trim().max(512).optional(),
    wbraid: z.string().trim().max(512).optional(),
    fbclid: z.string().trim().max(512).optional(),
    landingPage: z.string().url().max(2048).optional(),
    referrer: z.string().url().max(2048).optional(),
  })
  .strict();

export type Attribution = z.infer<typeof AttributionSchema>;

export interface AccessToken {
  /** Bearer token. It must never be logged, serialized into an error, or returned to a client. */
  token: string;
  expiresAt?: Date;
}

export interface TokenProvider {
  getAccessToken(scopes?: readonly string[]): Promise<AccessToken>;
}

export interface IntegrationRequestContext {
  tenantId: string;
  correlationId: string;
}

export interface FetchLike {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface ProviderResult<T> {
  provider: "google-ads" | "ga4" | "search-console" | "meta-ads" | "meta-capi";
  fetchedAt: string;
  data: T;
  requestId?: string;
}

export function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Marketing integration clients are server-only");
  }
}
