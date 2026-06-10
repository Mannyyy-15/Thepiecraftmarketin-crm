"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState } from "react";
import {
  Save,
  Building2,
  Mail,
  MapPin,
  Globe,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  BarChart3
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

type ConnectStatus = "disconnected" | "connecting" | "connected";

export default function SettingsPage() {
  const { toast, confirmDialog } = useToast();

  // Profile form local state
  const [agencyName, setAgencyName] = useState("ThePieCraft CRM");
  const [supportEmail, setSupportEmail] = useState("support@thepiecraft.com");
  const [address, setAddress] = useState("100 Innovation Way, Suite 400, Austin, TX");
  const [timezone, setTimezone] = useState("America/Chicago (CST)");
  const [isSaving, setIsSaving] = useState(false);

  // Integrations connection states
  const [metaStatus, setMetaStatus] = useState<ConnectStatus>("connected");
  const [stripeStatus, setStripeStatus] = useState<ConnectStatus>("disconnected");
  const [googleStatus, setGoogleStatus] = useState<ConnectStatus>("connected");

  // Notifications toggles states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [adSpendAlerts, setAdSpendAlerts] = useState(false);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = `settings-toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Profile save handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast("Successfully saved agency profile updates!", "success");
    }, 1200);
  };

  // Integration Connection simulation handler
  const handleToggleConnect = async (
    platform: string,
    currentStatus: ConnectStatus,
    setStatus: React.Dispatch<React.SetStateAction<ConnectStatus>>
  ) => {
    if (currentStatus === "connected") {
      if (await confirmDialog(`Are you sure you want to disconnect ${platform}? This will pause active data syncing.`)) {
        setStatus("disconnected");
        addToast(`Disconnected from ${platform}.`, "info");
      }
    } else if (currentStatus === "disconnected") {
      setStatus("connecting");
      setTimeout(() => {
        setStatus("connected");
        addToast(`Successfully synced and connected to ${platform}!`, "success");
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Building2 className="h-4.5 w-4.5 text-indigo-500" /> Agency Profile Setup
              </CardTitle>
              <CardDescription className="text-xs">
                Configure corporate identity properties and customer support channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Agency Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-850 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Support Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-850 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Physical Headquarters Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-850 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Operational Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-850 dark:text-white"
                    >
                      <option value="America/Chicago (CST)">Austin/Dallas America/Chicago (CST)</option>
                      <option value="America/New_York (EST)">New York/Boston America/New_York (EST)</option>
                      <option value="Europe/London (GMT)">London/EMEA Europe/London (GMT)</option>
                      <option value="Asia/Tokyo (JST)">Tokyo/APAC Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving Profile...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Profile Configuration
                        </>
                      )}
                    </Button>
                  </div>
                </div>

              </form>
            </CardContent>
          </Card>

          {/* Institutional Integrations Drawer */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Globe className="h-4.5 w-4.5 text-indigo-500" /> API Connections & Data Integrations
              </CardTitle>
              <CardDescription className="text-xs">
                Synchronize external marketing tools and transaction channels directly to the CRM analytics sparklines.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* Meta Ads Connection */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white">Meta Ads Manager</h3>
                    <Badge variant={metaStatus === "connected" ? "success" : "neutral"} className="text-[9px] font-extrabold uppercase py-0.5 px-1.5">
                      {metaStatus}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    Pulls impressions, click statistics, CTR conversion tracking, and campaign ROAS figures.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleConnect("Meta Ads Manager", metaStatus, setMetaStatus)}
                  disabled={metaStatus === "connecting"}
                  className={`h-9 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[90px] ${
                    metaStatus === "connected"
                      ? "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 text-slate-700 dark:text-slate-350"
                      : metaStatus === "connecting"
                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  }`}
                >
                  {metaStatus === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : metaStatus === "connected" ? (
                    "Disconnect"
                  ) : (
                    "Connect Link"
                  )}
                </button>
              </div>

              {/* Stripe Connection */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white">Stripe Billings Integration</h3>
                    <Badge variant={stripeStatus === "connected" ? "success" : "neutral"} className="text-[9px] font-extrabold uppercase py-0.5 px-1.5">
                      {stripeStatus}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    Manages invoice clearing status pings, process transaction ledgers, and cash revenue outstanding.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleConnect("Stripe Billings Integration", stripeStatus, setStripeStatus)}
                  disabled={stripeStatus === "connecting"}
                  className={`h-9 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[90px] ${
                    stripeStatus === "connected"
                      ? "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 text-slate-700 dark:text-slate-350"
                      : stripeStatus === "connecting"
                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  }`}
                >
                  {stripeStatus === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : stripeStatus === "connected" ? (
                    "Disconnect"
                  ) : (
                    "Connect Link"
                  )}
                </button>
              </div>

              {/* Google Analytics Connection */}
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white">Google Analytics (G4)</h3>
                    <Badge variant={googleStatus === "connected" ? "success" : "neutral"} className="text-[9px] font-extrabold uppercase py-0.5 px-1.5">
                      {googleStatus}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    Collects customer traffic channels, referral routes, bounce rates, and active website sessions.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleConnect("Google Analytics (G4)", googleStatus, setGoogleStatus)}
                  disabled={googleStatus === "connecting"}
                  className={`h-9 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 min-w-[90px] ${
                    googleStatus === "connected"
                      ? "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 text-slate-700 dark:text-slate-350"
                      : googleStatus === "connecting"
                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  }`}
                >
                  {googleStatus === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : googleStatus === "connected" ? (
                    "Disconnect"
                  ) : (
                    "Connect Link"
                  )}
                </button>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Right Side: Security & Alerts Configurations */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Real-time Notifications Config Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Notifications Config
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle alert pings for financial, team leave, and contract milestones.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Email Daily Briefing</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Receive daily summary digests at 8:00 AM.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={() => {
                    setEmailAlerts(!emailAlerts);
                    addToast(`Daily briefing email alerts ${!emailAlerts ? "activated" : "deactivated"}.`, "info");
                  }}
                  className="rounded text-brand-600 focus:ring-brand-500/40 h-4.5 w-4.5 border-slate-200 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">Ad Budget Spill Threshold</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Ping high priority alarm if ROAS falls below 1.5x.</p>
                </div>
                <input
                  type="checkbox"
                  checked={adSpendAlerts}
                  onChange={() => {
                    setAdSpendAlerts(!adSpendAlerts);
                    addToast(`Ad spend spill alerts ${!adSpendAlerts ? "activated" : "deactivated"}.`, "info");
                  }}
                  className="rounded text-brand-600 focus:ring-brand-500/40 h-4.5 w-4.5 border-slate-200 cursor-pointer"
                />
              </div>

            </CardContent>
          </Card>

          {/* System Security Credentials Card */}
          <Card className="border border-indigo-500/20 bg-indigo-50/5 dark:bg-indigo-500/5 shadow-md">
            <CardHeader className="border-b border-indigo-550/10 dark:border-slate-850 p-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> Security Credentials
              </CardTitle>
              <CardDescription className="text-xs">
                Manage corporate encryption keys, multi-factor tokens, and audit trails.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-normal">Encryption Standard</h4>
                  <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold">AES-256 GCM Enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 border-t border-indigo-500/10 pt-3">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-normal">Multi-factor Authentication</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Enforced for all contractor credentials</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => toast("MFA Reset token dispatched to Priya Shah's verified support email.", "info")}
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-350 dark:border-indigo-800 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer"
              >
                Reset Multi-Factor Token
              </button>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🚀 GLOWING TOASTS NOTIFICATIONS CENTER */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between gap-3 border transition-all animate-slideIn ${
              t.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500/20 text-amber-800 dark:text-amber-300"
                : t.type === "info"
                ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-350"
                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === "warning" ? "bg-amber-500/10 text-amber-500" : t.type === "info" ? "bg-slate-500/10 text-slate-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                <Check className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold leading-normal">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts(toasts.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

