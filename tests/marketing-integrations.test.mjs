import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { z } from "zod";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
      return { url: new URL(`${specifier}.ts`, context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const {
  CallbackTokenProvider,
  Ga4DataClient,
  GoogleAdsClient,
  MetaCapiClient,
  ProviderHttpClient,
  assessCreativeFatigue,
  attributionFromUrl,
  calculateBudgetPacing,
  calculateProfitability,
  detectAnomaly,
  mapLeadQuality,
} = await import("../lib/integrations/index.ts");

const tokenProvider = new CallbackTokenProvider(async () => ({ token: "server-only-token" }));

test("attribution normalizes supported click and UTM identifiers", () => {
  const result = attributionFromUrl(
    "https://agency.test/landing?utm_source=Google&utm_campaign=Launch&gclid=abc123&fbclid=meta123",
    "https://google.com/",
  );
  assert.equal(result.utmSource, "Google");
  assert.equal(result.utmCampaign, "Launch");
  assert.equal(result.gclid, "abc123");
  assert.equal(result.fbclid, "meta123");
  assert.equal(result.referrer, "https://google.com/");
});

test("HTTP client injects bearer token and returns redacted provider errors", async () => {
  let authorization;
  const client = new ProviderHttpClient({
    provider: "example",
    baseUrl: "https://api.example.test/",
    tokenProvider,
    maxRetries: 0,
    fetch: async (_url, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      return new Response(JSON.stringify({ error: { message: "server-only-token leaked detail", code: 401 } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    },
  });
  await assert.rejects(() => client.json("/metrics", z.object({ ok: z.boolean() })), (error) => {
    assert.doesNotMatch(error.message, /server-only-token/);
    assert.match(error.message, /401/);
    return true;
  });
  assert.equal(authorization, "Bearer server-only-token");
});

test("GA4 client validates inputs and maps provider rows", async () => {
  let body;
  const client = new Ga4DataClient({
    tokenProvider,
    fetch: async (url, init) => {
      assert.match(String(url), /properties\/123456:runReport/);
      body = JSON.parse(String(init?.body));
      return Response.json({
        dimensionHeaders: [{ name: "sessionSource" }],
        metricHeaders: [{ name: "sessions", type: "TYPE_INTEGER" }],
        rows: [{ dimensionValues: [{ value: "google" }], metricValues: [{ value: "42" }] }],
        rowCount: 1,
      });
    },
  });
  const result = await client.runReport({
    propertyId: "123456",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    dimensions: ["sessionSource"],
    metrics: ["sessions"],
  });
  assert.deepEqual(result.data.rows[0], { dimensions: { sessionSource: "google" }, metrics: { sessions: 42 } });
  assert.equal(body.dateRanges[0].startDate, "2026-07-01");
  await assert.rejects(() => client.runReport({ propertyId: "../bad" }));
});

test("Google conversion upload uses event ID for deduplication and one click identifier", async () => {
  let body;
  const client = new GoogleAdsClient({
    tokenProvider,
    developerToken: "google-developer-token",
    fetch: async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ results: [{ conversionAction: "customers/123456/conversionActions/77" }] });
    },
  });
  const result = await client.uploadClickConversion({
    customerId: "123456",
    conversionAction: "customers/123456/conversionActions/77",
    eventId: "lead-991-qualified",
    occurredAt: "2026-07-31T10:00:00+05:30",
    value: 1000,
    currencyCode: "INR",
    attribution: { gclid: "google-click", gbraid: "fallback-click" },
  });
  assert.equal(result.data.accepted, true);
  assert.equal(body.conversions[0].orderId, "lead-991-qualified");
  assert.equal(body.conversions[0].gclid, "google-click");
  assert.equal(body.conversions[0].gbraid, undefined);
});

test("Meta CAPI sends only pre-hashed identifiers and a stable event ID", async () => {
  let body;
  const client = new MetaCapiClient({
    tokenProvider,
    fetch: async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ events_received: 1, fbtrace_id: "trace-1" });
    },
  });
  const hash = "a".repeat(64);
  const result = await client.sendEvent({
    pixelId: "123456",
    eventId: "lead-991-qualified",
    eventName: "QualifiedLead",
    occurredAt: "2026-07-31T10:00:00+05:30",
    actionSource: "website",
    sourceUrl: "https://agency.test/contact",
    userData: { emailSha256: [hash], fbp: "fb.1.123.456" },
    leadQuality: 60,
  });
  assert.equal(result.data.accepted, true);
  assert.equal(body.data[0].event_id, "lead-991-qualified");
  assert.deepEqual(body.data[0].user_data.em, [hash]);
});

test("decision calculators use supplied observations without mock metrics", () => {
  assert.equal(mapLeadQuality("qualified").upload, true);
  assert.equal(calculateBudgetPacing({ budget: 3100, spend: 2000, elapsedDays: 10, totalDays: 31 }).status, "over");
  assert.equal(detectAnomaly({ current: 100, history: [10, 10, 10, 10, 10, 10, 10] }).isAnomaly, true);
  assert.equal(
    assessCreativeFatigue({ baselineCtr: 2, currentCtr: 1.2, baselineFrequency: 1.5, currentFrequency: 3.5 }).fatigued,
    true,
  );
  assert.deepEqual(
    calculateProfitability({ revenue: 10000, adSpend: 3000, laborCost: 2000, toolCost: 500 }),
    { totalCost: 5500, grossProfit: 4500, marginPercent: 45, roas: 10 / 3 },
  );
});
