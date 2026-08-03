"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function AppPreloader() {
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();

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
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex select-none flex-col items-center justify-center bg-app"
        >
          <div className="flex flex-col items-center gap-7">
            {/* Logo mark */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel">
              <span className="text-lg font-bold text-accent-primary">P</span>
            </div>

            {/* Wordmark */}
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
              ThePieCraft OS
            </span>

            {/* Progress line */}
            <div className="h-[3px] w-40 overflow-hidden rounded-full bg-elevated">
              {reduceMotion ? (
                <div className="h-full w-1/3 rounded-full bg-accent-solid" />
              ) : (
                <motion.div
                  className="h-full rounded-full bg-accent-solid"
                  style={{ width: "35%" }}
                  animate={{ x: ["-120%", "320%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: [0.45, 0, 0.25, 1] }}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
