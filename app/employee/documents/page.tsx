"use client";

import { useEffect, useState } from "react";
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
import { DocumentsPageSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { getDocuments } from "@/app/actions/crm";

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
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getDocuments();
    if (res && res.success && res.data) {
      setFiles(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const defaultFolderNames = ["Brand Assets", "Client Briefs", "Contracts", "Reports"];
  const dynamicFolderNames = Array.from(new Set(files.map(f => f.folder)));
  const folderNames = Array.from(new Set([...defaultFolderNames, ...dynamicFolderNames]));

  const folderGradients: Record<string, string> = {
    "Brand Assets": "from-rose-500 to-orange-500",
    "Client Briefs": "from-indigo-500 to-violet-500",
    "Contracts": "from-emerald-500 to-teal-500",
    "Reports": "from-amber-500 to-rose-500",
  };

  const folders = folderNames.map((name, idx) => {
    const fFiles = files.filter(f => f.folder === name);
    const gradients = [
      "from-pink-500 to-rose-500",
      "from-cyan-500 to-blue-500",
      "from-teal-500 to-emerald-500",
      "from-amber-500 to-orange-500",
      "from-purple-500 to-indigo-500"
    ];
    const accent = folderGradients[name] || gradients[idx % gradients.length];
    return {
      name,
      files: fFiles.length,
      size: formatFolderSize(fFiles),
      accent
    };
  });

  const filteredFiles = files.filter(f => {
    const q = searchQuery.toLowerCase();
    const fName = (f.name || "").toLowerCase();
    const fClient = (f.clientName || "").toLowerCase();
    const fOwner = (f.ownerName || "").toLowerCase();
    const fType = (f.type || "").toLowerCase();
    return fName.includes(q) || fClient.includes(q) || fOwner.includes(q) || fType.includes(q);
  });

  if (isLoading) return <DocumentsPageSkeleton />;

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-slate-800 dark:text-white"
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
              {filteredFiles.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${typeColor[d.type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {iconForType[d.type] ?? <File className="h-4 w-4" />}
                      </div>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-650 hover:underline truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                          {d.name} <span className="text-[10px] opacity-70">(Link ↗)</span>
                        </a>
                      ) : (
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{d.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-300">{d.clientName || "—"}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar name={d.ownerName} size="xs" />
                      <span className="text-xs text-slate-606 dark:text-slate-306">{d.ownerName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-slate-650 dark:text-slate-350 font-medium text-xs">{d.size}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button 
                      onClick={() => d.url && window.open(d.url, "_blank")}
                      aria-label="More" 
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                    No files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
