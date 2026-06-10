"use client";

import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ isOpen, isLoading = false, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-rose-600" />
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-center">
                <LogOut className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Sign Out?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to sign out of your account?
                </p>
              </div>
              <div className="flex gap-3 w-full mt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-rose-500/20"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
