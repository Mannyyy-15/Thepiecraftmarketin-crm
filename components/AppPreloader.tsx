"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export function AppPreloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show preloader once on app open only, not on route changes
    const timer = setTimeout(() => {
      setLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="app-preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0d0f17]/90 backdrop-blur-xl select-none"
        >
          {/* Background Ambient Glow */}
          <div className="absolute h-72 w-72 rounded-full bg-gradient-to-tr from-brand-600/30 via-indigo-600/20 to-purple-600/20 blur-3xl animate-pulse" />

          <div className="relative flex flex-col items-center gap-6 p-8 text-center">
            {/* Animated Logo Shield Ring */}
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-600 opacity-60 blur-md animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/90 shadow-2xl shadow-brand-500/30">
                <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-300">
                  P
                </span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
                </span>
              </div>
            </div>

            {/* Title & Micro Spinner */}
            <div className="space-y-1.5 z-10">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-400 animate-spin" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-400">
                  ThePieCraft OS
                </span>
              </div>
              <p className="text-sm font-semibold text-white/90">
                Synchronizing workspace...
              </p>
            </div>

            {/* Shimmer Progress Line */}
            <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-slate-800/80 border border-white/5">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 animate-[shimmer_1.2s_infinite]" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
