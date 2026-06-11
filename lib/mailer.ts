import nodemailer, { type Transporter } from "nodemailer";

// SMTP transport built from environment variables. Designed for Hostinger
// business email but works with any SMTP provider (Gmail, Office365, etc.).
//
// Required env vars (set in .env.local locally and in Vercel for production):
//   SMTP_HOST       e.g. smtp.hostinger.com
//   SMTP_PORT       e.g. 465 (SSL) or 587 (STARTTLS)
//   SMTP_USER       full mailbox address, e.g. noreply@thepiecraft.com
//   SMTP_PASS       mailbox password
//   SMTP_FROM       optional display sender, e.g. "ThePieCraft CRM <noreply@thepiecraft.com>"
//                   (falls back to SMTP_USER if unset)

let cached: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT) || 465;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cached;
}

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Sends an email via SMTP. If SMTP isn't configured, it no-ops gracefully
 * (logs and returns success:true, skipped:true) so the app never crashes
 * when email credentials are absent.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[mailer] SMTP not configured — skipped email to ${to}: "${subject}"`);
    return { success: true, skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  try {
    const info = await transport.sendMail({ from, to, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[mailer] sendMail error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}
