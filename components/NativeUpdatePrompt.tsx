"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { shouldOfferAndroidUpdate } from "@/lib/mobile-update";

interface UpdateManifest {
  platform: "android";
  versionCode: number;
  versionName: string;
  minimumVersionCode: number;
  apkUrl: string;
  sha256: string;
  title: string;
  notes: readonly string[];
}

interface AppUpdaterPlugin {
  install(options: { url: string; sha256: string }): Promise<{
    status: "permission_required" | "installer_opened";
  }>;
  addListener(
    eventName: "downloadProgress",
    listener: (event: { percent: number }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater");
const SNOOZE_KEY = "thepiecraft.native-update.snoozed-until";
const HOSTED_RELEASE_KEY = "thepiecraft.hosted-release";

export default function NativeUpdatePrompt() {
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [hostedRelease, setHostedRelease] = useState("");
  const [installedVersion, setInstalledVersion] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "downloading" | "permission">("idle");
  const [error, setError] = useState("");
  const retryAfterPermission = useRef(false);

  const checkHostedRelease = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const response = await fetch("/api/app-build", { cache: "no-store" });
      if (!response.ok) return;
      const { releaseId } = (await response.json()) as { releaseId?: string };
      if (!releaseId || releaseId === "local-development") return;
      const installedRelease = window.localStorage.getItem(HOSTED_RELEASE_KEY);
      if (!installedRelease) {
        window.localStorage.setItem(HOSTED_RELEASE_KEY, releaseId);
      } else if (installedRelease !== releaseId) {
        setHostedRelease(releaseId);
      }
    } catch {
      // The currently loaded release remains usable when offline.
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !== "android" ||
      !Capacitor.isPluginAvailable("AppUpdater")
    ) return;
    try {
      const [appInfo, response] = await Promise.all([
        App.getInfo(),
        fetch("/api/mobile-update", { cache: "no-store" }),
      ]);
      if (!response.ok) return;
      const nextManifest = (await response.json()) as UpdateManifest;
      const currentVersion = Number.parseInt(appInfo.build, 10);
      if (
        nextManifest.sha256 === "PENDING_RELEASE_SHA256" ||
        !/^[a-f0-9]{64}$/i.test(nextManifest.sha256) ||
        !shouldOfferAndroidUpdate(currentVersion, nextManifest.versionCode)
      ) {
        setManifest(null);
        return;
      }
      const snoozedUntil = Number(window.localStorage.getItem(SNOOZE_KEY) || 0);
      if (Date.now() < snoozedUntil && currentVersion >= nextManifest.minimumVersionCode) return;
      setInstalledVersion(currentVersion);
      setManifest(nextManifest);
    } catch {
      // Update checks must never interrupt normal CRM use.
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!manifest || status === "downloading") return;
    setError("");
    setProgress(0);
    setStatus("downloading");
    try {
      const result = await AppUpdater.install({
        url: manifest.apkUrl,
        sha256: manifest.sha256,
      });
      if (result.status === "permission_required") {
        retryAfterPermission.current = true;
        setStatus("permission");
      }
    } catch (updateError) {
      setStatus("idle");
      setError(updateError instanceof Error ? updateError.message : "The update could not be installed.");
    }
  }, [manifest, status]);

  useEffect(() => {
    void checkHostedRelease();
    void checkForUpdate();
    let progressListener: { remove: () => Promise<void> } | undefined;
    let appStateListener: { remove: () => Promise<void> } | undefined;

    if (Capacitor.isPluginAvailable("AppUpdater")) {
      void AppUpdater.addListener("downloadProgress", ({ percent }) => {
        setProgress(Math.max(0, Math.min(100, Math.round(percent))));
      }).then((listener) => { progressListener = listener; });
    }

    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      if (retryAfterPermission.current) {
        retryAfterPermission.current = false;
        setStatus("idle");
        window.setTimeout(() => void installUpdate(), 250);
      } else {
        void checkHostedRelease();
        void checkForUpdate();
      }
    }).then((listener) => { appStateListener = listener; });

    return () => {
      void progressListener?.remove();
      void appStateListener?.remove();
    };
  }, [checkForUpdate, checkHostedRelease, installUpdate]);

  if (hostedRelease) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="hosted-update-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-[#38383f] bg-[#1f1f1f] shadow-2xl">
          <div className="px-5 py-6 sm:px-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">Update ready</p>
            <h2 id="hosted-update-title" className="mt-1 text-base font-semibold text-white">The latest CRM changes are ready</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Apply the update inside the app. Your account stays signed in and Chrome will not open.</p>
          </div>
          <div className="border-t border-[#303030] px-5 py-4 sm:px-6">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                window.localStorage.setItem(HOSTED_RELEASE_KEY, hostedRelease);
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Update now
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!manifest) return null;

  const required = installedVersion < manifest.minimumVersionCode;
  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="native-update-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#38383f] bg-[#1f1f1f] shadow-2xl"
      >
        <div className="border-b border-[#303030] px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">Version {manifest.versionName}</p>
              <h2 id="native-update-title" className="mt-1 text-base font-semibold text-white">{manifest.title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">The update downloads securely inside ThePieCraft CRM. Chrome will not open.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <ul className="space-y-2 text-sm leading-5 text-slate-300">
            {manifest.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>

          {status === "downloading" && (
            <div aria-live="polite">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span>Downloading update</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#303030]">
                <div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === "permission" && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-200">
              Allow “Install unknown apps” for ThePieCraft CRM, then return here. The download will continue automatically.
            </p>
          )}
          {error && <p className="text-xs leading-5 text-rose-300" role="alert">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#303030] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {!required && status !== "downloading" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 6 * 60 * 60 * 1000));
                setManifest(null);
              }}
            >
              Remind me later
            </Button>
          )}
          <Button type="button" onClick={() => void installUpdate()} disabled={status === "downloading"} className="min-w-40">
            {status === "downloading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {status === "downloading" ? "Downloading…" : "Update inside app"}
          </Button>
        </div>
      </section>
    </div>
  );
}
