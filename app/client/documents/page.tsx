"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";

const folders = [
  { id: "f1", name: "Brand Assets", files: 24, size: "320 MB", accent: "from-portal-500 to-portal-700", icon: ImageIcon },
  { id: "f2", name: "Contracts", files: 8, size: "12 MB", accent: "from-brand-500 to-brand-700", icon: FileText },
  { id: "f3", name: "Deliverables", files: 42, size: "1.4 GB", accent: "from-amber-500 to-rose-500", icon: Folder },
  { id: "f4", name: "Reports", files: 14, size: "84 MB", accent: "from-emerald-500 to-teal-600", icon: FileSpreadsheet },
];

type DocType = "PDF" | "DOCX" | "XLSX" | "ZIP" | "FIG" | "PNG";

const documents: { id: string; name: string; type: DocType; size: string; updated: string; owner: string; folder: string }[] = [
  { id: "d1", name: "Acme — Brand Guidelines v3.pdf", type: "PDF", size: "4.2 MB", updated: "May 18, 2026", owner: "Lena Park", folder: "Brand Assets" },
  { id: "d2", name: "Master Services Agreement.pdf", type: "PDF", size: "880 KB", updated: "Mar 02, 2026", owner: "Aisha Rahman", folder: "Contracts" },
  { id: "d3", name: "Acme — Logo Pack.zip", type: "ZIP", size: "14.2 MB", updated: "Apr 22, 2026", owner: "Lena Park", folder: "Brand Assets" },
  { id: "d4", name: "May Performance Snapshot.xlsx", type: "XLSX", size: "62 KB", updated: "Jun 01, 2026", owner: "Jordan Wells", folder: "Reports" },
  { id: "d5", name: "Landing Page Mockups.fig", type: "FIG", size: "8.6 MB", updated: "May 20, 2026", owner: "Lena Park", folder: "Deliverables" },
  { id: "d6", name: "Hero Banner Variations.png", type: "PNG", size: "3.1 MB", updated: "May 16, 2026", owner: "Lena Park", folder: "Deliverables" },
  { id: "d7", name: "Q3 Strategy Brief.docx", type: "DOCX", size: "1.4 MB", updated: "May 14, 2026", owner: "Priya Shah", folder: "Deliverables" },
];

const iconForType: Record<DocType, JSX.Element> = {
  PDF: <FileText className="h-4 w-4" />,
  DOCX: <FileText className="h-4 w-4" />,
  XLSX: <FileSpreadsheet className="h-4 w-4" />,
  ZIP: <Archive className="h-4 w-4" />,
  FIG: <ImageIcon className="h-4 w-4" />,
  PNG: <ImageIcon className="h-4 w-4" />,
};

const colorForType: Record<DocType, string> = {
  PDF: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  DOCX: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
  XLSX: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ZIP: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FIG: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
  PNG: "bg-portal-50 dark:bg-portal-500/10 text-portal-600 dark:text-portal-300",
};

export default function ClientDocumentsPage() {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = documents
    .filter((d) => (activeFolder ? d.folder === activeFolder : true))
    .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  const totalUsed = 1.8; // GB
  const totalCap = 10;
  const usagePct = (totalUsed / totalCap) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Files"
        title="Documents"
        description="Brand assets, contracts, and deliverables — everything we share with you, in one place."
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
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
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
                  ? "border-portal-500 dark:border-portal-500 shadow-glow"
                  : "border-slate-200 dark:border-slate-800 hover:shadow-soft hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.accent} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                {isActive && <Badge variant="portal" dot>Active</Badge>}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{f.name}</p>
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
                {totalUsed} GB of {totalCap} GB used
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
              {(totalCap - totalUsed).toFixed(1)} GB remaining
            </p>
          </div>
          <Button variant="outline" size="sm">Upgrade storage</Button>
        </CardContent>
      </Card>

      {/* File list */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            {activeFolder ? activeFolder : "All Files"}
            {activeFolder && (
              <button
                onClick={() => setActiveFolder(null)}
                className="ml-2 text-xs font-medium text-portal-600 hover:underline cursor-pointer"
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
              className="h-9 w-48 sm:w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40 focus:border-portal-500"
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
                    No files match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", colorForType[d.type])}>
                          {iconForType[d.type] ?? <File className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{d.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:hidden">
                            {d.updated} • {d.size}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <Badge variant="portal">{d.folder}</Badge>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300">{d.owner}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300">{d.updated}</td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-300">{d.size}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
