"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, ToastProps, ToastType } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  confirmDialog: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Omit<ToastProps, "onClose">[]>([]);
  const [dialogs, setDialogs] = useState<{ id: string; message: string; resolve: (v: boolean) => void }[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirmDialog = useCallback((message: string) => {
    return new Promise<boolean>(resolve => {
      const id = Math.random().toString(36).slice(2, 9);
      setDialogs(prev => [...prev, { id, message, resolve }]);
    });
  }, []);

  const handleConfirm = (id: string, value: boolean) => {
    setDialogs(prev => {
      const dialog = prev.find(d => d.id === id);
      dialog?.resolve(value);
      return prev.filter(d => d.id !== id);
    });
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirmDialog }}>
      {children}

      {/* Toast stack — AnimatePresence enables exit animations */}
      <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence mode="sync">
          {toasts.map(t => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      {dialogs.map(dialog => (
        <ConfirmDialog
          key={dialog.id}
          id={dialog.id}
          message={dialog.message}
          onConfirm={() => handleConfirm(dialog.id, true)}
          onCancel={() => handleConfirm(dialog.id, false)}
        />
      ))}
    </ToastContext.Provider>
  );
}
