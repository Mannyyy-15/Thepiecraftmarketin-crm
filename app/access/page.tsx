"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { redeemLoginLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

type AccessState = "ready" | "redeeming" | "success" | "error" | "missing";

export default function SecureAccessPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [state, setState] = useState<AccessState>("ready");
  const [error, setError] = useState("");

  useEffect(() => {
    const fragmentToken = window.location.hash.slice(1).trim();
    setToken(fragmentToken);
    setState(fragmentToken ? "ready" : "missing");

    // Keep the secret out of the visible address bar and browser history. The
    // token remains in component memory until the user explicitly continues.
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  async function continueToAccount() {
    if (!token || state === "redeeming") return;

    setState("redeeming");
    setError("");

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
    }
  }

  const isWorking = state === "redeeming" || state === "success";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0f0f2] px-4 py-10 dark:bg-[#161618] sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_68%)]"
      />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 dark:border-[#303030] dark:bg-[#1f1f1f] dark:shadow-black/30 sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
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
          Your administrator invited you to ThePieCraft CRM. Confirm below to sign in—no
          password is needed for this visit.
        </p>

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
          className="mt-7 w-full"
          disabled={!token || isWorking}
          onClick={continueToAccount}
        >
          {isWorking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {state === "success" ? "Opening workspace…" : "Signing you in…"}
            </>
          ) : (
            <>
              Continue securely
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
