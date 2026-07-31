import { z } from "zod";
import type { FetchLike, TokenProvider } from "./types.ts";

const ErrorPayload = z
  .object({
    error: z
      .object({
        message: z.string().max(500).optional(),
        code: z.union([z.string(), z.number()]).optional(),
        status: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export class IntegrationError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    provider: string,
    status?: number,
    retryable = false,
  ) {
    super(message);
    this.name = "IntegrationError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

export interface ProviderHttpOptions {
  provider: string;
  baseUrl: string;
  tokenProvider: TokenProvider;
  fetch?: FetchLike;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface JsonRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  scopes?: readonly string[];
  retry?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function safeProviderMessage(provider: string, status: number, payload: unknown): string {
  const parsed = ErrorPayload.safeParse(payload);
  const code = parsed.success ? parsed.data.error?.code : undefined;
  return `${provider} request failed (${status}${code === undefined ? "" : `, code ${String(code).slice(0, 40)}`})`;
}

export class ProviderHttpClient {
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly options: ProviderHttpOptions;

  constructor(options: ProviderHttpOptions) {
    this.options = options;
    const base = new URL(options.baseUrl);
    if (base.protocol !== "https:") throw new Error("Provider base URL must use HTTPS");
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async json<T>(path: string, schema: z.ZodType<T>, request: JsonRequestOptions = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Provider path must be relative");
    const url = new URL(path, this.options.baseUrl);
    const { token } = await this.options.tokenProvider.getAccessToken(request.scopes);
    if (!token || token.length > 16_384) throw new IntegrationError("Invalid provider credential", this.options.provider);

    const retries = request.retry === false ? 0 : this.maxRetries;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(url, {
          method: request.method ?? "GET",
          headers: {
            accept: "application/json",
            ...(request.body === undefined ? {} : { "content-type": "application/json" }),
            ...request.headers,
            authorization: `Bearer ${token}`,
          },
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
          redirect: "error",
          signal: controller.signal,
        });
        const raw = await response.text();
        let payload: unknown = {};
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch {
            throw new IntegrationError(`${this.options.provider} returned invalid JSON`, this.options.provider, response.status);
          }
        }
        if (!response.ok) {
          const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
          if (retryable && attempt < retries) {
            const retryAfter = Number(response.headers.get("retry-after"));
            await sleep(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5_000) : 150 * 2 ** attempt);
            continue;
          }
          throw new IntegrationError(
            safeProviderMessage(this.options.provider, response.status, payload),
            this.options.provider,
            response.status,
            retryable,
          );
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          throw new IntegrationError(`${this.options.provider} returned an unexpected response`, this.options.provider, response.status);
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof IntegrationError) throw error;
        const retryable = error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
        if (retryable && attempt < retries) {
          await sleep(150 * 2 ** attempt);
          continue;
        }
        throw new IntegrationError(
          error instanceof Error && error.name === "AbortError"
            ? `${this.options.provider} request timed out`
            : `${this.options.provider} network request failed`,
          this.options.provider,
          undefined,
          retryable,
        );
      } finally {
        clearTimeout(timer);
      }
    }
    throw new IntegrationError(`${this.options.provider} request failed`, this.options.provider);
  }
}
