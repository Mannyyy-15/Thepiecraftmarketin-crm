"use client";
import { useToast } from "@/providers/ToastProvider";

import { useState, useEffect, useRef } from "react";
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
  Trash2,
  X,
  Check,
  FolderPlus,
  Edit
} from "lucide-react";
import { DocumentsPageSkeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDocuments, createDocument, deleteDocument, getClients, getProjects, signContractSOW } from "@/app/actions/crm";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

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
  const { toast, confirmDialog } = useToast();

  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  // Modals & form state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadClient, setUploadClient] = useState("Acme Corp");
  const [uploadType, setUploadType] = useState("PDF");
  const [uploadSize, setUploadSize] = useState("1.8 MB");
  const [uploadOwner, setUploadOwner] = useState("Priya Shah");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Proposal / SOW States
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalContent, setProposalContent] = useState("");
  const [proposalProject, setProposalProject] = useState("");
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Local Toasts Center State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = `doc-toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getDocuments();
    if (res && res.success && res.data) {
      setFiles(res.data);
    }
    const clientsRes = await getClients();
    if (clientsRes.success && clientsRes.data) {
      setClientsList(clientsRes.data);
      if (clientsRes.data.length > 0) {
        setUploadClient(clientsRes.data[0].name);
      }
    }
    const projectsRes = await getProjects();
    if (projectsRes.success && projectsRes.data) {
      setProjectsList(projectsRes.data);
      if (projectsRes.data.length > 0) {
        setProposalProject(String(projectsRes.data[0].id));
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
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

  // Get active folders: standard 4 + any folder referenced in existing files + customFolders
  const defaultFolderNames = ["Brand Assets", "Client Briefs", "Contracts", "Reports"];
  const dynamicFolderNames = Array.from(new Set(files.map(f => f.folder)));
  const folderNames = Array.from(new Set([...defaultFolderNames, ...dynamicFolderNames, ...customFolders]));

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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    if (folders.some(f => f.name.toLowerCase() === newFolderName.toLowerCase().trim())) {
      addToast(`Folder "${newFolderName}" already exists!`, "warning");
      return;
    }

    const formData = new FormData();
    formData.append("name", ".folder-keep");
    formData.append("clientName", "");
    formData.append("type", "SYS");
    formData.append("size", "0 KB");
    formData.append("folder", newFolderName.trim());

    setIsLoading(true);
    await createDocument(formData);
    await fetchData();

    setNewFolderName("");
    setShowFolderModal(false);
    addToast(`Successfully created folder "${newFolderName.trim()}"!`);
    setIsLoading(false);
  };

  // File upload handler
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;

    const formattedName = uploadName.includes(".") 
      ? uploadName.trim() 
      : `${uploadName.trim()}.${uploadType.toLowerCase()}`;

    let folderTarget = "Client Briefs";
    if (uploadType === "FIG") folderTarget = "Brand Assets";
    if (uploadType === "XLSX" || uploadType === "CSV") folderTarget = "Reports";
    if (formattedName.toLowerCase().includes("contract") || formattedName.toLowerCase().includes("agreement")) {
      folderTarget = "Contracts";
    }

    const formData = new FormData();
    formData.append("name", formattedName);
    formData.append("clientName", uploadClient);
    formData.append("type", uploadType);
    formData.append("size", uploadSize);
    formData.append("folder", folderTarget);
    if (uploadFile) {
      formData.append("file", uploadFile);
    }

    const res = await createDocument(formData);
    if (res && res.success) {
      setUploadName("");
      setUploadFile(null);
      setShowUploadModal(false);
      addToast(`Uploaded "${formattedName}" to ${folderTarget}!`);
      fetchData();
    } else {
      addToast(res?.error || "Failed to upload file.", "warning");
    }
  };

  // Canvas events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCreateProposalSOW = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalProject) {
      addToast("Please fill in the SOW details", "warning");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    setIsLoading(true);
    const res = await signContractSOW(Number(proposalProject), dataUrl);
    if (res && res.success) {
      addToast(`SOW & Proposal "${proposalTitle}" drafted and signed successfully!`);
      setShowProposalModal(false);
      setProposalTitle("");
      setProposalContent("");
      clearCanvas();
      await fetchData();
    } else {
      addToast(res?.error || "Failed to create SOW", "warning");
    }
    setIsLoading(false);
  };

  // File removal handler
  const handleRemoveFile = async (id: any, name: string) => {
    if (typeof id === "string" && id.startsWith("virtual-contract-")) {
      addToast("Contract links mapped from Projects must be managed in Project settings.", "warning");
      return;
    }
    if (await confirmDialog(`Are you sure you want to permanently delete "${name}"?`)) {
      const res = await deleteDocument(parseInt(id));
      if (res && res.success) {
        addToast(`Deleted "${name}" from vault.`, "info");
        fetchData();
      } else {
        addToast(res?.error || "Failed to delete file.", "warning");
      }
    }
  };

  // Filtered files
  const filteredFiles = files.filter(f => {
    if (f.name === ".folder-keep") return false;
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
      <PageHeader
        eyebrow="Workspace"
        title="Documents"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => setShowProposalModal(true)} className="border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 font-semibold text-xs">
              <Edit className="h-4 w-4 mr-1 text-indigo-500" />
              Draft Proposal
            </Button>
            <Button variant="outline" size="md" onClick={() => setShowFolderModal(true)} className="border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold text-xs">
              <Plus className="h-4 w-4 mr-1 text-indigo-500" />
              New Folder
            </Button>
            <Button size="md" onClick={() => setShowUploadModal(true)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
              <Upload className="h-4 w-4 mr-1" />
              Upload File
            </Button>
          </div>
        }
      />

      {/* Folders Summary Row */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Folders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {folders.map((f) => (
            <Card key={f.name} className="p-4 hover:shadow-glow cursor-pointer transition-all border border-slate-200 dark:border-slate-800 relative group">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.accent} text-white flex items-center justify-center mb-3 shadow-md`}>
                <Folder className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{f.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">{f.files} files • {f.size}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Files Table Card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-850">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent files</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filter, search, or review legal agreements and brand guidelines.</p>
          </div>
          <div className="relative max-w-sm sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search files by name, client, owner…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-800 dark:text-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFiles.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${typeColor[d.type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {iconForType[d.type] ?? <File className="h-4 w-4" />}
                      </div>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
                          {d.name} <span className="text-[10px] opacity-70">(Link ↗)</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{d.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-slate-650 dark:text-slate-350 font-semibold text-xs">{d.clientName || "—"}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar name={d.ownerName} size="xs" />
                      <span className="text-xs text-slate-650 dark:text-slate-350">{d.ownerName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today"}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-slate-650 dark:text-slate-350 font-medium text-xs">{d.size}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleRemoveFile(d.id, d.name)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-all"
                        title="Delete File"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button aria-label="More Options" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                    No matching files or folders found for "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 📁 MODAL: NEW FOLDER */}
      {/* ========================================================================= */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-indigo-500/25 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FolderPlus className="h-4.5 w-4.5 text-indigo-500" /> Create Custom Folder
                </CardTitle>
                <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Folder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Legal Agreements"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                  />
                </div>
                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Create Folder
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📤 MODAL: UPLOAD FILE */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-scaleIn border border-indigo-500/25 shadow-2xl">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Upload className="h-4.5 w-4.5 text-brand-500 animate-bounce" /> Upload Document Asset
                </CardTitle>
                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="text-slate-400 hover:text-slate-650">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        setUploadName(file.name);
                        const ext = file.name.split('.').pop()?.toUpperCase() || "PDF";
                        const validTypes = ["PDF","DOCX","XLSX","CSV","FIG"];
                        if (validTypes.includes(ext)) setUploadType(ext);
                        const sz = file.size;
                        if (sz >= 1024 * 1024) setUploadSize(`${(sz / (1024 * 1024)).toFixed(1)} MB`);
                        else setUploadSize(`${(sz / 1024).toFixed(0)} KB`);
                      }
                    }}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-semibold file:bg-white dark:file:bg-slate-900 file:text-slate-700 dark:file:text-slate-300 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">File Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Marketing Strategy Q4"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Extension / Format</label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-850 dark:text-white"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="DOCX">Word DOCX</option>
                      <option value="XLSX">Excel Spreadsheet</option>
                      <option value="CSV">CSV Data sheet</option>
                      <option value="FIG">Figma Design File</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">File Size</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1.2 MB"
                      value={uploadSize}
                      onChange={(e) => setUploadSize(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Brand</label>
                    <select
                      value={uploadClient}
                      onChange={(e) => setUploadClient(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-850 dark:text-white"
                    >
                      {clientsList.length > 0 ? (
                        clientsList.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Acme Corp">Acme Corp</option>
                          <option value="Stark Industries">Stark Industries</option>
                          <option value="Wayne Enterprises">Wayne Enterprises</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Uploaded By</label>
                    <input
                      type="text"
                      required
                      value={uploadOwner}
                      onChange={(e) => setUploadOwner(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Upload Asset
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📝 MODAL: DRAFT PROPOSAL / SOW WITH SIGNATURE DRAWING PAD */}
      {/* ========================================================================= */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg animate-scaleIn border border-indigo-500/25 shadow-2xl mt-8 mb-8">
            <CardHeader className="py-4 border-b dark:border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Edit className="h-4.5 w-4.5 text-indigo-500" /> Draft Proposal & SOW
                </CardTitle>
                <button onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-slate-650">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreateProposalSOW} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project to Sign</label>
                  <select
                    value={proposalProject}
                    onChange={(e) => setProposalProject(e.target.value)}
                    required
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-850 dark:text-white"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.clientName || "No Client"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Proposal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Website Dev Agreement v1"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Agreement Details</label>
                  <textarea
                    required
                    placeholder="Provide details about milestones, pricing, and terms..."
                    value={proposalContent}
                    onChange={(e) => setProposalContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draw Client Signature</label>
                    <button type="button" onClick={clearCanvas} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase">Clear Pad</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl cursor-crosshair h-32"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Draw in the box above to add a digital signature. Signature is saved as PNG to the Contracts folder.</p>
                </div>

                <button type="submit" className="w-full h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors">
                  Create & Sign SOW
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between gap-3 border transition-all animate-slideIn ${
              t.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500/20 text-amber-800 dark:text-amber-300"
                : t.type === "info"
                ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-355"
                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                t.type === "warning" ? "bg-amber-500/10 text-amber-500" : t.type === "info" ? "bg-slate-500/10 text-slate-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                <Check className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold leading-normal">{t.message}</span>
            </div>
            <button 
              onClick={() => setToasts(toasts.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
