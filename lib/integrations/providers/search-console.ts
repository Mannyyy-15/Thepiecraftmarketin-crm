import { z } from "zod";
import { ProviderHttpClient, type ProviderHttpOptions } from "../http";
import type { ProviderResult } from "../types";

const SearchDimension = z.enum(["country", "device", "page", "query", "searchAppearance", "date", "hour"]);
export const SearchConsoleInput = z
  .object({
    siteUrl: z.union([
      z.string().url().max(2048),
      z.string().regex(/^sc-domain:[A-Za-z0-9.-]{1,253}$/),
    ]),
    startDate: z.string().date(),
    endDate: z.string().date(),
    dimensions: z.array(SearchDimension).max(5).default(["query"]),
    rowLimit: z.number().int().positive().max(25_000).default(10_000),
    searchType: z.enum(["web", "image", "video", "news", "discover", "googleNews"]).default("web"),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, "startDate must not follow endDate");

const SearchResponse = z
  .object({
    rows: z
      .array(
        z
          .object({
            keys: z.array(z.string()).optional(),
            clicks: z.number().nonnegative(),
            impressions: z.number().nonnegative(),
            ctr: z.number().nonnegative(),
            position: z.number().nonnegative(),
          })
          .strict(),
      )
      .optional(),
  })
  .passthrough();

export class SearchConsoleClient {
  private readonly http: ProviderHttpClient;
  constructor(options: Omit<ProviderHttpOptions, "provider" | "baseUrl">) {
    this.http = new ProviderHttpClient({
      ...options,
      provider: "search-console",
      baseUrl: "https://searchconsole.googleapis.com/",
    });
  }

  async searchAnalytics(input: unknown): Promise<ProviderResult<z.infer<typeof SearchResponse>["rows"]>> {
    const value = SearchConsoleInput.parse(input);
    const response = await this.http.json(
      `/webmasters/v3/sites/${encodeURIComponent(value.siteUrl)}/searchAnalytics/query`,
      SearchResponse,
      {
        method: "POST",
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        body: {
          startDate: value.startDate,
          endDate: value.endDate,
          dimensions: value.dimensions,
          rowLimit: value.rowLimit,
          type: value.searchType,
        },
      },
    );
    return { provider: "search-console", fetchedAt: new Date().toISOString(), data: response.rows ?? [] };
  }
}
