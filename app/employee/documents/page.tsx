"use client";

import {
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { documents } from "@/lib/mock";

const folders = [
  { name: "Brand Assets", files: 142, size: "1.2 GB", accent: "from-rose-500 to-orange-500" },
  { name: "Client Briefs", files: 86, size: "320 MB", accent: "from-indigo-500 to-violet-500" },
  { name: "Contracts", files: 54, size: "120 MB", accent: "from-emerald-500 to-teal-500" },
  { name: "Reports", files: 218, size: "2.4 GB", accent: "from-amber-500 to-rose-500" },
];

const iconForType: Record<string, JSX.Element> = {
  PDF: <FileText className="h-4 w-4" />,
  DOCX: <FileText className="h-4 w-4" />,
  XLSX: <FileSpreadsheet className="h-4 w-4" />,
  CSV: <FileSpreadsheet className="h-4 w-4" />,
  FIG: <ImageIcon className="h-4 w-4" />,
};

const typeColor: Record<string, string> = {
  PDF: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  DOCX: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
  XLSX: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CSV: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  FIG: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Folders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {folders.map((f) => (
            <Card key={f.name} className="p-4 hover:shadow-glow cursor-pointer transition-all">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.accent} text-white flex items-center justify-center mb-3`}>
                <Folder className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{f.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">{f.files} files • {f.size}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent files</h2>
          <div className="relative max-w-sm sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search files…"
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Client</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Owner</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Updated</th>
                <th className="px-5 py-3 text-left font-semibold">Size</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${typeColor[d.type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {iconForType[d.type] ?? <File className="h-4 w-4" />}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{d.client}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar name={d.owner} size="xs" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">{d.owner}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-slate-600 dark:text-slate-300">{d.updated}</td>
                  <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-300">{d.size}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button aria-label="More" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
