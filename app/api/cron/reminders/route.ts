import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/mailer";
import { generatePaymentLink } from "@/app/actions/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Pull a billing email out of either the client's details JSON or the invoice
// payload JSON (clients have no dedicated email column).
function emailFromDetails(json: string | null | undefined): string {
  try {
    const d = JSON.parse(json || "{}");
    return d.email || d.contactEmail || d.billTo?.email || "";
  } catch { return ""; }
}

export async function GET(req: Request) {
  try {
    if (!db) return NextResponse.json({ success: false, error: "DB not connected" }, { status: 500 });

    // Authenticate the cron request (Vercel Cron / manual with CRON_SECRET).
    const authHeader = req.headers.get("Authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Unpaid invoices with a due date.
    const unpaidInvoices = await db.select().from(schema.invoices)
      .where(inArray(schema.invoices.status, ["sent", "overdue"]));

    const now = new Date();
    let emailsSent = 0;

    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;

      const dueDate = new Date(invoice.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const shouldRemind = [3, 0, -3, -7, -14].includes(diffDays);
      if (!shouldRemind) continue;

      // Resolve a recipient email: invoice payload first, then client record.
      let email = emailFromDetails(invoice.notes);
      let clientName = "there";
      if (invoice.clientId) {
        const clientRows = await db.select().from(schema.clients).where(eq(schema.clients.id, invoice.clientId)).limit(1);
        if (clientRows.length) {
          clientName = clientRows[0].name || clientName;
          if (!email) email = emailFromDetails(clientRows[0].details);
        }
      }
      if (!email) continue;

      const paymentData = await generatePaymentLink(
        invoice.id,
        invoice.amount,
        email,
        `Payment for Invoice ${invoice.invoiceNumber}`
      );
      const payLink = (paymentData as any)?.success ? (paymentData as any).url : "#";

      const subject = diffDays < 0
        ? `OVERDUE: Invoice ${invoice.invoiceNumber} is ${Math.abs(diffDays)} days late`
        : diffDays === 0
          ? `REMINDER: Invoice ${invoice.invoiceNumber} is due today`
          : `Upcoming Invoice ${invoice.invoiceNumber}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice Reminder</h2>
          <p>Hi ${clientName},</p>
          <p>This is an automated reminder regarding <strong>Invoice ${invoice.invoiceNumber}</strong> for <strong>₹${invoice.amount.toLocaleString("en-IN")}</strong>.</p>
          ${diffDays < 0 ? `<p style="color: #dc2626; font-weight: bold;">This invoice is currently overdue.</p>` : ""}
          ${payLink !== "#" ? `<p>You can view and securely pay your invoice below:</p>
          <a href="${payLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Pay Invoice Now</a>` : ""}
          <p>If you have already paid, please ignore this email.</p>
          <p>Thank you,<br>ThePieCraft Marketing</p>
        </div>`;

      await sendEmail(email, subject, html);
      emailsSent++;

      if (diffDays < 0 && invoice.status === "sent") {
        await db.update(schema.invoices).set({ status: "overdue" }).where(eq(schema.invoices.id, invoice.id));
      }
    }

    return NextResponse.json({ success: true, processed: unpaidInvoices.length, emailsSent });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
