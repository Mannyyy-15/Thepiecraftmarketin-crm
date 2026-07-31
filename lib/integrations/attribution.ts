import { z } from "zod";
import { AttributionSchema, type Attribution } from "./types";

const keys = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_term: "utmTerm",
  utm_content: "utmContent",
  gclid: "gclid",
  gbraid: "gbraid",
  wbraid: "wbraid",
  fbclid: "fbclid",
} as const;

const RawAttribution = z.record(z.string(), z.unknown());

function clean(value: unknown, max = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export function normalizeAttribution(input: unknown): Attribution {
  const raw = RawAttribution.parse(input);
  const normalized: Record<string, string> = {};
  for (const [source, target] of Object.entries(keys)) {
    const value = clean(raw[source] ?? raw[target]);
    if (value) normalized[target] = value;
  }
  const landingPage = clean(raw.landingPage ?? raw.landing_page, 2048);
  const referrer = clean(raw.referrer, 2048);
  if (landingPage) normalized.landingPage = landingPage;
  if (referrer) normalized.referrer = referrer;
  return AttributionSchema.parse(normalized);
}

export function attributionFromUrl(url: string, referrer?: string): Attribution {
  const parsed = new URL(url);
  const source: Record<string, string> = { landingPage: parsed.toString() };
  for (const key of Object.keys(keys)) {
    const value = parsed.searchParams.get(key);
    if (value) source[key] = value;
  }
  if (referrer) source.referrer = referrer;
  return normalizeAttribution(source);
}

export function preferredGoogleClickId(attribution: Attribution):
  | { type: "gclid" | "gbraid" | "wbraid"; value: string }
  | undefined {
  if (attribution.gclid) return { type: "gclid", value: attribution.gclid };
  if (attribution.gbraid) return { type: "gbraid", value: attribution.gbraid };
  if (attribution.wbraid) return { type: "wbraid", value: attribution.wbraid };
  return undefined;
}
