import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { and, eq, lt } from "drizzle-orm";
import { sendSmsWhatsAppNotification } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Automated Cron Endpoint for Overdue Invoices & Upcoming Shift Reminders.
 * Triggered periodically via Vercel Cron or custom scheduler.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) return NextResponse.json({ error: "Database not connected" }, { status: 500 });

    const todayStr = new Date().toLocaleDateString("en-CA");

    // 1. Find overdue invoices needing reminders
    const overdueInvoices = await db
      .select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        amount: schema.invoices.amount,
        dueDate: schema.invoices.dueDate,
        clientId: schema.invoices.clientId,
      })
      .from(schema.invoices)
      .where(and(
        eq(schema.invoices.status, "sent"),
        lt(schema.invoices.dueDate, todayStr)
      ))
      .limit(50);

    let remindersSent = 0;
    for (const inv of overdueInvoices) {
      if (!inv.clientId) continue;
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, inv.clientId))
        .limit(1);

      if (client) {
        let phone = "";
        try {
          const parsed = JSON.parse(client.details || "{}");
          phone = parsed.phone || parsed.contactPhone || "";
        } catch {}

        if (phone) {
          const message = `Hello ${client.name || "Franchise Partner"}, reminder from Irani Koyla HQ: Invoice #${inv.invoiceNumber} (₹${inv.amount.toLocaleString()}) was due on ${inv.dueDate}. Please make payment at your earliest.`;
          await sendSmsWhatsAppNotification({ to: phone, message });
          remindersSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedInvoices: overdueInvoices.length,
      remindersSent,
    });
  } catch (error: any) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error?.message || "Failed to process reminders" }, { status: 500 });
  }
}
