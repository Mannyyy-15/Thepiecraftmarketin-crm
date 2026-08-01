"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { redeemLoginLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

type AccessState = "checking" | "ready" | "redeeming" | "success" | "error" | "missing";
type Runtime = "checking" | "native" | "browser";

const LOGIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const APK_DOWNLOAD_PATH = "/downloads/thepiecraft-crm.apk";
const ACCESS_ORIGIN = "https://crm.thepiecraftmarketing.com";
const ACCESS_HOST = "crm.thepiecraftmarketing.com";
const ANDROID_PACKAGE = "com.thepiecraft.crm";

export default function SecureAccessPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [state, setState] = useState<AccessState>("checking");
  const [runtime, setRuntime] = useState<Runtime>("checking");
  const [error, setError] = useState("");
  const autoRedeemedToken = useRef("");
  const redemptionInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let isNativeRuntime = false;

    const captureFragment = () => {
      if (cancelled) return;
      const fragmentToken = window.location.hash.slice(1);
      const isValid = LOGIN_TOKEN_PATTERN.test(fragmentToken);
      setToken(isValid ? fragmentToken : "");
      setState(isValid ? "ready" : "missing");

      // A browser keeps the fragment so the verified link can be retried after
      // installation. Native captures it in memory and removes it immediately.
      if (isNativeRuntime && window.location.hash) {
        window.history.replaceState(null, "", "/access");
      }
    };

    const start = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        isNativeRuntime = Capacitor.isNativePlatform();
      } catch {
        isNativeRuntime = false;
      }

      if (cancelled) return;
      setRuntime(isNativeRuntime ? "native" : "browser");
      captureFragment();
      window.addEventListener("hashchange", captureFragment);
    };

    void start();
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", captureFragment);
    };
  }, []);

  const continueToAccount = useCallback(async () => {
    if (!token || state === "redeeming" || state === "success" || redemptionInFlight.current) return;

    redemptionInFlight.current = true;
    setState("redeeming");
    setError("");

    // Once redemption starts, the in-memory copy is sufficient for retries.
    if (window.location.hash) {
      window.history.replaceState(null, "", "/access");
    }

    try {
      const result = await redeemLoginLink(token);
      if (!result.success) {
        setError(result.error);
        setState("error");
        return;
      }

      setToken("");
      setState("success");
      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("We could not use this secure link. Please ask your administrator for a new one.");
      setState("error");
    } finally {
      redemptionInFlight.current = false;
    }
  }, [router, state, token]);

  useEffect(() => {
    if (
      runtime !== "native" ||
      state !== "ready" ||
      !token ||
      autoRedeemedToken.current === token
    ) {
      return;
    }

    autoRedeemedToken.current = token;
    void continueToAccount();
  }, [continueToAccount, runtime, state, token]);

  const isWorking = state === "checking" || state === "redeeming" || state === "success";
  const showInstallHandoff = runtime === "browser" && Boolean(token);
  const browserFallbackUrl = token ? `${ACCESS_ORIGIN}/access#${token}` : `${ACCESS_ORIGIN}/access`;
  const openAppIntent = token
    ? `intent://${ACCESS_HOST}/access?token=${token}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(browserFallbackUrl)};end`
    : browserFallbackUrl;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0f0f2] px-4 py-10 dark:bg-[#161618] sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_68%)]"
      />

      <section className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 dark:border-[#303030] dark:bg-[#1f1f1f] dark:shadow-black/30 sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure access
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          Continue to your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your administrator invited you to ThePieCraft OS. Confirm below to sign in—no
          password is needed for this visit.
        </p>

        {showInstallHandoff && state !== "success" && (
          <div className="mt-7 border-y border-slate-200 py-6 dark:border-[#303030]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Use the Android app
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Install the internal build, then open this same private link again. Your
                  one-time link stays in this tab until you continue.
                </p>
              </div>
            </div>

            <ol className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950">1</span>
                <span className="pt-0.5">Download and approve the internal APK on your Android device.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950">2</span>
                <span className="pt-0.5">Complete Android’s installation confirmation.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950">3</span>
                <span className="pt-0.5">Return here and choose “Open app again.”</span>
              </li>
            </ol>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                href={APK_DOWNLOAD_PATH}
                download
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#3b82f6] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2563eb] active:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#161618]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download APK
              </a>
              <a
                href={openAppIntent}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-[#303030] dark:bg-[#28282d] dark:text-slate-200 dark:hover:bg-[#38383f] dark:focus-visible:ring-offset-[#161618]"
              >
                Open app again
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Android will ask you to approve the download and installation. This page
              cannot install an APK silently.
            </p>
          </div>
        )}

        {state === "missing" && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            This link is incomplete. Open the full link your administrator shared, or ask
            them to create a new one.
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {error}
          </div>
        )}

        {state === "success" && (
          <div
            role="status"
            className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Signed in. Opening your workspace…
          </div>
        )}

        <Button
          type="button"
          size="lg"
          variant={showInstallHandoff ? "outline" : "primary"}
          className={`${showInstallHandoff ? "mt-4" : "mt-7"} w-full`}
          disabled={!token || isWorking}
          onClick={continueToAccount}
        >
          {isWorking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {state === "checking"
                ? "Checking secure link…"
                : state === "success"
                  ? "Opening workspace…"
                  : "Signing you in…"}
            </>
          ) : (
            <>
              {showInstallHandoff ? "Continue in browser" : "Continue securely"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          This private link works once and expires automatically. If you did not expect
          it, close this page without continuing.
        </p>
      </section>
    </main>
  );
}
