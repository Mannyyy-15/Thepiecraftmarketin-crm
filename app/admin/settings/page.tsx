"use client";

import { useToast } from "@/providers/ToastProvider";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save, User, Building, Webhook, Key, Shield, Upload } from "lucide-react";
import { getAgencySettings, updateAgencySettings } from "@/app/actions/crm";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("agency");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Agency Settings State
  const [agencyName, setAgencyName] = useState("ThePieCraft");
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [logoUrl, setLogoUrl] = useState("");

  // Integrations State
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getAgencySettings();
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.agencyName) setAgencyName(d.agencyName);
        if (d.baseCurrency) setBaseCurrency(d.baseCurrency);
        if (d.agencyLogoUrl) setLogoUrl(d.agencyLogoUrl);
        if (d.razorpayKeyId) setRazorpayKeyId(d.razorpayKeyId);
        if (d.razorpayKeySecret) setRazorpayKeySecret(d.razorpayKeySecret);
        if (d.smtpHost) setSmtpHost(d.smtpHost);
        if (d.smtpPort) setSmtpPort(d.smtpPort.toString());
        if (d.smtpUser) setSmtpUser(d.smtpUser);
        if (d.smtpPass) setSmtpPass(d.smtpPass);
        if (d.smtpFrom) setSmtpFrom(d.smtpFrom);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateAgencySettings({
      agencyName,
      baseCurrency,
      agencyLogoUrl: logoUrl,
    });
    setIsSaving(false);
    if (res.success) toast("Agency settings saved successfully!", "success");
    else toast("Failed to save agency settings.", "error");
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateAgencySettings({
      razorpayKeyId,
      razorpayKeySecret,
      smtpHost,
      smtpPort: parseInt(smtpPort, 10),
      smtpUser,
      smtpPass,
      smtpFrom,
    });
    setIsSaving(false);
    if (res.success) toast("Integrations saved successfully!", "success");
    else toast("Failed to save integrations.", "error");
  };

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab("agency")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "agency" 
                ? "bg-brand-600/10 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Building className="h-4.5 w-4.5" /> Agency Details
          </button>
          
          <button
            onClick={() => setActiveTab("integrations")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "integrations" 
                ? "bg-brand-600/10 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            }`}
          >
            <Webhook className="h-4.5 w-4.5" /> Integrations & API
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "agency" && (
            <Card className="animate-fadeIn">
              <CardHeader>
                <CardTitle>Agency Details</CardTitle>
                <CardDescription>Manage your global brand settings</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAgency} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Agency Name</label>
                      <input
                        type="text"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Base Currency</label>
                      <select
                        value={baseCurrency}
                        onChange={(e) => setBaseCurrency(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button type="submit" disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Razorpay Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-500">
                    <Key className="h-5 w-5" /> Razorpay Integration
                  </CardTitle>
                  <CardDescription>Enable automatic invoice payment generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveIntegrations} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key ID</label>
                        <input
                          type="password"
                          placeholder="rzp_live_..."
                          value={razorpayKeyId}
                          onChange={(e) => setRazorpayKeyId(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key Secret</label>
                        <input
                          type="password"
                          value={razorpayKeySecret}
                          onChange={(e) => setRazorpayKeySecret(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Integrations"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Email/SMTP Setup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-500">
                    <Shield className="h-5 w-5" /> Email Settings (SMTP)
                  </CardTitle>
                  <CardDescription>Used for automated invoice reminders and client updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveIntegrations} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.hostinger.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SMTP Port</label>
                        <input
                          type="number"
                          placeholder="465"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SMTP User (Email)</label>
                        <input
                          type="email"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From Name & Address</label>
                        <input
                          type="text"
                          placeholder="ThePieCraft <hello@thepiecraft.com>"
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-sm focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Button type="submit" disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Email Settings"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
