import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { contentLengthWithinLimit } from "@/lib/security/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(req: Request) {
  let claimedEventId: string | null = null;
  try {
    if (!contentLengthWithinLimit(req, MAX_WEBHOOK_BYTES)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[Razorpay] RAZORPAY_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
    }

    const bodyText = await req.text();
    if (Buffer.byteLength(bodyText, "utf8") > MAX_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest();
    const receivedSignature = Buffer.from(signature, "hex");
    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const paymentLink = payload?.payload?.payment_link?.entity;
    const eventType =
      typeof payload?.event === "string" ? payload.event.slice(0, 100) : "unknown";
    const providerEventId =
      req.headers.get("x-razorpay-event-id") ||
      (typeof paymentLink?.id === "string"
        ? `${eventType}:${paymentLink.id}`
        : `payload:${crypto.createHash("sha256").update(bodyText).digest("hex")}`);
    const payloadHash = crypto
      .createHash("sha256")
      .update(bodyText)
      .digest("hex");

    let ownsLedgerEvent = false;
    try {
      await db.insert(schema.webhookEventLedger).values({
        provider: "razorpay",
        externalEventId: providerEventId.slice(0, 255),
        eventType,
        payloadHash,
        signatureVerified: 1,
        status: "processing",
        attemptCount: 1,
      });
      ownsLedgerEvent = true;
      claimedEventId = providerEventId.slice(0, 255);
    } catch {
      const [existingEvent] = await db
        .select()
        .from(schema.webhookEventLedger)
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(
              schema.webhookEventLedger.externalEventId,
              providerEventId.slice(0, 255)
            )
          )
        )
        .limit(1);
      if (!existingEvent || existingEvent.payloadHash !== payloadHash) {
        return NextResponse.json(
          { error: "Webhook event ID conflict" },
          { status: 409 }
        );
      }
      if (existingEvent.status !== "failed") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      await db
        .update(schema.webhookEventLedger)
        .set({
          status: "processing",
          attemptCount: sql`${schema.webhookEventLedger.attemptCount} + 1`,
          lastError: null,
        })
        .where(
          and(
            eq(schema.webhookEventLedger.id, existingEvent.id),
            eq(schema.webhookEventLedger.status, "failed")
          )
        );
      ownsLedgerEvent = true;
      claimedEventId = providerEventId.slice(0, 255);
    }

    if (!ownsLedgerEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (eventType !== "payment_link.paid") {
      await db
        .update(schema.webhookEventLedger)
        .set({ status: "ignored", processedAt: new Date() })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(
              schema.webhookEventLedger.externalEventId,
              providerEventId.slice(0, 255)
            )
          )
        );
      return NextResponse.json({ received: true, ignored: true });
    }

    const invoiceIdText = paymentLink?.notes?.invoice_id;
    if (
      typeof invoiceIdText !== "string" ||
      !/^[1-9]\d*$/.test(invoiceIdText) ||
      paymentLink?.currency !== "INR" ||
      paymentLink?.status !== "paid" ||
      !Number.isSafeInteger(paymentLink?.amount_paid)
    ) {
      await db
        .update(schema.webhookEventLedger)
        .set({ status: "failed", lastError: "invalid_payment_payload" })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(schema.webhookEventLedger.externalEventId, claimedEventId!)
          )
        );
      return NextResponse.json(
        { error: "Invalid payment payload" },
        { status: 400 }
      );
    }

    const invoiceId = Number(invoiceIdText);
    const invoiceRows = await db
      .select({
        id: schema.invoices.id,
        organizationId: schema.invoices.organizationId,
        amount: schema.invoices.amount,
        status: schema.invoices.status,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.id, invoiceId))
      .limit(1);
    const invoice = invoiceRows[0];
    if (!invoice) {
      await db
        .update(schema.webhookEventLedger)
        .set({ status: "failed", lastError: "invoice_not_found" })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(schema.webhookEventLedger.externalEventId, claimedEventId!)
          )
        );
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (paymentLink.amount_paid !== invoice.amount * 100) {
      console.error(`[Razorpay] Amount mismatch for invoice ${invoiceId}.`);
      await db
        .update(schema.webhookEventLedger)
        .set({ status: "failed", lastError: "payment_amount_mismatch" })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(schema.webhookEventLedger.externalEventId, claimedEventId!)
          )
        );
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 409 }
      );
    }

    if (invoice.status !== "paid") {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.invoices)
          .set({ status: "paid", paidDate: new Date().toISOString() })
          .where(
            and(
              eq(schema.invoices.id, invoiceId),
              ne(schema.invoices.status, "paid")
            )
          );
        await tx
          .update(schema.webhookEventLedger)
          .set({
            organizationId: invoice.organizationId,
            status: "processed",
            processedAt: new Date(),
          })
          .where(
            and(
              eq(schema.webhookEventLedger.provider, "razorpay"),
              eq(
                schema.webhookEventLedger.externalEventId,
                providerEventId.slice(0, 255)
              )
            )
          );
      });
    } else {
      await db
        .update(schema.webhookEventLedger)
        .set({
          organizationId: invoice.organizationId,
          status: "processed",
          processedAt: new Date(),
        })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(
              schema.webhookEventLedger.externalEventId,
              providerEventId.slice(0, 255)
            )
          )
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    if (db && claimedEventId) {
      await db
        .update(schema.webhookEventLedger)
        .set({
          status: "failed",
          lastError: error instanceof Error ? error.message.slice(0, 2000) : "unknown_error",
        })
        .where(
          and(
            eq(schema.webhookEventLedger.provider, "razorpay"),
            eq(schema.webhookEventLedger.externalEventId, claimedEventId)
          )
        )
        .catch(() => undefined);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
