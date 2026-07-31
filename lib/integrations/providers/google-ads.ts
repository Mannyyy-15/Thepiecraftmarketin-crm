import { z } from "zod";
import { preferredGoogleClickId } from "../attribution";
import { ProviderHttpClient, type ProviderHttpOptions } from "../http";
import { AttributionSchema, IsoDateTime, Money, NonEmptyId, type ProviderResult } from "../types";

const GoogleCustomerId = z.string().regex(/^\d{6,12}$/);
const DateOnly = z.string().date();

export const GoogleAdsReportInput = z
  .object({
    customerId: GoogleCustomerId,
    loginCustomerId: GoogleCustomerId.optional(),
    startDate: DateOnly,
    endDate: DateOnly,
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, "startDate must not follow endDate");

const GoogleAdsRow = z
  .object({
    campaign: z.object({ id: z.string(), name: z.string() }).passthrough(),
    metrics: z
      .object({
        impressions: z.string().optional(),
        clicks: z.string().optional(),
        costMicros: z.string().optional(),
        conversions: z.number().optional(),
        conversionsValue: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const SearchStreamResponse = z.array(
  z.object({ results: z.array(GoogleAdsRow).optional() }).passthrough(),
);

export const GoogleAdsCampaignMetric = z
  .object({
    campaignId: z.string(),
    campaignName: z.string(),
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    spend: z.number().nonnegative(),
    conversions: z.number().nonnegative(),
    conversionValue: z.number().nonnegative(),
  })
  .strict();

export const GoogleConversionInput = z
  .object({
    customerId: GoogleCustomerId,
    loginCustomerId: GoogleCustomerId.optional(),
    conversionAction: z.string().regex(/^customers\/\d+\/conversionActions\/\d+$/),
    eventId: NonEmptyId,
    occurredAt: IsoDateTime,
    value: Money,
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    attribution: AttributionSchema,
  })
  .strict()
  .refine((value) => Boolean(preferredGoogleClickId(value.attribution)), "A Google click ID is required");

const UploadResponse = z
  .object({
    partialFailureError: z.object({ code: z.number().optional(), message: z.string().optional() }).passthrough().optional(),
    results: z.array(z.object({ conversionAction: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();

export class GoogleAdsClient {
  private readonly http: ProviderHttpClient;
  private readonly version: string;
  private readonly developerToken: string;

  constructor(
    options: Omit<ProviderHttpOptions, "provider" | "baseUrl"> & {
      apiVersion?: string;
      developerToken: string;
    },
  ) {
    this.version = options.apiVersion ?? "v25";
    if (!/^v\d+$/.test(this.version)) throw new Error("Invalid Google Ads API version");
    if (!options.developerToken.trim() || options.developerToken.length > 512) {
      throw new Error("Invalid Google Ads developer token");
    }
    this.developerToken = options.developerToken;
    this.http = new ProviderHttpClient({
      ...options,
      provider: "google-ads",
      baseUrl: `https://googleads.googleapis.com/${this.version}/`,
    });
  }

  async campaignReport(input: unknown): Promise<ProviderResult<z.infer<typeof GoogleAdsCampaignMetric>[]>> {
    const value = GoogleAdsReportInput.parse(input);
    const query = `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${value.startDate}' AND '${value.endDate}'`;
    const payload = await this.http.json(
      `/customers/${value.customerId}/googleAds:searchStream`,
      SearchStreamResponse,
      {
        method: "POST",
        body: { query },
        scopes: ["https://www.googleapis.com/auth/adwords"],
        headers: {
          "developer-token": this.developerToken,
          ...(value.loginCustomerId ? { "login-customer-id": value.loginCustomerId } : {}),
        },
      },
    );
    const data = payload.flatMap((batch) => batch.results ?? []).map((row) =>
      GoogleAdsCampaignMetric.parse({
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        impressions: Number(row.metrics.impressions ?? 0),
        clicks: Number(row.metrics.clicks ?? 0),
        spend: Number(row.metrics.costMicros ?? 0) / 1_000_000,
        conversions: row.metrics.conversions ?? 0,
        conversionValue: row.metrics.conversionsValue ?? 0,
      }),
    );
    return { provider: "google-ads", fetchedAt: new Date().toISOString(), data };
  }

  async uploadClickConversion(input: unknown): Promise<ProviderResult<{ accepted: boolean; eventId: string }>> {
    const value = GoogleConversionInput.parse(input);
    const click = preferredGoogleClickId(value.attribution)!;
    const response = await this.http.json(`/customers/${value.customerId}:uploadClickConversions`, UploadResponse, {
      method: "POST",
      scopes: ["https://www.googleapis.com/auth/adwords"],
      headers: {
        "developer-token": this.developerToken,
        ...(value.loginCustomerId ? { "login-customer-id": value.loginCustomerId } : {}),
      },
      body: {
        partialFailure: true,
        validateOnly: false,
        conversions: [
          {
            conversionAction: value.conversionAction,
            conversionDateTime: value.occurredAt.replace("T", " ").replace("Z", "+00:00"),
            conversionValue: value.value,
            currencyCode: value.currencyCode,
            orderId: value.eventId,
            [click.type]: click.value,
          },
        ],
      },
    });
    return {
      provider: "google-ads",
      fetchedAt: new Date().toISOString(),
      data: { accepted: !response.partialFailureError, eventId: value.eventId },
    };
  }
}
