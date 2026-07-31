import { z } from "zod";
import { ProviderHttpClient, type ProviderHttpOptions } from "../http";
import type { ProviderResult } from "../types";

const ApiName = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/);
export const Ga4ReportInput = z
  .object({
    propertyId: z.string().regex(/^\d{4,20}$/),
    startDate: z.string().date(),
    endDate: z.string().date(),
    dimensions: z.array(ApiName).min(1).max(9),
    metrics: z.array(ApiName).min(1).max(10),
    limit: z.number().int().positive().max(100_000).default(10_000),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, "startDate must not follow endDate");

const Ga4Response = z
  .object({
    dimensionHeaders: z.array(z.object({ name: z.string() }).strict()).optional(),
    metricHeaders: z.array(z.object({ name: z.string(), type: z.string().optional() }).passthrough()).optional(),
    rows: z
      .array(
        z
          .object({
            dimensionValues: z.array(z.object({ value: z.string().optional() }).passthrough()).optional(),
            metricValues: z.array(z.object({ value: z.string().optional() }).passthrough()).optional(),
          })
          .strict(),
      )
      .optional(),
    rowCount: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export interface Ga4ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

export class Ga4DataClient {
  private readonly http: ProviderHttpClient;
  constructor(options: Omit<ProviderHttpOptions, "provider" | "baseUrl">) {
    this.http = new ProviderHttpClient({
      ...options,
      provider: "ga4",
      baseUrl: "https://analyticsdata.googleapis.com/v1beta/",
    });
  }

  async runReport(input: unknown): Promise<ProviderResult<{ rows: Ga4ReportRow[]; rowCount: number }>> {
    const value = Ga4ReportInput.parse(input);
    const response = await this.http.json(`/properties/${value.propertyId}:runReport`, Ga4Response, {
      method: "POST",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      body: {
        dateRanges: [{ startDate: value.startDate, endDate: value.endDate }],
        dimensions: value.dimensions.map((name) => ({ name })),
        metrics: value.metrics.map((name) => ({ name })),
        limit: value.limit,
      },
    });
    const dimensionNames = response.dimensionHeaders?.map((header) => header.name) ?? value.dimensions;
    const metricNames = response.metricHeaders?.map((header) => header.name) ?? value.metrics;
    const rows = (response.rows ?? []).map((row) => ({
      dimensions: Object.fromEntries(dimensionNames.map((name, index) => [name, row.dimensionValues?.[index]?.value ?? ""])),
      metrics: Object.fromEntries(metricNames.map((name, index) => [name, Number(row.metricValues?.[index]?.value ?? 0)])),
    }));
    return { provider: "ga4", fetchedAt: new Date().toISOString(), data: { rows, rowCount: response.rowCount ?? rows.length } };
  }
}
