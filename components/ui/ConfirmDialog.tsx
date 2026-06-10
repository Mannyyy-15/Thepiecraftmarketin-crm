import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  id: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ id, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleAction = (action: () => void) => {
    setIsVisible(false);
    setTimeout(() => {
      action();
    }, 200); // match animation duration
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-200 dark:bg-black/50",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            onClick={() => handleAction(onCancel)}
            className="rounded-lg p-1 text-slate-400 opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Confirm Action
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleAction(onCancel)}>
            Cancel
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleAction(onConfirm)}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
