"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  FileText,
  Filter,
  Plus,
  Sparkles,
  Search,
  X,
  Check,
  Trash2,
  Cpu,
} from "lucide-react";
import { ReportsPageSkeleton } from "@/components/ui/Skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getReports, createReport, deleteDocument, getReportsTrendAndAI } from "@/app/actions/crm";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

export default function ReportsPage() {
  const { toast, confirmDialog } = useToast();

  const [reports, setReports] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [liveAiSummary, setLiveAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  // Modals & AI States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Monthly");
  const [newClient, setNewClient] = useState("Acme Corp");

  // AI summary states
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Local Toasts Center
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = `rep-toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchReportsData = async () => {
    setIsLoading(true);
    const repRes = await getReports();
    const trendRes = await getReportsTrendAndAI();
    
    if (repRes && repRes.success && repRes.data) {
      setReports(repRes.data);
    }
    if (trendRes && trendRes.success && trendRes.data) {
      setMonthlyData(trendRes.data.monthlyData);
      setLiveAiSummary(trendRes.data.aiSummary);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const formattedTitle = newTitle.includes(".")
      ? newTitle.trim()
      : `${newTitle.trim()}.pdf`;

    const res = await createReport(formattedTitle, newType, newClient);
    if (res && res.success) {
      setNewTitle("");
      setShowCreateModal(false);
      addToast(`Successfully generated new "${newType}" report for ${newClient}!`);
      fetchReportsData();
    } else {
      addToast(res?.error || "Failed to compile report.", "warning");
    }
  };

  const handleDeleteReport = async (id: number, title: string) => {
    if (await confirmDialog(`Are you sure you want to permanently delete "${title}"?`)) {
      const res = await deleteDocument(id);
      if (res && res.success) {
        addToast(`Deleted "${title}" from records.`, "info");
        fetchReportsData();
      } else {
        addToast(res?.error || "Failed to delete report.", "warning");
      }
    }
  };

  const handleDownloadPDF = (title: string) => {
    addToast(`Initiating secure high-res PDF compile for "${title}"...`, "info");
    setTimeout(() => {
      addToast(`Successfully downloaded "${title}"!`);
    }, 1500);
  };

  // Simulate AI Report scanner using live statistics
  const handleTriggerAISummary = () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiStep(1);
    setAiResult(null);

    const steps = [
      "Querying global impressions, clicks & Meta ad accounts...",
      "Scoping contract parameters & active client milestones...",
      "Aggregating monthly contractor timesheet billables...",
      "Calculating target ROAS and performance multipliers...",
      "Compiling final executive agency digest..."
    ];

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep <= steps.length) {
        setAiStep(currentStep);
      } else {
        clearInterval(interval);
        setAiGenerating(false);
        setAiResult(liveAiSummary || `**EXECUTIVE DIGEST (CRM SYNTHESIS):**\n\nNo active telemetry found. Please verify project fees and contractor logs.`);
        addToast("Executive AI Summary generated successfully!");
      }
    }, 1000);
  };

  // Filtering logic
  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const titleMatch = (r.name || "").toLowerCase().includes(q);
    const clientMatch = (r.clientName || "").toLowerCase().includes(q);
    
    // Heuristically detect category from name or defaults
    const type = r.name?.toLowerCase().includes("monthly") ? "Monthly" :
                 r.name?.toLowerCase().includes("quarterly") ? "Quarterly" :
                 r.name?.toLowerCase().includes("seo") || r.name?.toLowerCase().includes("audit") ? "Audit" : "Custom";

    const matchesType = typeFilter === "All" || type === typeFilter;
    return (titleMatch || clientMatch) && matchesType;
  });

  if (isLoading) return <ReportsPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Auto-generated audits, custom analytics decks, and real-time agency metrics."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={handleTriggerAISummary} className="border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-xs flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
              AI Summary Digest
            </Button>
            <Button size="md" onClick={() => setShowCreateModal(true)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
              <Plus className="h-4 w-4 mr-1" />
              Create Report
            </Button>
          </div>
        }
      />

      {/* AI Summary Loading / Result Card */}
      {(aiGenerating || aiResult) && (
        <Card className="border border-indigo-500/25 bg-indigo-50/5 dark:bg-indigo-500/5 overflow-hidden animate-fadeIn">
          <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
              Strategic AI Analyst Desk
            </CardTitle>
            <CardDescription className="text-xs">Direct intelligence synthesis from live client sheets and active campaign boards.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {aiGenerating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-indigo-650 animate-ping" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {aiStep === 1 && "Querying global impressions, clicks & Meta ad accounts..."}
                    {aiStep === 2 && "Scoping contract parameters & active client milestones..."}
                    {aiStep === 3 && "Aggregating monthly contractor timesheet billables..."}
                    {aiStep === 4 && "Calculating target ROAS and performance multipliers..."}
                    {aiStep === 5 && "Compiling final executive agency digest..."}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(aiStep / 5) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setAiResult(null)}
                  className="absolute top-0 right-0 h-6 w-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="text-xs leading-relaxed text-slate-750 dark:text-slate-350 whitespace-pre-line pr-6">
                  {aiResult}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Growth Trend Chart Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Agency Growth Trend</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clients, projects, billable hours — last 6 months
            </p>
          </div>
          <select className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-705 dark:text-slate-255 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
            <option>Last 6 months</option>
            <option>YTD</option>
            <option>Last year</option>
          </select>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 12, right: 16, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12, opacity: 0.6 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(8,13,30,0.97)", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: 500 }}
                  itemStyle={{ color: "#ffffff", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                <Bar dataKey="clients" name="Clients" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="projects" name="Projects" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hours" name="Hours" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports Listing with Dynamic Interactive State */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-850">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filter generated PDFs or run instant client-facing conversion performance charts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter buttons */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 text-xs font-semibold">
              {["All", "Monthly", "Quarterly", "Custom", "Audit"].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    typeFilter === type
                      ? "bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Local Search input */}
            <div className="relative max-w-sm w-48 sm:w-56">
              <Search className="pointer-events-none absolute inset-y-0 left-2.5 h-full w-3.5 text-slate-400" />
              <input
                type="search"
                placeholder="Search title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
              />
            </div>

          </div>
        </CardHeader>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredReports.map((r) => {
            const cat = r.name?.toLowerCase().includes("monthly") ? "Monthly" :
                        r.name?.toLowerCase().includes("quarterly") ? "Quarterly" :
                        r.name?.toLowerCase().includes("seo") || r.name?.toLowerCase().includes("audit") ? "Audit" : "Custom";
            return (
              <div key={r.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 group">
                <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.name}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="brand">{cat}</Badge>
                    <span className="font-medium">{r.clientName || "Internal"}</span>
                    <span>•</span>
                    <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today"}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline tabular-nums">{r.size || "1.2 MB"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(r.name)} className="border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs">
                    <Download className="h-3.5 w-3.5 mr-1 text-emerald-500" /> <span className="hidden sm:inline">PDF</span>
                  </Button>
                  <button
                    onClick={() => handleDeleteReport(r.id, r.name)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                    title="Delete Report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="No reports found" description={searchQuery ? "Try a different search term." : "Create your first report to get started."} />
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 📁 MODAL: CREATE REPORT */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-indigo-500/25 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-indigo-500 animate-spin" /> Generate Strategic Report
                </CardTitle>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-655">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreateReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Report Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp — Conversion Audit"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Report Category</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-850 dark:text-white"
                    >
                      <option value="Monthly">Monthly Performance</option>
                      <option value="Quarterly">Quarterly Review</option>
                      <option value="Audit">Technical SEO Audit</option>
                      <option value="Custom">Custom Analytics Deck</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Roster</label>
                    <select
                      value={newClient}
                      onChange={(e) => setNewClient(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-850 dark:text-white"
                    >
                      <option value="Acme Corp">Acme Corp</option>
                      <option value="Stark Industries">Stark Industries</option>
                      <option value="Wayne Enterprises">Wayne Enterprises</option>
                      <option value="Globex">Globex</option>
                      <option value="Initech">Initech</option>
                      <option value="Hooli">Hooli</option>
                      <option value="Internal">Internal Agency</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Compile Report
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 GLOWING TOASTS NOTIFIER */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between gap-3 border transition-all animate-slideIn ${
              t.type === "info"
                ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20 text-indigo-800 dark:text-indigo-300"
                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === "info" ? "bg-indigo-500/10 text-indigo-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                <Check className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold leading-normal">{t.message}</span>
            </div>
            <button 
              onClick={() => setToasts(toasts.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
