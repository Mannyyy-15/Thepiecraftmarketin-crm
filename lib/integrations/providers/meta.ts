import { z } from "zod";
import { ProviderHttpClient, type ProviderHttpOptions } from "../http";
import { IsoDateTime, Money, NonEmptyId, type ProviderResult } from "../types";

const DateOnly = z.string().date();
const MetaId = z.string().regex(/^\d{4,30}$/);

export const MetaInsightsInput = z
  .object({
    adAccountId: MetaId,
    startDate: DateOnly,
    endDate: DateOnly,
    level: z.enum(["account", "campaign", "adset", "ad"]).default("campaign"),
    limit: z.number().int().positive().max(500).default(100),
  })
  .strict()
  .refine((value) => value.startDate <= value.endDate, "startDate must not follow endDate");

const MetaInsight = z
  .object({
    account_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
    adset_id: z.string().optional(),
    adset_name: z.string().optional(),
    ad_id: z.string().optional(),
    ad_name: z.string().optional(),
    impressions: z.string().optional(),
    clicks: z.string().optional(),
    spend: z.string().optional(),
    reach: z.string().optional(),
    frequency: z.string().optional(),
    ctr: z.string().optional(),
  })
  .passthrough();

const MetaInsightsResponse = z
  .object({
    data: z.array(MetaInsight),
    paging: z.object({ next: z.string().url().optional() }).passthrough().optional(),
  })
  .passthrough();

export interface MetaInsightMetric {
  accountId?: string;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  ctr: number;
}

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const MetaCapiEventInput = z
  .object({
    pixelId: MetaId,
    eventId: NonEmptyId,
    eventName: z.string().trim().min(1).max(128),
    occurredAt: IsoDateTime,
    actionSource: z.enum(["website", "app", "phone_call", "chat", "email", "other"]),
    sourceUrl: z.string().url().max(2048).optional(),
    userData: z
      .object({
        emailSha256: z.array(Sha256).max(10).optional(),
        phoneSha256: z.array(Sha256).max(10).optional(),
        externalIdSha256: z.array(Sha256).max(10).optional(),
        clientIpAddress: z.union([z.ipv4(), z.ipv6()]).optional(),
        clientUserAgent: z.string().trim().max(1024).optional(),
        fbc: z.string().trim().max(512).optional(),
        fbp: z.string().trim().max(512).optional(),
      })
      .strict()
      .refine((value) => Object.values(value).some((item) => item !== undefined), "At least one user match key is required"),
    value: Money.optional(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
    leadQuality: z.number().min(0).max(100).optional(),
  })
  .strict()
  .refine((value) => (value.value === undefined) === (value.currencyCode === undefined), {
    message: "value and currencyCode must be supplied together",
  });

const CapiResponse = z
  .object({
    events_received: z.number().int().nonnegative(),
    messages: z.array(z.string()).optional(),
    fbtrace_id: z.string().optional(),
  })
  .passthrough();

export class MetaMarketingClient {
  private readonly http: ProviderHttpClient;
  private readonly version: string;

  constructor(options: Omit<ProviderHttpOptions, "provider" | "baseUrl"> & { apiVersion?: string }) {
    this.version = options.apiVersion ?? "v24.0";
    if (!/^v\d+\.\d+$/.test(this.version)) throw new Error("Invalid Meta API version");
    this.http = new ProviderHttpClient({
      ...options,
      provider: "meta-ads",
      baseUrl: `https://graph.facebook.com/${this.version}/`,
    });
  }

  async insights(input: unknown): Promise<ProviderResult<MetaInsightMetric[]>> {
    const value = MetaInsightsInput.parse(input);
    const params = new URLSearchParams({
      fields: "account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,reach,frequency,ctr",
      level: value.level,
      limit: String(value.limit),
      time_range: JSON.stringify({ since: value.startDate, until: value.endDate }),
    });
    const response = await this.http.json(`/act_${value.adAccountId}/insights?${params}`, MetaInsightsResponse);
    const data = response.data.map((row) => ({
      accountId: row.account_id,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      adSetId: row.adset_id,
      adSetName: row.adset_name,
      adId: row.ad_id,
      adName: row.ad_name,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      spend: Number(row.spend ?? 0),
      reach: Number(row.reach ?? 0),
      frequency: Number(row.frequency ?? 0),
      ctr: Number(row.ctr ?? 0),
    }));
    return { provider: "meta-ads", fetchedAt: new Date().toISOString(), data };
  }
}

export class MetaCapiClient {
  private readonly http: ProviderHttpClient;
  constructor(options: Omit<ProviderHttpOptions, "provider" | "baseUrl"> & { apiVersion?: string }) {
    const version = options.apiVersion ?? "v24.0";
    if (!/^v\d+\.\d+$/.test(version)) throw new Error("Invalid Meta API version");
    this.http = new ProviderHttpClient({
      ...options,
      provider: "meta-capi",
      baseUrl: `https://graph.facebook.com/${version}/`,
    });
  }

  async sendEvent(input: unknown): Promise<ProviderResult<{ accepted: boolean; eventId: string }>> {
    const value = MetaCapiEventInput.parse(input);
    const response = await this.http.json(`/${value.pixelId}/events`, CapiResponse, {
      method: "POST",
      body: {
        data: [
          {
            event_name: value.eventName,
            event_time: Math.floor(new Date(value.occurredAt).getTime() / 1000),
            event_id: value.eventId,
            action_source: value.actionSource,
            event_source_url: value.sourceUrl,
            user_data: {
              em: value.userData.emailSha256,
              ph: value.userData.phoneSha256,
              external_id: value.userData.externalIdSha256,
              client_ip_address: value.userData.clientIpAddress,
              client_user_agent: value.userData.clientUserAgent,
              fbc: value.userData.fbc,
              fbp: value.userData.fbp,
            },
            custom_data: {
              value: value.value,
              currency: value.currencyCode,
              lead_quality: value.leadQuality,
            },
          },
        ],
      },
    });
    return {
      provider: "meta-capi",
      fetchedAt: new Date().toISOString(),
      data: { accepted: response.events_received > 0, eventId: value.eventId },
      requestId: response.fbtrace_id,
    };
  }
}
