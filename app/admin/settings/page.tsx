"use client";

import { useToast } from "@/providers/ToastProvider";
import { useState, useEffect } from "react";
import {
  Save, Building2, FileText, MapPin, Plug, Loader2, Wifi, Mail, KeyRound,
  Crosshair, Landmark, Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAgencySettings, updateAgencySettings, clearAllData } from "@/app/actions/crm";
import { getOfficeLocation, updateOfficeLocation, detectCurrentIp } from "@/app/actions/punch";

const SECTIONS = [
  { key: "profile",      label: "Agency Profile",   icon: Building2, desc: "Name, contact & branding" },
  { key: "invoice",      label: "Invoice Defaults", icon: FileText,  desc: "Tax, terms, bank details" },
  { key: "office",       label: "Office & Punch",   icon: MapPin,    desc: "Geofence & Wi-Fi" },
  { key: "integrations", label: "Integrations",     icon: Plug,      desc: "Payments & email" },
] as const;
type SectionKey = typeof SECTIONS[number]["key"];

const INPUT = "w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white placeholder:text-slate-400";
const LABEL = "block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

export default function SettingsPage() {
  const { toast } = useToast();
  const [active, setActive] = useState<SectionKey>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Agency settings
  const [s, setS] = useState<any>({
    agencyName: "ThePieCraft Marketing", baseCurrency: "INR", agencyLogoUrl: "",
    agencyEmail: "", agencyPhone: "", agencyWebsite: "", agencyAddress: "", gstNumber: "",
    invoiceTaxPercent: 0, invoicePaymentTerms: "", invoiceNotes: "", bankDetails: "",
    razorpayKeyId: "", razorpayKeySecret: "",
    smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "", smtpFrom: "",
  });
  const set = (patch: any) => setS((p: any) => ({ ...p, ...patch }));

  // Office location
  const [office, setOffice] = useState<any>({ name: "Office", address: "", latitude: "", longitude: "", radiusMeters: 150, wifiPublicIp: "", bssid: "" });
  const setOff = (patch: any) => setOffice((p: any) => ({ ...p, ...patch }));
  const [detectingIp, setDetectingIp] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, o] = await Promise.all([getAgencySettings(), getOfficeLocation()]);
      if (r?.success && r.data) {
        const d: any = r.data;
        setS((p: any) => ({
          ...p,
          ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== null && v !== undefined)),
          smtpPort: (d.smtpPort ?? 465).toString(),
          invoiceTaxPercent: d.invoiceTaxPercent ?? 0,
        }));
      }
      if (o?.success && o.data) {
        const d: any = o.data;
        setOffice({
          name: d.name || "Office", address: d.address || "",
          latitude: d.latitude || "", longitude: d.longitude || "",
          radiusMeters: d.radiusMeters || 150, wifiPublicIp: d.wifiPublicIp || "", bssid: d.bssid || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const saveSettings = async (fields: string[], label: string) => {
    setSaving(true);
    const payload: any = {};
    for (const f of fields) payload[f] = f === "smtpPort" ? parseInt(s[f] || "465", 10) : f === "invoiceTaxPercent" ? Number(s[f] || 0) : s[f];
    const res = await updateAgencySettings(payload);
    setSaving(false);
    toast(res.success ? `${label} saved.` : `Failed to save ${label.toLowerCase()}.`, res.success ? "success" : "error");
  };

  const saveOffice = async () => {
    if (!office.latitude || !office.longitude) { toast("Latitude & longitude are required.", "error"); return; }
    setSaving(true);
    const res = await updateOfficeLocation({
      name: office.name, address: office.address,
      latitude: office.latitude, longitude: office.longitude,
      radiusMeters: Number(office.radiusMeters), wifiPublicIp: office.wifiPublicIp, bssid: office.bssid,
    });
    setSaving(false);
    toast(res.success ? "Office location saved." : (res.error || "Failed to save office."), res.success ? "success" : "error");
  };

  const useCurrentIp = async () => {
    setDetectingIp(true);
    const res = await detectCurrentIp();
    setDetectingIp(false);
    if (res.success && res.ip) { setOff({ wifiPublicIp: res.ip }); toast(`Detected current IP: ${res.ip}`, "success"); }
    else toast("Could not detect IP (use the office network).", "error");
  };

  const useCurrentCoords = () => {
    if (!navigator.geolocation) { toast("Geolocation not available.", "error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOff({ latitude: pos.coords.latitude.toFixed(8), longitude: pos.coords.longitude.toFixed(8) }); toast("Coordinates captured.", "success"); },
      () => toast("Could not get location.", "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-brand-500" /></div>;
  }

  const SaveBar = ({ onClick, color = "bg-brand-600 hover:bg-brand-700" }: { onClick: () => void; color?: string }) => (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
      <Button onClick={onClick} disabled={saving} className={`${color} text-white font-bold gap-2`}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 pb-12">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration</p>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Section nav */}
        <div className="lg:w-64 shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-2">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const on = active === sec.key;
            return (
              <button key={sec.key} onClick={() => setActive(sec.key)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer border ${on
                  ? "bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900/40 text-brand-700 dark:text-brand-300"
                  : "bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-brand-300"}`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-brand-500/15" : "bg-slate-100 dark:bg-slate-800"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{sec.label}</p>
                  <p className="text-[10px] text-slate-400 truncate hidden lg:block">{sec.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* ── PROFILE ── */}
          {active === "profile" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 sm:p-6 space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Agency Profile</h2>
                <p className="text-xs text-slate-400 mt-0.5">Appears on invoices and client emails.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className={LABEL}>Agency name</label><input className={INPUT} value={s.agencyName} onChange={(e) => set({ agencyName: e.target.value })} /></div>
                <div><label className={LABEL}>Email</label><input className={INPUT} value={s.agencyEmail || ""} onChange={(e) => set({ agencyEmail: e.target.value })} placeholder="info@thepiecraft.com" /></div>
                <div><label className={LABEL}>Phone</label><input className={INPUT} value={s.agencyPhone || ""} onChange={(e) => set({ agencyPhone: e.target.value })} placeholder="+91…" /></div>
                <div><label className={LABEL}>Website</label><input className={INPUT} value={s.agencyWebsite || ""} onChange={(e) => set({ agencyWebsite: e.target.value })} placeholder="thepiecraftmarketing.com" /></div>
                <div><label className={LABEL}>GST / Tax number</label><input className={INPUT} value={s.gstNumber || ""} onChange={(e) => set({ gstNumber: e.target.value })} /></div>
                <div><label className={LABEL}>Base currency</label>
                  <select className={INPUT} value={s.baseCurrency} onChange={(e) => set({ baseCurrency: e.target.value })}>
                    <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div><label className={LABEL}>Logo URL</label><input className={INPUT} value={s.agencyLogoUrl || ""} onChange={(e) => set({ agencyLogoUrl: e.target.value })} placeholder="https://…/logo.png" /></div>
                <div className="sm:col-span-2"><label className={LABEL}>Business address</label><textarea className={`${INPUT} h-auto py-2.5`} rows={2} value={s.agencyAddress || ""} onChange={(e) => set({ agencyAddress: e.target.value })} /></div>
              </div>
              <SaveBar onClick={() => saveSettings(["agencyName", "agencyEmail", "agencyPhone", "agencyWebsite", "gstNumber", "baseCurrency", "agencyLogoUrl", "agencyAddress"], "Profile")} />
            </div>
          )}

          {/* ── INVOICE ── */}
          {active === "invoice" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 sm:p-6 space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="h-4 w-4 text-brand-500" /> Invoice Defaults</h2>
                <p className="text-xs text-slate-400 mt-0.5">Pre-fill new invoices with these values.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={LABEL}>Default tax / GST %</label><input type="number" className={INPUT} value={s.invoiceTaxPercent} onChange={(e) => set({ invoiceTaxPercent: e.target.value })} /></div>
                <div><label className={LABEL}>Default payment terms</label><input className={INPUT} value={s.invoicePaymentTerms || ""} onChange={(e) => set({ invoicePaymentTerms: e.target.value })} placeholder="50% advance, balance on delivery" /></div>
                <div className="sm:col-span-2"><label className={LABEL}><span className="inline-flex items-center gap-1"><Landmark className="h-3 w-3" /> Bank details</span></label><textarea className={`${INPUT} h-auto py-2.5`} rows={3} value={s.bankDetails || ""} onChange={(e) => set({ bankDetails: e.target.value })} placeholder="A/c name, A/c no., IFSC, UPI…" /></div>
                <div className="sm:col-span-2"><label className={LABEL}>Invoice footer note</label><textarea className={`${INPUT} h-auto py-2.5`} rows={2} value={s.invoiceNotes || ""} onChange={(e) => set({ invoiceNotes: e.target.value })} placeholder="Thank you for your business!" /></div>
              </div>
              <SaveBar onClick={() => saveSettings(["invoiceTaxPercent", "invoicePaymentTerms", "bankDetails", "invoiceNotes"], "Invoice defaults")} />
            </div>
          )}

          {/* ── OFFICE / GEOFENCE ── */}
          {active === "office" && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 sm:p-6 space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Office & Punch-in</h2>
                <p className="text-xs text-slate-400 mt-0.5">Employees can only punch in on the office Wi-Fi and within this radius.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className={LABEL}>Office name</label><input className={INPUT} value={office.name} onChange={(e) => setOff({ name: e.target.value })} /></div>
                <div>
                  <label className={LABEL}><span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3" /> Office public IP</span></label>
                  <div className="flex gap-2">
                    <input className={INPUT} value={office.wifiPublicIp} onChange={(e) => setOff({ wifiPublicIp: e.target.value })} placeholder="203.194.x.x" />
                    <button onClick={useCurrentIp} disabled={detectingIp} className="shrink-0 h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 cursor-pointer disabled:opacity-50">
                      {detectingIp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Use current"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Click “Use current” while on the office Wi-Fi.</p>
                </div>
                <div><label className={LABEL}>Wi-Fi BSSID (optional)</label><input className={INPUT} value={office.bssid} onChange={(e) => setOff({ bssid: e.target.value })} placeholder="00:11:22:33:44:55" /></div>
                <div><label className={LABEL}>Latitude</label><input className={INPUT} value={office.latitude} onChange={(e) => setOff({ latitude: e.target.value })} placeholder="19.42093505" /></div>
                <div><label className={LABEL}>Longitude</label><input className={INPUT} value={office.longitude} onChange={(e) => setOff({ longitude: e.target.value })} placeholder="72.81346274" /></div>
                <div>
                  <label className={LABEL}>Radius (metres)</label>
                  <input type="number" className={INPUT} value={office.radiusMeters} onChange={(e) => setOff({ radiusMeters: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <button onClick={useCurrentCoords} className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer inline-flex items-center justify-center gap-1.5">
                    <Crosshair className="h-3.5 w-3.5" /> Use my current location
                  </button>
                </div>
              </div>
              <SaveBar onClick={saveOffice} color="bg-emerald-600 hover:bg-emerald-700" />
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {active === "integrations" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-500" /> Razorpay</h2>
                  <p className="text-xs text-slate-400 mt-0.5">For automatic invoice payment links.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={LABEL}>Key ID</label><input type="password" className={`${INPUT} font-mono`} value={s.razorpayKeyId || ""} onChange={(e) => set({ razorpayKeyId: e.target.value })} placeholder="rzp_live_…" /></div>
                  <div><label className={LABEL}>Key Secret</label><input type="password" className={`${INPUT} font-mono`} value={s.razorpayKeySecret || ""} onChange={(e) => set({ razorpayKeySecret: e.target.value })} /></div>
                </div>
                <SaveBar onClick={() => saveSettings(["razorpayKeyId", "razorpayKeySecret"], "Razorpay")} color="bg-indigo-600 hover:bg-indigo-700" />
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail className="h-4 w-4 text-rose-500" /> Email (SMTP)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">For invoice reminders & client updates. Falls back to server env if left blank.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={LABEL}>SMTP host</label><input className={INPUT} value={s.smtpHost || ""} onChange={(e) => set({ smtpHost: e.target.value })} placeholder="smtp.hostinger.com" /></div>
                  <div><label className={LABEL}>Port</label><input type="number" className={INPUT} value={s.smtpPort} onChange={(e) => set({ smtpPort: e.target.value })} placeholder="465" /></div>
                  <div><label className={LABEL}>User (email)</label><input className={INPUT} value={s.smtpUser || ""} onChange={(e) => set({ smtpUser: e.target.value })} /></div>
                  <div><label className={LABEL}>Password</label><input type="password" className={INPUT} value={s.smtpPass || ""} onChange={(e) => set({ smtpPass: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={LABEL}>From name & address</label><input className={INPUT} value={s.smtpFrom || ""} onChange={(e) => set({ smtpFrom: e.target.value })} placeholder="ThePieCraft <info@thepiecraft.com>" /></div>
                </div>
                <SaveBar onClick={() => saveSettings(["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"], "Email settings")} color="bg-rose-600 hover:bg-rose-700" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DANGER ZONE ── */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-300">Danger Zone</h2>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 max-w-lg">
              Permanently deletes all users (employees &amp; clients), clients, projects, tasks, invoices, messages, and all related data. Admin account and agency settings are preserved. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button
            disabled={clearing}
            onClick={async () => {
              const confirm = window.confirm("⚠️ This will permanently delete ALL data — users, clients, projects, invoices, messages, tasks. Admin account and settings are kept.\n\nType OK to confirm.");
              if (!confirm) return;
              setClearing(true);
              const res = await clearAllData();
              setClearing(false);
              toast(res.success ? "All data cleared. Fresh start." : (res.error || "Failed to clear data."), res.success ? "success" : "error");
            }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {clearing ? "Clearing…" : "Clear all data"}
          </button>
        </div>
      </div>
    </div>
  );
}
