"use client";

import { Bell, Building2, CreditCard, KeyRound, Save, Shield, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/components/ui/cn";

const sections = [
  { key: "profile", label: "Profile", icon: User },
  { key: "workspace", label: "Workspace", icon: Building2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "security", label: "Security", icon: Shield },
  { key: "api", label: "API & Webhooks", icon: KeyRound },
] as const;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        on ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
      )}
      role="switch"
      aria-checked={on}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
          on ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState<typeof sections[number]["key"]>("profile");
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Manage your account, workspace, and integrations."
        actions={
          <Button size="md">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    onClick={() => setActive(s.key)}
                    className={cn(
                      "w-full inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
                      isActive
                        ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-6">
          {active === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar name="Priya Shah" size="xl" />
                  <div>
                    <Button variant="outline" size="sm">Upload photo</Button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">PNG or JPG, max 2MB.</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name"><input className={inputCls} defaultValue="Priya Shah" /></Field>
                  <Field label="Email"><input className={inputCls} type="email" defaultValue="priya@piecraft.com" /></Field>
                  <Field label="Role"><input className={inputCls} defaultValue="Lead Strategist" /></Field>
                  <Field label="Timezone">
                    <select className={inputCls}>
                      <option>America/New_York</option>
                      <option>Europe/London</option>
                      <option>Asia/Kolkata</option>
                    </select>
                  </Field>
                </div>
                <Field label="Bio" hint="Brief description for your team profile.">
                  <textarea
                    className={cn(inputCls, "h-24 py-2 resize-none")}
                    defaultValue="Strategist with 8+ years scaling DTC brands through paid + lifecycle."
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {active === "workspace" && (
            <Card>
              <CardHeader>
                <CardTitle>Workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Agency name"><input className={inputCls} defaultValue="ThePieCraft" /></Field>
                  <Field label="Public URL"><input className={inputCls} defaultValue="piecraft.com" /></Field>
                  <Field label="Currency">
                    <select className={inputCls}><option>USD</option><option>EUR</option><option>GBP</option></select>
                  </Field>
                  <Field label="Fiscal year start">
                    <select className={inputCls}><option>January</option><option>April</option><option>July</option></select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: "Email notifications", desc: "Get notified by email for important account activity.", val: emailNotif, set: setEmailNotif },
                  { label: "Push notifications", desc: "Receive real-time push alerts in the browser.", val: pushNotif, set: setPushNotif },
                  { label: "Weekly digest", desc: "A summary of agency performance every Monday.", val: weeklyDigest, set: setWeeklyDigest },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <Toggle on={item.val} onChange={item.set} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {active === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <Badge variant="brand">Studio Plan</Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl bg-brand-hero p-5 text-white">
                  <p className="text-xs uppercase tracking-widest text-white/80">Current plan</p>
                  <p className="mt-1 text-2xl font-bold">Studio — $349/mo</p>
                  <p className="text-sm text-white/80 mt-1">Unlimited clients, AI reports, white-label portal.</p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" size="sm">Change plan</Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">Cancel</Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Card on file</p>
                    <p className="mt-1 font-medium text-slate-900 dark:text-white">Visa •••• 4242</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Expires 09/27</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Next bill</p>
                    <p className="mt-1 font-medium text-slate-900 dark:text-white">June 01, 2026</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Auto-renew enabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="Current password"><input className={inputCls} type="password" /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="New password"><input className={inputCls} type="password" /></Field>
                  <Field label="Confirm password"><input className={inputCls} type="password" /></Field>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Two-factor authentication</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add an extra layer of security to your account.</p>
                  </div>
                  <Badge variant="success" dot>Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "api" && (
            <Card>
              <CardHeader>
                <CardTitle>API & Webhooks</CardTitle>
                <Button variant="outline" size="sm">
                  <KeyRound className="h-3.5 w-3.5" /> Generate key
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Live key</p>
                  <code className="block font-mono text-sm text-slate-900 dark:text-white tabular-nums truncate">
                    pk_live_••••••••••••••••••••f9b2
                  </code>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Created May 10, 2026 • Last used 2h ago
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
