"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState } from "react";
import {
  Building2,
  Download,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Users,
  TrendingUp,
  Heart,
  Briefcase,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import KpiCard from "@/components/KpiCard";
import { clients } from "@/lib/mock";
import { getClientStatusVariant, getClientStatusLabel } from "@/lib/statusHelpers";

export default function EmployeeClientsPage() {
  const { toast, confirmDialog } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [onlyMyAccounts, setOnlyMyAccounts] = useState(true);
  const [composeEmailTo, setComposeEmailTo] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null);

  // Filter clients
  const filteredClients = clients.filter((c) => {
    // Owner filter
    if (onlyMyAccounts && c.owner !== "Priya Shah") {
      return false;
    }
    // Search query filter
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.industry.toLowerCase().includes(query) ||
      c.owner.toLowerCase().includes(query)
    );
  });

  // Calculate stats for Priya's managed portfolio
  const priyaClients = clients.filter((c) => c.owner === "Priya Shah");
  const activePriyaClients = priyaClients.filter((c) => c.status === "active");
  const onboardingPriya = priyaClients.filter((c) => c.status === "onboarding");
  const priyaMRR = priyaClients.reduce((sum, c) => sum + (c.status !== "churned" ? c.mrr : 0), 0);
  
  const totalPriyaHealth = priyaClients.reduce((sum, c) => sum + c.health, 0);
  const priyaAvgHealth = priyaClients.length > 0 ? Math.round(totalPriyaHealth / priyaClients.length) : 0;

  const handleComposeEmail = (clientName: string) => {
    setComposeEmailTo(clientName);
    setEmailSubject(`Strategy & Q3 Planning Alignment — ThePieCraft`);
    setEmailBody(`Hi team,\n\nI hope you're having a great week! I'd like to sync on our outstanding deliverables and map out our strategic focus for the upcoming quarter...\n\nBest,\nPriya Shah\nLead Strategist`);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setComposeEmailTo(null);
    setEmailSentMessage(`Email sent to "${composeEmailTo}" team successfully! 🚀`);
    setTimeout(() => {
      setEmailSentMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid for Priya's Portfolio */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Portfolio MRR"
          value={`$${priyaMRR.toLocaleString()}`}
          change="+12.4% vs last Q"
          changeType="positive"
          accent="brand"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Active Accounts"
          value={`${activePriyaClients.length}`}
          change={`${priyaClients.length} Total Assigned`}
          changeType="neutral"
          accent="emerald"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="In Onboarding"
          value={`${onboardingPriya.length}`}
          change="0 pending setup"
          changeType="positive"
          accent="amber"
          icon={<Building2 className="h-5 w-5" />}
        />
        <KpiCard
          title="Portfolio Health"
          value={`${priyaAvgHealth}%`}
          change={priyaAvgHealth > 75 ? "Excellent" : "Needs Review"}
          changeType={priyaAvgHealth > 75 ? "positive" : "negative"}
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
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-semibold">No clients match your filter criteria.</p>
                      <p className="text-xs">Try searching for something else or untoggle "Show Only My Managed Clients".</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c.logoBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                          {c.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{c.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Partnership since {c.since}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300 font-medium">{c.industry}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white tabular-nums">${c.mrr.toLocaleString()}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={c.health} size="sm" className="w-20" barClassName={c.health > 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : c.health > 40 ? "bg-gradient-to-r from-amber-500 to-amber-600" : "bg-gradient-to-r from-rose-500 to-rose-600"} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{c.health}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.owner} size="xs" />
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{c.owner}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge dot variant={getClientStatusVariant(c.status)}>{getClientStatusLabel(c.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleComposeEmail(c.name)}
                          aria-label="Email Stakeholders"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast(`Calling ${c.name} primary account manager... (Demo, "info")`)}
                          aria-label="Call Stakeholders"
                          className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="More"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
