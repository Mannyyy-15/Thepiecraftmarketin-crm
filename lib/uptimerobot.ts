export async function fetchUptimeMonitors() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  
  if (!apiKey) {
    return { success: false, error: "Uptime monitoring is not configured." };
  }

  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      // Fetch response times and 30-day uptime ratio
      body: `api_key=${apiKey}&format=json&response_times=1&response_times_limit=1&custom_uptime_ratios=30`,
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) throw new Error("Failed to fetch from UptimeRobot");

    const data = await res.json();
    if (data.stat !== "ok") throw new Error(data.error?.message || "UptimeRobot API returned error");

    const monitors = data.monitors.map((m: any) => ({
      url: m.url,
      uptimeRatio: parseFloat(m.custom_uptime_ratio) || 0,
      averageResponseTime: m.response_times?.length > 0 ? m.response_times[0].value : 0,
      status: m.status // 2 is Up, 9 is Down, 0 is Paused, 1 is Not Checked Yet, 8 is Seems Down
    }));

    return { success: true, monitors };
  } catch (error) {
    console.error("[UptimeRobot] Monitor fetch failed:", error);
    return { success: false, error: "Could not load uptime monitoring data." };
  }
}
