"use client";

import { useEffect, useState, useTransition } from "react";
import { KeyRound, Laptop, ShieldCheck, Smartphone, History } from "lucide-react";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  listDeviceSessions,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
} from "@/app/actions/security";
import { getAuditLogs } from "@/app/actions/crm";

type DeviceSession = {
  sessionId: string;
  deviceName: string | null;
  lastSeenAt: Date;
  expiresAt: Date;
  createdAt: Date;
  current: boolean;
};

export default function SecurityCenter() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [secret, setSecret] = useState("");
  const [enrollmentUri, setEnrollmentUri] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const refreshSessions = () =>
    listDeviceSessions().then((result) => {
      if (result.success) setSessions(result.data as DeviceSession[]);
    });

  useEffect(() => {
    void refreshSessions();
    getAuditLogs().then((res) => {
      if (res.success && res.data) setAuditLogs(res.data);
    });
  }, []);

  const begin = () =>
    startTransition(async () => {
      const result = await beginTotpEnrollment();
      if (result.success) {
        setSecret(result.secret || "");
        setEnrollmentUri(result.enrollmentUri || "");
        setMessage("Add the secret to your authenticator, then verify a code.");
      } else setMessage(result.error || "Could not start MFA enrollment.");
    });

  const confirm = () =>
    startTransition(async () => {
      const result = await confirmTotpEnrollment(code);
      if (result.success) {
        setRecoveryCodes(result.recoveryCodes || []);
        setSecret("");
        setEnrollmentUri("");
        setCode("");
        setMessage("MFA is enabled. Save the recovery codes now.");
      } else setMessage(result.error || "Verification failed.");
    });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Security center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Protect your account with an authenticator and control signed-in devices.
        </p>
      </header>

      {message && (
        <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Authenticator MFA</h2>
            <p className="text-sm text-slate-500">Use any TOTP authenticator app. Secrets are encrypted at rest.</p>
          </div>
          {!secret && !recoveryCodes.length && (
            <button disabled={pending} onClick={begin} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              Set up
            </button>
          )}
        </div>

        {secret && (
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm">Manual setup key</p>
            <code className="block break-all rounded-lg bg-white p-3 text-sm dark:bg-slate-950">{secret}</code>
            <a className="inline-flex text-sm font-medium text-indigo-600 underline" href={enrollmentUri}>Open authenticator app</a>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="6-digit code" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              <button disabled={pending || !/^\d{6}$/.test(code)} onClick={confirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Verify and enable</button>
            </div>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" /> One-time recovery codes</div>
            <div className="mt-3 grid grid-cols-1 gap-2 font-mono text-sm sm:grid-cols-2">
              {recoveryCodes.map((recoveryCode) => <span key={recoveryCode}>{recoveryCode}</span>)}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Signed-in devices</h2>
            <p className="text-sm text-slate-500">Revocation takes effect on the next authenticated request.</p>
          </div>
          <button disabled={pending} onClick={() => startTransition(async () => { await revokeOtherDeviceSessions(); await refreshSessions(); })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">
            Sign out other devices
          </button>
        </div>
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {sessions.map((session) => (
            <div key={session.sessionId} className="flex items-center gap-3 py-4">
              {/mobile/i.test(session.deviceName || "") ? <Smartphone className="h-5 w-5 text-slate-400" /> : <Laptop className="h-5 w-5 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.deviceName || "Unknown device"} {session.current && <span className="text-emerald-600">· This device</span>}</p>
                <p className="text-xs text-slate-500">Last active {new Date(session.lastSeenAt).toLocaleString()}</p>
              </div>
              {!session.current && (
                <button disabled={pending} onClick={() => startTransition(async () => { await revokeDeviceSession(session.sessionId); await refreshSessions(); })} className="text-sm font-medium text-rose-600">Revoke</button>
              )}
            </div>
          ))}
          {!sessions.length && <p className="py-5 text-sm text-slate-500">No active device sessions found.</p>}
        </div>
      </section>

      {/* Security Audit Trail & Activity Log */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold">Security Audit Trail & Activity Log</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Every security, permission, and system modification logged with full actor tracking.</p>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-96 overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{log.action}</span>
                  <span className="rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300 px-2 py-0.5 text-[10px] font-semibold">
                    {log.entityType}
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5">By {log.actorName || "System"} ({log.actorEmail || "system@crm"})</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {!auditLogs.length && <p className="py-4 text-xs text-slate-400">No security audit events recorded yet.</p>}
        </div>
      </section>
    </main>
  );
}
