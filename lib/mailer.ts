import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  let settings: any = null;
  if (db) {
    try {
      settings = await db.query.agencySettings.findFirst();
    } catch (e) {
      // ignore
    }
  }

  const host = settings?.smtpHost || process.env.SMTP_HOST;
  const port = settings?.smtpPort || Number(process.env.SMTP_PORT) || 465;
  const user = settings?.smtpUser || process.env.SMTP_USER;
  const pass = settings?.smtpPass || process.env.SMTP_PASS;
  const from = settings?.smtpFrom || process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.warn(`[mailer] SMTP not configured - skipped email to ${to}: "${subject}"`);
    return { success: true, skipped: true };
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[mailer] sendMail error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}
