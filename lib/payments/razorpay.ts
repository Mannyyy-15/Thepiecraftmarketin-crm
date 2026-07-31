import Razorpay from "razorpay";

export interface PaymentLinkResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createInvoicePaymentLink(input: {
  invoiceId: number;
  amountRupees: number;
  clientEmail: string;
  description: string;
}): Promise<PaymentLinkResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { success: false, error: "Payment provider is not configured." };
  }
  if (
    !Number.isSafeInteger(input.invoiceId) ||
    input.invoiceId <= 0 ||
    !Number.isSafeInteger(input.amountRupees) ||
    input.amountRupees <= 0 ||
    input.amountRupees > 10_000_000 ||
    input.clientEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail)
  ) {
    return { success: false, error: "Invalid payment-link request." };
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const paymentLink = await razorpay.paymentLink.create({
      amount: input.amountRupees * 100,
      currency: "INR",
      accept_partial: false,
      description: input.description.slice(0, 255),
      customer: { email: input.clientEmail },
      notify: { sms: false, email: true },
      reminder_enable: true,
      notes: { invoice_id: String(input.invoiceId) },
    });

    const url = paymentLink.short_url;
    if (typeof url !== "string" || !url.startsWith("https://rzp.io/")) {
      return {
        success: false,
        error: "Payment provider returned an invalid link.",
      };
    }
    return { success: true, url };
  } catch (error) {
    console.error("[Razorpay] Payment-link creation failed:", error);
    return { success: false, error: "Failed to create payment link." };
  }
}
