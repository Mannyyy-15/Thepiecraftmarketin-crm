"use server";

import { headers, cookies } from "next/headers";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { decrypt } from "./auth";
import { extractClientIp } from "@/lib/geofence";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PunchResult {
  success: boolean;
  message: string;
  /** Only present when success is true */
  logId?: number;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Validates the employee is:
 *   1. Authenticated (session cookie)
 *   2. Connected to the authorised office Wi-Fi (IP match)
 *   3. Physically inside the geofence (Haversine distance <= radius)
 *
 * locationId and coordinates come from the client, but ALL security checks
 * run server-side. The userId is always taken from the verified session.
 */
export async function processPunchAction(
  locationId: number,
  userLat: number,
  userLng: number,
  type: "IN" | "OUT"
): Promise<PunchResult> {

  // -- 1. Auth --------------------------------------------------------------
  const token = cookies().get("token")?.value;
  if (!token) return { success: false, message: "Not authenticated. Please log in." };

  const session = await decrypt(token);
  if (!session?.id) return { success: false, message: "Invalid session. Please log in again." };

  const userId = session.id as number;

  if (!db) return { success: false, message: "Database is not connected." };

  // -- 2. Validate inputs ---------------------------------------------------
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return { success: false, message: "Invalid coordinates received." };
  }
  if (Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
    return { success: false, message: "Coordinates are out of valid range." };
  }
  if (type !== "IN" && type !== "OUT") {
    return { success: false, message: "Invalid punch type." };
  }

  // -- 3. Extract client IP -------------------------------------------------
  const headerMap = headers();
  const clientIp = extractClientIp(headerMap);

  // -- 4. Query location + Haversine distance in a single DB round-trip -----
  //
  // LEAST(1.0, ...) guards against floating-point values slightly > 1
  // that would make acos() return NULL in MySQL.
  //
  type LocationRow = {
    id: number;
    name: string;
    wifi_public_ip: string;
    radius_meters: number;
    distance_meters: number;
  };

  let rows: LocationRow[];
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        wifi_public_ip,
        radius_meters,
        ROUND(
          6371000 * acos(
            LEAST(1.0,
              cos(radians(${userLat})) * cos(radians(latitude))
                * cos(radians(longitude) - radians(${userLng}))
              + sin(radians(${userLat})) * sin(radians(latitude))
            )
          ),
          2
        ) AS distance_meters
      FROM locations
      WHERE id = ${locationId}
      LIMIT 1
    `);

    // Drizzle execute returns [rows, fields] for mysql2 in default mode
    rows = (Array.isArray(result) ? result[0] : result) as unknown as LocationRow[];
  } catch (err: any) {
    console.error("[punch] DB query error:", err);
    return { success: false, message: "Unable to query location data. Try again." };
  }

  if (!rows || rows.length === 0) {
    return { success: false, message: "Location not found." };
  }

  const loc = rows[0];

  // -- 5. Wi-Fi / IP validation ---------------------------------------------
  if (clientIp === "unknown") {
    // In local dev (no proxy) we can't determine a real public IP. Allow only
    // in development for local testing; always block in production.
    if (process.env.NODE_ENV === "production") {
      return { success: false, message: "Could not determine your network. Please connect to the office Wi-Fi." };
    }
  } else if (clientIp !== loc.wifi_public_ip) {
    return {
      success: false,
      message: `Not connected to the authorized Office Wi-Fi network. (Your IP: ${clientIp})`,
    };
  }

  // -- 6. Geofence validation -----------------------------------------------
  const distance = Number(loc.distance_meters);
  const radius   = Number(loc.radius_meters);

  if (distance > radius) {
    const overshoot = Math.round(distance - radius);
    return {
      success: false,
      message: `You are outside the office geofence — ${Math.round(distance)}m from "${loc.name}" (allowed radius: ${radius}m). Move ${overshoot}m closer and try again.`,
    };
  }

  // -- 7. Insert punch log --------------------------------------------------
  try {
    const inserted = await db.insert(schema.attendanceLogs).values({
      userId,
      locationId,
      punchType: type,
      verifiedIp: clientIp === "unknown" ? "dev-local" : clientIp,
    });

    const logId = (inserted as any)[0]?.insertId as number | undefined;

    return {
      success: true,
      message: `Punch ${type} recorded successfully at "${loc.name}".`,
      logId,
    };
  } catch (err: any) {
    console.error("[punch] Insert error:", err);
    return { success: false, message: "Failed to save punch record. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Helper — fetch locations list for the UI dropdown
// ---------------------------------------------------------------------------

export async function getLocations() {
  if (!db) return { success: false, data: [] };
  try {
    const rows = await db.select({
      id:           schema.locations.id,
      name:         schema.locations.name,
      address:      schema.locations.address,
      radiusMeters: schema.locations.radiusMeters,
    }).from(schema.locations);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Office geofence settings (admin) — manage the punch-in location from the UI
// ---------------------------------------------------------------------------

export async function getOfficeLocation() {
  const token = cookies().get("token")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.id || session.role !== "admin") return { success: false, data: null };
  if (!db) return { success: false, data: null };
  try {
    const rows = await db.select().from(schema.locations).orderBy(schema.locations.id).limit(1);
    return { success: true, data: rows[0] || null };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

export interface OfficeLocationInput {
  name: string;
  address?: string;
  latitude: string | number;
  longitude: string | number;
  radiusMeters: number;
  wifiPublicIp: string;
  bssid?: string;
}

export async function updateOfficeLocation(input: OfficeLocationInput) {
  const token = cookies().get("token")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.id || session.role !== "admin") return { success: false, error: "Unauthorized." };
  if (!db) return { success: false, error: "Database not connected." };
  try {
    const values = {
      name: input.name?.trim() || "Office",
      address: input.address?.trim() || null,
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      radiusMeters: Number(input.radiusMeters) || 150,
      wifiPublicIp: input.wifiPublicIp?.trim() || "0.0.0.0",
      bssid: input.bssid?.trim() || null,
    };
    const existing = await db.select({ id: schema.locations.id }).from(schema.locations).orderBy(schema.locations.id).limit(1);
    if (existing.length > 0) {
      await db.update(schema.locations).set(values).where(eq(schema.locations.id, existing[0].id));
    } else {
      await db.insert(schema.locations).values(values);
    }
    return { success: true };
  } catch (err: any) {
    console.error("updateOfficeLocation error:", err);
    return { success: false, error: err.message };
  }
}

// Detect the server's view of the requesting client's public IP — used by the
// settings page "use my current network" helper.
export async function detectCurrentIp() {
  const token = cookies().get("token")?.value;
  const session = token ? await decrypt(token) : null;
  if (!session?.id || session.role !== "admin") return { success: false, ip: "" };
  let ip = extractClientIp(headers());
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);
  return { success: true, ip };
}
