"use client";

import { useState, useCallback } from "react";
import { LogIn, LogOut, Loader2, MapPin, ShieldCheck, AlertTriangle } from "lucide-react";
import { processPunchAction, type PunchResult } from "@/app/actions/punch";

// Reject readings worse than this (metres). Cell-tower fixes are typically
// 1000m+, real GPS is usually < 30m. 150m blocks fakes while tolerating drift.
const MAX_ACCURACY_METERS = 150;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

interface PunchButtonProps {
  /** The office location the employee is punching against. */
  locationId: number;
  /** Optional label for the location, shown in the helper row. */
  locationName?: string;
  /** Called after a successful punch so the parent can refresh data. */
  onPunched?: (type: "IN" | "OUT") => void;
}

type Feedback = { kind: "success" | "error" | "info"; text: string } | null;

// On native (Capacitor) the OS runtime location permission must be granted
// before the WebView's navigator.geolocation will work. Request it first.
// On the web this is a no-op (the browser prompts on getCurrentPosition).
async function ensureNativeLocationPermission(): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") {
      const req = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (req.location !== "granted" && req.coarseLocation !== "granted") {
        throw new Error(
          "Location permission denied. Enable location access for this app in your device settings."
        );
      }
    }
  } catch (err: any) {
    // If the plugin isn't available (pure web), swallow and continue.
    if (err?.message?.includes("Location permission denied")) throw err;
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function geoErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Enable location access and try again.";
    case err.POSITION_UNAVAILABLE:
      return "Location unavailable. Move to an open area and try again.";
    case err.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "Could not get your location.";
  }
}

export default function PunchButton({ locationId, locationName, onPunched }: PunchButtonProps) {
  const [loading, setLoading] = useState<"IN" | "OUT" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handlePunch = useCallback(
    async (type: "IN" | "OUT") => {
      if (loading) return;
      setLoading(type);
      setFeedback({ kind: "info", text: "Verifying your location…" });

      try {
        // 0. On native, make sure the OS location permission is granted.
        await ensureNativeLocationPermission();

        // 1. Acquire a fresh, high-accuracy fix.
        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;

        // 2. Reject low-accuracy (cell-tower) readings before hitting the server.
        if (accuracy > MAX_ACCURACY_METERS) {
          setFeedback({
            kind: "error",
            text: `GPS accuracy too low (±${Math.round(accuracy)}m). Move outdoors or near a window for a precise fix.`,
          });
          setLoading(null);
          return;
        }

        // 3. Server validates Wi-Fi IP + geofence and records the punch.
        const result: PunchResult = await processPunchAction(locationId, latitude, longitude, type);

        if (result.success) {
          setFeedback({ kind: "success", text: result.message });
          onPunched?.(type);
        } else {
          setFeedback({ kind: "error", text: result.message });
        }
      } catch (err: any) {
        const message =
          err && typeof err === "object" && "code" in err
            ? geoErrorMessage(err as GeolocationPositionError)
            : err?.message || "Something went wrong. Please try again.";
        setFeedback({ kind: "error", text: message });
      } finally {
        setLoading(null);
      }
    },
    [loading, locationId, onPunched]
  );

  const busy = loading !== null;

  return (
    <div className="w-full space-y-4">
      {/* Location context row */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
        <span>
          Punching at{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {locationName ?? "office location"}
          </span>
        </span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handlePunch("IN")}
          disabled={busy}
          aria-label="Punch in"
          className="group flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {loading === "IN" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Punch In
        </button>

        <button
          type="button"
          onClick={() => handlePunch("OUT")}
          disabled={busy}
          aria-label="Punch out"
          className="group flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          {loading === "OUT" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Punch Out
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          role="status"
          className={[
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium",
            feedback.kind === "success" &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            feedback.kind === "error" &&
              "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
            feedback.kind === "info" &&
              "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {feedback.kind === "success" && <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {feedback.kind === "error" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {feedback.kind === "info" && <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        You must be on the office Wi-Fi and physically inside the office to punch in or out. Location accuracy below ±{MAX_ACCURACY_METERS}m is required.
      </p>
    </div>
  );
}
