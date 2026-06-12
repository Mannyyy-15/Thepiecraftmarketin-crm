"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Filter,
  Mail,
  Phone,
  Search,
  Users,
  TrendingUp,
  Heart,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import KpiCard from "@/components/KpiCard";
import { getClientStatusVariant, getClientStatusLabel } from "@/lib/statusHelpers";
import { getMyClients, getFreshUserProfile } from "@/app/actions/crm";

// Deterministic avatar gradient + initials derived from the client name, so
// real clients (which don't carry logoBg/initials) still render nicely.
const GRADIENTS = [
  "from-rose-500 to-orange-500", "from-amber-500 to-rose-500", "from-emerald-500 to-teal-500",
  "from-indigo-500 to-violet-500", "from-sky-500 to-indigo-500", "from-violet-600 to-fuchsia-600",
];
function clientVisual(name: string, id: number) {
  const initials = (name || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return { initials, logoBg: GRADIENTS[id % GRADIENTS.length] };
}

export default function EmployeeClientsPage() {
  const { toast } = useToast();

  const [allClients, setAllClients] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyMyAccounts, setOnlyMyAccounts] = useState(true);
  const [composeEmailTo, setComposeEmailTo] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cr, pr] = await Promise.all([getMyClients(), getFreshUserProfile()]);
        if (cr.success) setAllClients((cr.data as any[]) || []);
        if (pr.success && pr.data) setMe(pr.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const myName = me?.name || "";

  // Clients shown in the table (respecting the "only mine" + search filters)
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allClients.filter((c) => {
      if (onlyMyAccounts && !c.isMine) return false;
      if (!q) return true;
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.ownerName || "").toLowerCase().includes(q)
      );
    });
  }, [allClients, onlyMyAccounts, searchQuery]);

  // Portfolio KPIs: the employee's own managed accounts.
  const myClients = useMemo(() => allClients.filter(c => c.isMine), [allClients]);
  const activeMine = myClients.filter(c => c.status === "active");
  const onboardingMine = myClients.filter(c => c.status === "onboarding");
  const portfolioMRR = myClients.reduce((sum, c) => sum + (c.totalMRR || 0), 0);
  const avgHealth = myClients.length > 0
    ? Math.round(myClients.reduce((sum, c) => sum + (c.health || 0), 0) / myClients.length)
    : 0;

  const handleComposeEmail = (clientName: string) => {
    setComposeEmailTo(clientName);
    setEmailSubject(`Strategy & Planning Alignment — ThePieCraft`);
    setEmailBody(`Hi team,\n\nI'd like to sync on our outstanding deliverables and map out our strategic focus for the upcoming quarter.\n\nBest,\n${myName}`);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setComposeEmailTo(null);
    setEmailSentMessage(`Email drafted to "${composeEmailTo}" team.`);
    setTimeout(() => setEmailSentMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards — your managed client portfolio */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Portfolio MRR"
          value={`₹${portfolioMRR.toLocaleString()}`}
          change={`${myClients.length} accounts`}
          changeType="neutral"
          accent="brand"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Active Accounts"
          value={`${activeMine.length}`}
          change={`${myClients.length} Total Assigned`}
          changeType="neutral"
          accent="emerald"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="In Onboarding"
          value={`${onboardingMine.length}`}
          change={onboardingMine.length > 0 ? "In progress" : "All set up"}
          changeType="neutral"
          accent="amber"
          icon={<Building2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Portfolio Health"
          value={`${avgHealth}%`}
          change={avgHealth > 75 ? "Excellent" : avgHealth > 0 ? "Needs Review" : "—"}
          changeType={avgHealth > 75 ? "positive" : avgHealth > 0 ? "negative" : "neutral"}
          accent="portal"
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      {emailSentMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{emailSentMessage}</span>
        </div>
      )}

      {/* Composition Modal */}
      {composeEmailTo && (
        <Card className="border-brand-500/40 animate-slideDown">
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Compose Client Outreach</h3>
              <p className="text-xs text-slate-500">Sending strategic email update to {composeEmailTo} account stakeholders.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setComposeEmailTo(null)}>Cancel</Button>
          </div>
          <CardContent>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Message Body
                </label>
                <textarea
                  required
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setComposeEmailTo(null)}>
                  Discard
                </Button>
                <Button type="submit" className="bg-brand-600 text-white font-semibold">
                  Send Email Update
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main clients grid */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
          
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name or industry…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Interactive Toggle Switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
              <input
                type="checkbox"
                checked={onlyMyAccounts}
                onChange={(e) => setOnlyMyAccounts(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500/40 h-4 w-4"
              />
              Show Only My Managed Clients
            </label>

            <Button variant="outline" size="md">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Badge variant="brand">{filteredClients.length} visible</Badge>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Client Name</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Industry</th>
                <th className="px-5 py-3 text-left font-semibold">MRR</th>
                <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Health Status</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Account Owner</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-500" />
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-semibold">No clients to show.</p>
                      <p className="text-xs">{onlyMyAccounts ? "You have no assigned accounts yet — turn off \"Only my accounts\" to see all." : "Try a different search."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => {
                  const vis = clientVisual(c.name, c.id);
                  const contact = (() => { try { return JSON.parse(c.details || "{}"); } catch { return {}; } })();
                  const phone = contact.phone || contact.contactPhone || "";
                  const email = contact.email || contact.contactEmail || "";
                  return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${vis.logoBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                          {vis.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{c.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.projectCount} project{c.projectCount === 1 ? "" : "s"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300 font-medium capitalize">{(c.stage || "").replace(/_/g, " ") || "—"}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white tabular-nums">₹{(c.totalMRR || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={c.health} size="sm" className="w-20" barClassName={c.health > 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : c.health > 40 ? "bg-gradient-to-r from-amber-500 to-amber-600" : "bg-gradient-to-r from-rose-500 to-rose-600"} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{c.health}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {c.ownerName ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={c.ownerName} size="xs" />
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{c.ownerName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge dot variant={getClientStatusVariant(c.status)}>{getClientStatusLabel(c.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleComposeEmail(c.name)}
                          aria-label="Email stakeholders"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            aria-label={`Call ${c.name}`}
                            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        ) : (
                          <button
                            onClick={() => toast("No phone number on file for this client.", "info")}
                            aria-label="No phone on file"
                            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Showing 1–{filteredClients.length} of {filteredClients.length} clients</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
