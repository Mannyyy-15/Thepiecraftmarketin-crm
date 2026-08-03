"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BarChart3, CheckCircle2, Link2, RefreshCw, Search } from "lucide-react";
import { getMyOrganizations, listConnectorAccounts } from "@/app/actions/domain";
import {
  connectMarketingAccount,
  disconnectMarketingAccount,
} from "@/app/actions/integrations";

type Provider = "google_ads" | "meta_ads" | "ga4" | "search_console";
type Connector = {
  id: number;
  provider: Provider;
  displayName: string | null;
  externalAccountId: string;
  status: string;
  lastSyncedAt: Date | null;
};

const providers: Array<{
  id: Provider;
  name: string;
  description: string;
  credentialLabel: string;
}> = [
  { id: "google_ads", name: "Google Ads", description: "Campaign performance and offline enhanced conversions.", credentialLabel: "OAuth refresh token" },
  { id: "meta_ads", name: "Meta Ads + CAPI", description: "Insights, creative fatigue and server-side conversion events.", credentialLabel: "Long-lived access token" },
  { id: "ga4", name: "Google Analytics 4", description: "Acquisition, landing-page and outcome reporting.", credentialLabel: "OAuth refresh token" },
  { id: "search_console", name: "Search Console", description: "Search queries, pages, devices and site performance.", credentialLabel: "OAuth refresh token" },
];

export default function MarketingConnectors() {
  const [organizationId, setOrganizationId] = useState(0);
  const [organizationName, setOrganizationName] = useState("");
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState<Provider>("google_ads");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async (id: number) => {
    const result = await listConnectorAccounts(id);
    if (result.success) setConnectors(result.data as Connector[]);
    else setMessage(result.error || "Could not load connectors.");
  }, []);

  useEffect(() => {
    getMyOrganizations().then((result) => {
      if (result.success && result.data[0]) {
        setOrganizationId(result.data[0].id);
        setOrganizationName(result.data[0].name);
        void refresh(result.data[0].id);
      } else setMessage(result.error || "No organization is available.");
    });
  }, [refresh]);

  const connect = (formData: FormData) =>
    startTransition(async () => {
      const result = await connectMarketingAccount({
        organizationId,
        provider: selected,
        externalAccountId: String(formData.get("externalAccountId") || ""),
        displayName: String(formData.get("displayName") || ""),
        credential: String(formData.get("credential") || ""),
      });
      setMessage(result.success ? "Connector saved securely." : result.error || "Connection failed.");
      if (result.success) await refresh(organizationId);
    });

  return (
    <main className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Growth data</p>
        <h1 className="mt-1 text-2xl font-bold">Marketing integrations</h1>
        <p className="mt-1 text-sm text-slate-500">Connect {organizationName || "your organization"} to reporting, attribution and conversion feedback.</p>
      </header>
      {message && <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const connector = connectors.find((item) => item.provider === provider.id && item.status === "connected");
          return (
            <button key={provider.id} type="button" onClick={() => setSelected(provider.id)} className={`rounded-2xl border p-5 text-left transition ${selected === provider.id ? "border-indigo-500 ring-2 ring-indigo-500/15" : "border-slate-200 dark:border-[#303030]"} bg-white dark:bg-[#1f1f1f]`}>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-xl bg-slate-100 p-2 dark:bg-[#303030]">{provider.id === "search_console" ? <Search className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${connector ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{connector ? "Connected" : "Setup required"}</span>
              </div>
              <h2 className="mt-4 font-semibold">{provider.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{provider.description}</p>
              {connector && <p className="mt-3 text-xs text-slate-500">{connector.displayName} Â· {connector.externalAccountId}</p>}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#303030] dark:bg-[#1f1f1f]">
        <div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold">Configure {providers.find((item) => item.id === selected)?.name}</h2></div>
        <p className="mt-1 text-sm text-slate-500">Tokens are encrypted before storage and are never returned to the browser.</p>
        <form action={connect} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input required name="displayName" maxLength={255} placeholder="Connection name" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />
          <input required name="externalAccountId" maxLength={255} placeholder="Account / property ID" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-[#303030]" />
          <input required name="credential" type="password" minLength={20} autoComplete="off" placeholder={providers.find((item) => item.id === selected)?.credentialLabel} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm sm:col-span-2 dark:border-[#303030]" />
          <button disabled={pending || !organizationId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"><RefreshCw className="h-4 w-4" /> Encrypt and connect</button>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["UTM + click-ID attribution", "Budget pacing + anomalies", "Creative fatigue + profit", "Lead-quality feedback"].map((capability) => <div key={capability} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium dark:border-[#303030] dark:bg-[#1f1f1f]"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{capability}</div>)}
      </section>

      {connectors.filter((item) => item.status === "connected").map((connector) => (
        <button key={connector.id} disabled={pending} onClick={() => startTransition(async () => { await disconnectMarketingAccount(organizationId, connector.id); await refresh(organizationId); })} className="mr-2 text-xs font-medium text-rose-600">
          Disconnect {connector.displayName || connector.provider}
        </button>
      ))}
    </main>
  );
}
