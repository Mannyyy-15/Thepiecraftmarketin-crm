// Plain server-side module (NOT a "use server" action file) so it can be
// safely imported by multiple server-action files without violating the
// "every export must be an async function" rule of "use server" modules.

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export interface GeoValidation {
  ok: boolean;
  /** Short, user-facing reason when ok is false. */
  message: string;
  /** Machine-readable error code when ok is false. */
  code?: "NO_LOCATION" | "WIFI_MISMATCH" | "OUT_OF_RANGE";
  /** The location id that was validated against (when ok). */
  locationId?: number;
  /** The client IP that passed validation (when ok). */
  verifiedIp?: string;
}

export function extractClientIp(headerMap: Headers): string {
  // x-forwarded-for may be a comma-separated list; leftmost is the original client
  const forwarded = headerMap.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return (
    headerMap.get("x-real-ip") ??
    headerMap.get("cf-connecting-ip") ?? // Cloudflare
    headerMap.get("true-client-ip") ??   // Akamai / Cloudflare Enterprise
    "unknown"
  );
}

/**
 * Runs the office Wi-Fi (IP) + geofence (Haversine) checks against the first
 * configured location for the active organization. Server-side only. Messages are kept short so the UI
 * can show them in a small toast.
 */
export async function validateGeofence(organizationId: number, userLat: number, userLng: number, userBssid?: string): Promise<GeoValidation> {
  if (!db) return { ok: false, message: "Server not connected." };

  if (!Number.isInteger(organizationId) || organizationId <= 0 || !Number.isFinite(userLat) || !Number.isFinite(userLng) || Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
    return { ok: false, message: "Invalid location. Enable GPS and retry." };
  }

  let clientIp = extractClientIp(await headers());
  // Normalize IPv6-mapped IPv4 addresses (e.g. ::ffff:203.194.96.181 -> 203.194.96.181)
  if (clientIp.startsWith("::ffff:")) {
    clientIp = clientIp.substring(7);
  }

  type LocationRow = {
    id: number;
    name: string;
    wifi_public_ip: string;
    bssid: string | null;
    radius_meters: number;
    distance_meters: number;
  };

  let rows: LocationRow[];
  try {
    const result = await db.execute(sql`
      SELECT id, name, wifi_public_ip, bssid, radius_meters,
        ROUND(6371000 * acos(LEAST(1.0,
          cos(radians(${userLat})) * cos(radians(latitude))
            * cos(radians(longitude) - radians(${userLng}))
          + sin(radians(${userLat})) * sin(radians(latitude))
        )), 2) AS distance_meters
      FROM locations
      WHERE organization_id = ${organizationId}
      ORDER BY id
      LIMIT 1
    `);
    rows = (Array.isArray(result) ? result[0] : result) as unknown as LocationRow[];
  } catch (err) {
    console.error("[geofence] DB error:", err);
    return { ok: false, message: "Could not verify location. Try again." };
  }

  if (!rows || rows.length === 0) {
    return {
      ok: false,
      message: "Your admin has not set up an office location yet. Ask them to configure it in Settings → Office & Punch.",
      code: "NO_LOCATION",
    };
  }
  const loc = rows[0];

  // Wi-Fi BSSID Check
  if (process.env.NODE_ENV === "production") {
    // If we have an office BSSID configured in DB, we must strictly validate it
    if (loc.bssid && loc.bssid.trim().length > 0) {
      if (!userBssid || userBssid.toLowerCase() !== loc.bssid.toLowerCase()) {
        return {
          ok: false,
          message: "Please connect to the official office Wi-Fi network to clock in.",
          code: "WIFI_MISMATCH",
        };
      }
    }
  }
  // Geofence check
  const distance = Number(loc.distance_meters);
  const radius = Number(loc.radius_meters);
  if (distance > radius) {
    return {
      ok: false,
      message: `You're ${Math.round(distance)}m from office.`,
      code: "OUT_OF_RANGE",
    };
  }

  return { ok: true, message: "ok", locationId: loc.id, verifiedIp: clientIp === "unknown" ? "dev-local" : clientIp };
}
