"use client";

import { useCallback, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Download, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UpdateManifest {
  platform: string;
  versionCode: number;
  versionName: string;
  minimumVersionCode: number;
  apkUrl: string;
  sha256: string;
  title: string;
  notes: readonly string[];
}

const SNOOZE_KEY = "thepiecraft.native-update.snoozed-until";

export default function NativeUpdatePrompt() {
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [installedVersion, setInstalledVersion] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      let currentVersion = 1;
      if (Capacitor.isNativePlatform()) {
        try {
          const appInfo = await App.getInfo();
          currentVersion = Number.parseInt(appInfo.build, 10) || 1;
        } catch {
          /* default 1 */
        }
      }
      setInstalledVersion(currentVersion);

      const response = await fetch(`/api/mobile-update?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) return;

      const data = (await response.json()) as UpdateManifest;
      if (data.versionCode > currentVersion) {
        const snoozedUntil = Number(window.localStorage.getItem(SNOOZE_KEY) || 0);
        if (Date.now() < snoozedUntil && currentVersion >= data.minimumVersionCode) return;
        setManifest(data);
      } else {
        setManifest(null);
      }
    } catch (e) {
      console.warn("Mobile update check skipped:", e);
    }
  }, []);

  const handleInstall = async () => {
    if (!manifest) return;
    setIsDownloading(true);
    try {
      const downloadUrl = manifest.apkUrl.startsWith("http")
        ? manifest.apkUrl
        : `${window.location.origin}${manifest.apkUrl}`;
      window.location.href = downloadUrl;
    } catch {
      /* fallback */
    } finally {
      setTimeout(() => setIsDownloading(false), 3000);
    }
  };

  useEffect(() => {
    void checkForUpdate();

    let appStateListener: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void checkForUpdate();
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    return () => {
      void appStateListener?.remove();
    };
  }, [checkForUpdate]);

  if (!manifest) return null;

  const isMandatory = installedVersion < manifest.minimumVersionCode;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-brand-500/30 bg-[#12141c] p-6 shadow-2xl shadow-brand-500/20 text-white space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-400">
                PieCraft OS Update
              </span>
              <h3 className="text-base font-black text-white">
                v{manifest.versionName} Available
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            New Build #{manifest.versionCode}
          </span>
        </div>

        {/* Notes */}
        <div className="space-y-2.5 rounded-2xl bg-slate-900/60 p-4 border border-white/5">
          <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" /> What&apos;s new in this release:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {manifest.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {!isMandatory && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              onClick={() => {
                window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 6 * 60 * 60 * 1000));
                setManifest(null);
              }}
            >
              Later
            </Button>
          )}
          <Button
            type="button"
            className="flex-1 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold shadow-lg shadow-brand-500/25"
            onClick={handleInstall}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {isDownloading ? "Updating..." : "Update Now"}
          </Button>
        </div>

      </div>
    </div>
  );
}
