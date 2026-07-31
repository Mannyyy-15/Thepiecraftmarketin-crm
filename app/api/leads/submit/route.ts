import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { z } from "zod";
import {
  checkDistributedRateLimit,
  constantTimeEqual,
  contentLengthWithinLimit,
  parseAllowedOrigins,
} from "@/lib/security/http";
import { eq } from "drizzle-orm";
import { normalizeAttribution } from "@/lib/integrations/attribution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const allowedOrigins = parseAllowedOrigins(process.env.LEADS_ALLOWED_ORIGINS);

const leadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    contactName: z.string().trim().max(200).optional(),
    contact_name: z.string().trim().max(200).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    contact_phone: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(40).optional(),
    contactEmail: z.string().trim().email().max(254).optional(),
    contact_email: z.string().trim().email().max(254).optional(),
    email: z.string().trim().email().max(254).optional(),
    source: z.string().trim().min(1).max(100).optional(),
    service: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(5000).optional(),
    message: z.string().trim().max(5000).optional(),
    estimatedValue: z.coerce
      .number()
      .finite()
      .nonnegative()
      .max(1_000_000_000)
      .optional(),
    estimated_value: z.coerce
      .number()
      .finite()
      .nonnegative()
      .max(1_000_000_000)
      .optional(),
    utm_source: z.string().trim().max(255).optional(),
    utm_medium: z.string().trim().max(255).optional(),
    utm_campaign: z.string().trim().max(255).optional(),
    utm_term: z.string().trim().max(255).optional(),
    utm_content: z.string().trim().max(255).optional(),
    gclid: z.string().trim().max(255).optional(),
    gbraid: z.string().trim().max(255).optional(),
    wbraid: z.string().trim().max(255).optional(),
    fbclid: z.string().trim().max(255).optional(),
    landing_page: z.string().trim().url().max(1000).optional(),
    referrer: z.string().trim().url().max(1000).optional(),
  })
  .strict();

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-leads-token",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  try {
    const expected = process.env.LEADS_SUBMIT_TOKEN;
    if (!expected) {
      console.error("[Leads] LEADS_SUBMIT_TOKEN is not configured.");
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers }
      );
    }

    if (origin && !allowedOrigins.has(origin)) {
      return NextResponse.json(
        { success: false, error: "Origin not allowed" },
        { status: 403 }
      );
    }

    if (!contentLengthWithinLimit(req, MAX_BODY_BYTES)) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413, headers }
      );
    }

    if (!constantTimeEqual(req.headers.get("x-leads-token"), expected)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401, headers }
      );
    }

    const clientAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = await checkDistributedRateLimit(
      `api:leads:${clientAddress}`,
      120,
      60 * 1000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: "Request body too large" },
        { status: 413, headers }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400, headers }
      );
    }

    const parsed = leadSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid lead data" },
        { status: 400, headers }
      );
    }
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers }
      );
    }

    const body = parsed.data;
    const organizationSlug = process.env.LEADS_ORGANIZATION_SLUG;
    if (!organizationSlug) {
      console.error("[Leads] LEADS_ORGANIZATION_SLUG is not configured.");
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers }
      );
    }
    const [organization] = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, organizationSlug))
      .limit(1);
    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503, headers }
      );
    }
    const attribution = normalizeAttribution(body);
    const [created] = await db.insert(schema.leads).values({
      organizationId: organization.id,
      name: body.name,
      contactName: body.contactName || body.contact_name || null,
      contactPhone:
        body.contactPhone || body.contact_phone || body.phone || null,
      contactEmail:
        body.contactEmail || body.contact_email || body.email || null,
      source: body.source || "website",
      service: body.service || null,
      notes: body.notes || body.message || null,
      stage: "new",
      estimatedValue: Math.round(
        body.estimatedValue || body.estimated_value || 0
      ),
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmTerm: attribution.utmTerm,
      utmContent: attribution.utmContent,
      gclid: attribution.gclid,
      gbraid: attribution.gbraid,
      wbraid: attribution.wbraid,
      fbclid: attribution.fbclid,
      landingPageUrl: attribution.landingPage,
      referrerUrl: attribution.referrer,
      attributionData: JSON.stringify(attribution),
    }).$returningId();
    if (created?.id) {
      const clickId = attribution.gclid || attribution.gbraid || attribution.wbraid || attribution.fbclid;
      const clickIdType = attribution.gclid
        ? "gclid"
        : attribution.gbraid
          ? "gbraid"
          : attribution.wbraid
            ? "wbraid"
            : attribution.fbclid
              ? "fbclid"
              : null;
      await db.insert(schema.attributionTouchpoints).values({
        organizationId: organization.id,
        leadId: created.id,
        touchType: "first",
        occurredAt: new Date(),
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
        term: attribution.utmTerm,
        clickId,
        clickIdType,
        landingPageUrl: attribution.landingPage,
        referrerUrl: attribution.referrer,
      });
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error("Lead submit error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers }
    );
  }
}
