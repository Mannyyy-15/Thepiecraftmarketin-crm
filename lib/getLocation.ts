// Client-side geolocation helper for geofenced punch in/out.
// Requests permission (native + web), detects GPS-off, and enforces accuracy.

export const MAX_ACCURACY_METERS = 150;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export type LocationResult =
  | { ok: true; lat: number; lng: number; accuracy: number; bssid: string | null }
  | { ok: false; reason: "permission" | "gps-off" | "accuracy" | "unsupported" | "timeout"; message: string };

// On native (Capacitor) the OS runtime location permission must be granted
// before the WebView's navigator.geolocation will work. No-op on web.
export async function ensureNativeLocationPermission(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return true;
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted" || status.coarseLocation === "granted") return true;
    const req = await Geolocation.requestPermissions({ permissions: ["location"] });
    return req.location === "granted" || req.coarseLocation === "granted";
  } catch {
    // Plugin unavailable (pure web) — let the browser handle the prompt.
    return true;
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

/**
 * Acquire a validated, high-accuracy fix. Returns a discriminated result the
 * caller can map to a small toast.
 */
export async function getValidatedLocation(): Promise<LocationResult> {
  const granted = await ensureNativeLocationPermission();
  let bssid: string | null = null;
  
  if (granted) {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { CapacitorWifi } = await import("@capgo/capacitor-wifi");
        const wifiInfo = await CapacitorWifi.getWifiInfo();
        if (wifiInfo.bssid) {
          bssid = wifiInfo.bssid;
        }
      }
    } catch (e) {
      console.warn("Failed to get BSSID", e);
    }
  }
  if (!granted) {
    return { ok: false, reason: "permission", message: "Enable location permission to punch." };
  }

  try {
    const pos = await getCurrentPosition();
    const { latitude, longitude, accuracy } = pos.coords;

    if (accuracy > MAX_ACCURACY_METERS) {
      return { ok: false, reason: "accuracy", message: "Move outdoors — GPS too weak." };
    }
    return { ok: true, lat: latitude, lng: longitude, accuracy, bssid };
  } catch (err: any) {
    // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
    if (code === 1) return { ok: false, reason: "permission", message: "Location permission denied." };
    if (code === 2) return { ok: false, reason: "gps-off", message: "Turn on device location (GPS)." };
    if (code === 3) return { ok: false, reason: "timeout", message: "Location timed out. Retry." };
    if (err?.message === "unsupported") return { ok: false, reason: "unsupported", message: "Location not supported." };
    return { ok: false, reason: "gps-off", message: "Turn on device location (GPS)." };
  }
}
