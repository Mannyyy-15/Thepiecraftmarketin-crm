import { z } from "zod";
import type { AccessToken, TokenProvider } from "./types";

const TokenResponse = z
  .object({
    access_token: z.string().min(1).max(16_384),
    expires_in: z.number().int().positive().max(86_400).optional(),
    token_type: z.string().optional(),
  })
  .passthrough();

export interface RefreshTokenProviderOptions {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetch?: typeof fetch;
}

/** Server-side OAuth refresh provider. Keep this instance in server-only dependency wiring. */
export class OAuthRefreshTokenProvider implements TokenProvider {
  private cached?: AccessToken;
  private readonly options: RefreshTokenProviderOptions;

  constructor(options: RefreshTokenProviderOptions) {
    this.options = options;
    const endpoint = new URL(options.tokenEndpoint);
    if (endpoint.protocol !== "https:") throw new Error("OAuth token endpoint must use HTTPS");
  }

  async getAccessToken(scopes?: readonly string[]): Promise<AccessToken> {
    if (this.cached?.expiresAt && this.cached.expiresAt.getTime() > Date.now() + 60_000) return this.cached;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      refresh_token: this.options.refreshToken,
    });
    if (scopes?.length) body.set("scope", scopes.join(" "));
    const response = await (this.options.fetch ?? fetch)(this.options.tokenEndpoint, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status})`);
    const parsed = TokenResponse.safeParse(payload);
    if (!parsed.success) throw new Error("OAuth token endpoint returned an unexpected response");
    this.cached = {
      token: parsed.data.access_token,
      expiresAt: parsed.data.expires_in ? new Date(Date.now() + parsed.data.expires_in * 1000) : undefined,
    };
    return this.cached;
  }
}

/** Useful when a vault or workload identity system supplies short-lived access tokens. */
export class CallbackTokenProvider implements TokenProvider {
  private readonly callback: (scopes?: readonly string[]) => Promise<AccessToken>;
  constructor(callback: (scopes?: readonly string[]) => Promise<AccessToken>) {
    this.callback = callback;
  }
  getAccessToken(scopes?: readonly string[]): Promise<AccessToken> {
    return this.callback(scopes);
  }
}
