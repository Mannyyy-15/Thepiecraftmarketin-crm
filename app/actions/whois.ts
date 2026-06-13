 "use server";

export async function getDomainExpiry(domain: string) {
  try {
    const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    
    if (!cleanDomain || !cleanDomain.includes(".")) {
      return { success: false, error: "Invalid domain format" };
    }

    const res = await fetch(`https://rdap.org/domain/${cleanDomain}`);
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

  } catch (error: any) {
    console.error("RDAP fetch error:", error);
    return { success: false, error: error.message || "Failed to fetch RDAP data." };
  }
}
