"use server";

import { getCurrentUser } from "./auth";

export async function getDomainExpiry(domain: string) {
  try {
    const session = await getCurrentUser();
    if (!session || (session.role !== "admin" && session.role !== "employee")) {
      return { success: false, error: "Not authorized." };
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
      .split("/")[0]
      .replace(/\.$/, "");
    
    if (
      cleanDomain.length > 253 ||
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleanDomain)
    ) {
      return { success: false, error: "Invalid domain format" };
    }

    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`, {
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
      cache: "no-store",
    });
    if (!res.ok) {
      return { success: false, error: "Could not find domain data." };
    }
    const results = await res.json();
    
    const events = results.events || [];
    const expiryEvent = events.find((e: any) => e.eventAction === "expiration");
    const expiryDateStr = expiryEvent ? expiryEvent.eventDate : null;

    if (!expiryDateStr) {
      return { success: false, error: "Could not find expiry date in RDAP data." };
    }

    // Format to YYYY-MM-DD for the input type="date"
    const d = new Date(expiryDateStr);
    if (isNaN(d.getTime())) {
      return { success: false, error: "Found expiry date but could not parse it." };
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return { success: true, expiryDate: `${yyyy}-${mm}-${dd}` };

  } catch (error) {
    console.error("RDAP fetch error:", error);
    return { success: false, error: "Failed to fetch RDAP data." };
  }
}
