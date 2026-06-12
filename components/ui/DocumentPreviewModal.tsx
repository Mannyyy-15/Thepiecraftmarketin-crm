import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Download } from "lucide-react";
import { cn } from "./cn";

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  name: string;
}

export function DocumentPreviewModal({ isOpen, onClose, url, name }: DocumentPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !url || !mounted) return null;

  const ext = name.split('.').pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext || "");
  const isPdf = ext === "pdf";

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/90 backdrop-blur-sm animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
        <div className="flex flex-col">
          <h3 className="text-white font-semibold truncate max-w-lg">{name}</h3>
          <p className="text-slate-400 text-xs">Preview</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={url}
            download={name}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-rose-500 rounded-lg transition-colors ml-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {isImage ? (
          <img
            src={url}
            alt={name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : isPdf ? (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full rounded-lg bg-white shadow-2xl"
            title={name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 bg-white/5 rounded-xl p-12 text-center">
            <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-white font-bold text-xl uppercase">
              {ext}
            </div>
            <p className="text-lg font-medium text-white mb-2">No Preview Available</p>
            <p className="text-sm max-w-sm mb-6">
              This file type cannot be previewed directly in the browser. Please download it to view the contents.
            </p>
            <a
              href={url}
              download={name}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
