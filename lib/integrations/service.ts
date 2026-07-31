import { z } from "zod";
import { mapLeadQuality } from "./analytics";
import { AttributionSchema } from "./types";
import type { GoogleAdsClient } from "./providers/google-ads";
import type { MetaCapiClient } from "./providers/meta";

const FeedbackInput = z
  .object({
    eventId: z.string().trim().min(1).max(128),
    stage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost", "invalid"]),
    occurredAt: z.string().datetime({ offset: true }),
    value: z.number().finite().nonnegative().optional(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
    attribution: AttributionSchema,
  })
  .strict();

export interface ConversionDelivery {
  provider: "google-ads" | "meta-capi";
  accepted: boolean;
  eventId: string;
}

/**
 * Provider-neutral orchestration. The caller owns authorization, persistence and
 * a durable event ledger; this service only sends an event after validation.
 */
export async function deliverLeadQualityFeedback(
  input: unknown,
  adapters: {
    googleAds?: { client: GoogleAdsClient; customerId: string; conversionAction: string };
    meta?: {
      client: MetaCapiClient;
      pixelId: string;
      actionSource: "website" | "app" | "phone_call" | "chat" | "email" | "other";
      userData: Record<string, unknown>;
      sourceUrl?: string;
    };
  },
): Promise<ConversionDelivery[]> {
  const value = FeedbackInput.parse(input);
  const quality = mapLeadQuality(value.stage);
  if (!quality.upload) return [];
  const deliveries: Promise<ConversionDelivery>[] = [];
  if (adapters.googleAds) {
    deliveries.push(
      adapters.googleAds.client
        .uploadClickConversion({
          customerId: adapters.googleAds.customerId,
          conversionAction: adapters.googleAds.conversionAction,
          eventId: value.eventId,
          occurredAt: value.occurredAt,
          value: value.value ?? quality.score,
          currencyCode: value.currencyCode ?? "INR",
          attribution: value.attribution,
        })
        .then((result) => ({ provider: "google-ads", ...result.data })),
    );
  }
  if (adapters.meta) {
    deliveries.push(
      adapters.meta.client
        .sendEvent({
          pixelId: adapters.meta.pixelId,
          eventId: value.eventId,
          eventName: quality.eventName,
          occurredAt: value.occurredAt,
          actionSource: adapters.meta.actionSource,
          sourceUrl: adapters.meta.sourceUrl,
          userData: adapters.meta.userData,
          value: value.value,
          currencyCode: value.currencyCode,
          leadQuality: quality.score,
        })
        .then((result) => ({ provider: "meta-capi", ...result.data })),
    );
  }
  return Promise.all(deliveries);
}
