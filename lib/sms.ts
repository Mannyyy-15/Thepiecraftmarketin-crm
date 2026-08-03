import "server-only";

export interface SmsWhatsAppOptions {
  to: string;
  message: string;
  templateName?: string;
}

/**
 * Dispatches automated SMS and WhatsApp reminders to clients or team members.
 * Supports Twilio & Meta WhatsApp Business APIs with fallback logging in dev environments.
 */
export async function sendSmsWhatsAppNotification(options: SmsWhatsAppOptions): Promise<{
  success: boolean;
  provider?: "twilio" | "whatsapp" | "console";
  error?: string;
}> {
  const { to, message } = options;
  if (!to) return { success: false, error: "Recipient phone number is required." };

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const whatsappToken = process.env.WHATSAPP_API_TOKEN;

  try {
    // 1. Meta WhatsApp Business API integration if configured
    if (whatsappToken && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to.replace(/[^0-9]/g, ""),
            type: "text",
            text: { body: message },
          }),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        console.error("WhatsApp API error:", err);
        return { success: false, provider: "whatsapp", error: "WhatsApp dispatch failed." };
      }
      return { success: true, provider: "whatsapp" };
    }

    // 2. Twilio SMS Integration if configured
    if (twilioSid && twilioAuthToken && twilioPhone) {
      const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
      const body = new URLSearchParams({
        To: to,
        From: twilioPhone,
        Body: message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Twilio SMS error:", err);
        return { success: false, provider: "twilio", error: "Twilio SMS dispatch failed." };
      }
      return { success: true, provider: "twilio" };
    }

    // 3. Fallback dev/console mode
    console.log(`[SMS/WhatsApp Reminder Log] -> To: ${to} | Message: ${message}`);
    return { success: true, provider: "console" };
  } catch (error: any) {
    console.error("sendSmsWhatsAppNotification exception:", error);
    return { success: false, error: error?.message || "Failed to send SMS/WhatsApp reminder." };
  }
}
