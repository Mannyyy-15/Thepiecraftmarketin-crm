import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
}

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (
    !host ||
    !user ||
    !pass ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    tls: { servername: host, minVersion: "TLSv1.2" },
  });
  return cachedTransport;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = getTransport();
  if (!transport || !from) {
    console.error("[Mailer] SMTP is not configured.");
    return { success: false, skipped: true, error: "Email service unavailable" };
  }
  if (
    to.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    subject.length > 200 ||
    /[\r\n]/.test(subject) ||
    Buffer.byteLength(html, "utf8") > 512 * 1024
  ) {
    return { success: false, error: "Invalid email message" };
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Mailer] Message delivery failed:", error);
    return { success: false, error: "Failed to send email" };
  }
}
