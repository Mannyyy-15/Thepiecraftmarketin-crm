import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/mailer";
import { generatePaymentLink } from "@/app/actions/crm";

// This endpoint should be protected if not using Vercel Cron.
// For Vercel Cron, Vercel injects an Authorization header.
export async function GET(req: Request) {
  try {
    // 1. Authenticate the cron request
    // Optional: require an API key in the header to prevent unauthorized triggers
    const authHeader = req.headers.get("Authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Find unpaid invoices that have a due date
    const unpaidInvoices = await db.query.invoices.findMany({
      where: inArray(schema.invoices.status, ["sent", "overdue"]),
    });

    const now = new Date();
    let emailsSent = 0;

    // 3. Process each invoice
    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;
      
      const dueDate = new Date(invoice.dueDate);
      // Calculate difference in days (ignoring time)
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // We send reminders at: 3 days before (diff = 3), On due date (diff = 0), and 3 days overdue (diff = -3)
      const shouldRemind = [3, 0, -3, -7, -14].includes(diffDays);

      if (shouldRemind) {
        // Fetch client to get email
        const client = await db.query.clients.findFirst({
          where: eq(schema.clients.id, invoice.clientId),
        });

        if (client && client.email) {
          // Attempt to generate a Razorpay payment link
          const paymentData = await generatePaymentLink(
            invoice.id,
            parseFloat(invoice.totalAmount),
            client.email,
            `Payment for Invoice #${invoice.id}`
          );
          
          const payLink = paymentData.success ? paymentData.url : "#";

          // Construct Email
          const subject = diffDays < 0 
            ? `OVERDUE: Invoice #${invoice.invoiceNumber} is ${Math.abs(diffDays)} days late`
            : diffDays === 0 
              ? `REMINDER: Invoice #${invoice.invoiceNumber} is due today`
              : `Upcoming Invoice #${invoice.invoiceNumber}`;

          const html = `
            <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto;">
              <h2>Invoice Reminder</h2>
              <p>Hi ${client.name},</p>
              <p>This is an automated reminder regarding <strong>Invoice #${invoice.invoiceNumber}</strong> for <strong>₹${invoice.totalAmount}</strong>.</p>
              ${diffDays < 0 ? `<p style="color: red; font-weight: bold;">This invoice is currently overdue.</p>` : ''}
              <p>You can view and securely pay your invoice by clicking the button below:</p>
              <a href="${payLink}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
                Pay Invoice Now
              </a>
              <p>If you have already paid, please ignore this email.</p>
              <p>Thank you,<br>ThePieCraft CRM</p>
            </div>
          `;

          await sendEmail(client.email, subject, html);
          emailsSent++;

          // If the invoice was 'sent' and is now overdue, update the status in the DB
          if (diffDays < 0 && invoice.status === "sent") {
            await db.update(schema.invoices)
              .set({ status: "overdue" })
              .where(eq(schema.invoices.id, invoice.id));
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: unpaidInvoices.length, emailsSent });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
