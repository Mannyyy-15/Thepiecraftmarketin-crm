import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/mailer";
import { createInvoicePaymentLink } from "@/lib/payments/razorpay";
import { constantTimeEqual } from "@/lib/security/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function emailFromDetails(json: string | null | undefined): string {
  try {
    const details = JSON.parse(json || "{}");
    const email =
      details.email || details.contactEmail || details.billTo?.email || "";
    return typeof email === "string" ? email.trim() : "";
  } catch {
    return "";
  }
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[Cron] CRON_SECRET is not configured.");
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 }
      );
    }
    if (
      !constantTimeEqual(
        req.headers.get("Authorization"),
        `Bearer ${cronSecret}`
      )
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Service unavailable" },
        { status: 503 }
      );
    }

    const unpaidInvoices = await db
      .select()
      .from(schema.invoices)
      .where(inArray(schema.invoices.status, ["sent", "overdue"]));
    const now = new Date();
    let emailsSent = 0;

    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;
      const dueDate = new Date(invoice.dueDate);
      if (!Number.isFinite(dueDate.getTime())) continue;
      const diffDays = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (![3, 0, -3, -7, -14].includes(diffDays)) continue;

      let email = emailFromDetails(invoice.notes);
      let clientName = "there";
      if (invoice.clientId) {
        const clientRows = await db
          .select()
          .from(schema.clients)
          .where(eq(schema.clients.id, invoice.clientId))
          .limit(1);
        if (clientRows.length) {
          clientName = clientRows[0].name || clientName;
          if (!email) email = emailFromDetails(clientRows[0].details);
        }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        continue;
      }

      const paymentData = await createInvoicePaymentLink({
        invoiceId: invoice.id,
        amountRupees: invoice.amount,
        clientEmail: email,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
      });
      const payLink =
        paymentData.success &&
        paymentData.url?.startsWith("https://rzp.io/")
          ? escapeHtml(paymentData.url)
          : null;
      const safeInvoiceNumber = escapeHtml(invoice.invoiceNumber);
      const subject =
        diffDays < 0
          ? `OVERDUE: Invoice ${invoice.invoiceNumber} is ${Math.abs(diffDays)} days late`
          : diffDays === 0
            ? `REMINDER: Invoice ${invoice.invoiceNumber} is due today`
            : `Upcoming Invoice ${invoice.invoiceNumber}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice Reminder</h2>
          <p>Hi ${escapeHtml(clientName)},</p>
          <p>This is an automated reminder regarding <strong>Invoice ${safeInvoiceNumber}</strong> for <strong>₹${invoice.amount.toLocaleString("en-IN")}</strong>.</p>
          ${diffDays < 0 ? `<p style="color: #dc2626; font-weight: bold;">This invoice is currently overdue.</p>` : ""}
          ${payLink ? `<p>You can view and securely pay your invoice below:</p><a href="${payLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Pay Invoice Now</a>` : ""}
          <p>If you have already paid, please ignore this email.</p>
          <p>Thank you,<br>ThePieCraft Marketing</p>
        </div>`;

      const emailResult = await sendEmail(email, subject, html);
      if (emailResult.success && !emailResult.skipped) emailsSent++;
      if (diffDays < 0 && invoice.status === "sent") {
        await db
          .update(schema.invoices)
          .set({ status: "overdue" })
          .where(eq(schema.invoices.id, invoice.id));
      }
    }

    return NextResponse.json({
      success: true,
      processed: unpaidInvoices.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
