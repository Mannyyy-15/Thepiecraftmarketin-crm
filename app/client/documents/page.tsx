"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  HardDrive,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { getClientDocuments } from "@/app/actions/crm";

type DocType = "PDF" | "DOCX" | "XLSX" | "ZIP" | "FIG" | "PNG" | "CSV";

const iconForType: Record<string, JSX.Element> = {
  PDF: <FileText className="h-4 w-4" />,
  DOCX: <FileText className="h-4 w-4" />,
  XLSX: <FileSpreadsheet className="h-4 w-4" />,
  CSV: <FileSpreadsheet className="h-4 w-4" />,
  ZIP: <Archive className="h-4 w-4" />,
  FIG: <ImageIcon className="h-4 w-4" />,
  PNG: <ImageIcon className="h-4 w-4" />,
};

const colorForType: Record<string, string> = {
  PDF: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  DOCX: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
  XLSX: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CSV: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ZIP: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FIG: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
  PNG: "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-300",
};

export default function ClientDocumentsPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchFiles = async () => {
    setIsLoading(true);
    const res = await getClientDocuments();
    if (res && res.success && res.data) {
      setFiles(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Folder helper calculations
  const formatFolderSize = (folderFiles: any[]) => {
    let totalKb = 0;
    folderFiles.forEach(f => {
      const sizeStr = f.size || "0 KB";
      const match = sizeStr.match(/^([\d.]+)\s*(KB|MB|GB|B)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === "B") totalKb += val / 1024;
        else if (unit === "KB") totalKb += val;
        else if (unit === "MB") totalKb += val * 1024;
        else if (unit === "GB") totalKb += val * 1024 * 1024;
      }
    });
    if (totalKb === 0) return "0 KB";
    if (totalKb < 1024) return `${totalKb.toFixed(0)} KB`;
    if (totalKb < 1024 * 1024) return `${(totalKb / 1024).toFixed(1)} MB`;
    return `${(totalKb / (1024 * 1024)).toFixed(1)} GB`;
  };

  // Standard Folders
  const folderCategories = [
    { name: "Brand Assets", label: "Brand Assets", accent: "from-teal-500 to-emerald-600", icon: ImageIcon },
    { name: "Contracts", label: "Contracts", accent: "from-indigo-500 to-indigo-700", icon: FileText },
    { name: "Client Briefs", label: "Deliverables", accent: "from-amber-500 to-rose-500", icon: Folder },
    { name: "Reports", label: "Reports", accent: "from-emerald-500 to-teal-650", icon: FileSpreadsheet },
  ];

  const folders = folderCategories.map((cat, idx) => {
    const fFiles = files.filter(f => f.folder === cat.name);
    return {
      id: `f-${idx}`,
      name: cat.name,
      label: cat.label,
      files: fFiles.length,
      size: formatFolderSize(fFiles),
      accent: cat.accent,
      icon: cat.icon
    };
  });

  const handleDownload = (name: string) => {
    alert(`Downloading ${name}...`);
  };

  const filtered = files
    .filter((d) => (activeFolder ? d.folder === activeFolder : true))
    .filter((d) => (d.name || "").toLowerCase().includes(query.toLowerCase()));

  // Dynamic storage computation
  let totalUsedKb = 0;
  files.forEach(f => {
    const sizeStr = f.size || "0 KB";
    const match = sizeStr.match(/^([\d.]+)\s*(KB|MB|GB|B)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      if (unit === "B") totalUsedKb += val / 1024;
      else if (unit === "KB") totalUsedKb += val;
      else if (unit === "MB") totalUsedKb += val * 1024;
      else if (unit === "GB") totalUsedKb += val * 1024 * 1024;
    }
  });
  const totalUsedGB = parseFloat((totalUsedKb / (1024 * 1024)).toFixed(2)) || 0.12;
  const totalCap = 10;
  const usagePct = (totalUsedGB / totalCap) * 100;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm font-semibold tracking-wide uppercase">Opening vault vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        eyebrow="Files"
        title="Documents"
        description="Brand assets, contracts, and deliverables — everything shared with you, in one place."
        actions={
          <>
            <Button variant="outline" size="md">
              <Plus className="h-4 w-4" />
              New folder
            </Button>
            <Button variant="portal" size="md">
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </>
        }
      />

      {/* Folder cards + storage */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {folders.map((f) => {
          const Icon = f.icon;
          const isActive = activeFolder === f.name;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(isActive ? null : f.name)}
              className={cn(
                "group text-left rounded-2xl border bg-white dark:bg-slate-900/60 p-5 transition-all cursor-pointer",
                isActive
                  ? "border-indigo-500 shadow-glow"
                  : "border-slate-200 dark:border-slate-800 hover:shadow-soft hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.accent} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                {isActive && <Badge variant="portal" dot>Active</Badge>}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{f.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {f.files} files • {f.size}
              </p>
            </button>
          );
        })}
      </div>

      {/* Storage strip */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300 flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Storage</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalUsedGB} GB of {totalCap} GB used
              </p>
            </div>
          </div>
          <div className="flex-1 sm:max-w-md">
            <Progress
              value={usagePct}
              size="sm"
              barClassName="bg-gradient-to-r from-portal-500 to-portal-600"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {(totalCap - totalUsedGB).toFixed(2)} GB remaining
            </p>
          </div>
          <Button variant="outline" size="sm">Upgrade storage</Button>
        </CardContent>
      </Card>

      {/* File list */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-850">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <CardTitle className="text-sm font-bold">
            {activeFolder ? folderCategories.find(c => c.name === activeFolder)?.label : "All Files"}
            {activeFolder && (
              <button
                onClick={() => setActiveFolder(null)}
                className="ml-2 text-xs font-semibold text-portal-600 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </CardTitle>
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="h-9 w-48 sm:w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40 text-slate-800 dark:text-white"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Folder</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Shared by</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Updated</th>
                <th className="px-5 py-3 text-left font-semibold">Size</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No files found in this vault matching "{query}".
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const catLabel = folderCategories.find(c => c.name === d.folder)?.label || d.folder;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", colorForType[d.type] || "bg-slate-100 text-slate-500")}>
                            {iconForType[d.type] ?? <File className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            {d.url ? (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-650 hover:underline truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                                {d.name} <span className="text-[10px] opacity-70">(Link ↗)</span>
                              </a>
                            ) : (
                              <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{d.name}</p>
                            )}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:hidden mt-0.5">
                              {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"} • {d.size}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <Badge variant="portal">{catLabel}</Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300 font-medium text-xs">{d.ownerName || "Admin"}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today"}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-300 font-semibold text-xs">{d.size}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => d.url ? window.open(d.url, "_blank") : handleDownload(d.name)}
                            aria-label="Download"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-portal-600 dark:hover:text-portal-300 hover:bg-portal-50 dark:hover:bg-portal-500/10 cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
