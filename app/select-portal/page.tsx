"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Flame,
  ArrowRight,
  LogOut,
  Building,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
import { useFranchise } from "@/lib/franchise-context";
import { logout } from "@/app/actions/auth";

export default function SelectPortalPage() {
  const router = useRouter();
  const { activeOutlet, outlets, role } = useFranchise();
  const currentOutlet = activeOutlet || outlets[0];
  const isSuperAdmin = role === "SUPER_ADMIN";

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {}
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#161618] text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-orange-500/30 relative overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between z-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-black text-sm shadow-md">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight block">
              Irani Koyla Shawarma
            </span>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">
              {isSuperAdmin ? "Brand Central HQ" : `${currentOutlet.name} • ${currentOutlet.code}`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="px-3 py-1.5 rounded-xl bg-[#1f1f1f] border border-[#303030] hover:border-rose-500/40 text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Workspace Profiles Picker */}
      <main className="z-10 max-w-3xl mx-auto w-full py-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2 mb-10"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 inline-block">
            {isSuperAdmin ? "Super Admin Session" : "Active Franchise Session"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Select Workspace Terminal
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            {isSuperAdmin
              ? "Access Brand HQ Network Command to manage hubs, recipes, and supply chain."
              : "Choose between store management & shift reconciliation, or launch the counter billing POS."}
          </p>
        </motion.div>

        {isSuperAdmin ? (
          <div className="max-w-md mx-auto">
            <Link
              href="/admin"
              className="group rounded-3xl bg-[#1f1f1f] border border-[#303030] hover:border-orange-500 p-8 transition-all duration-300 shadow-xl flex flex-col justify-between cursor-pointer text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                  Full Network HQ
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white group-hover:text-orange-400 transition-colors">
                  Brand HQ Executive Command Center
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Multi-branch performance matrix, central supply chain replenishment, master menu recipes, and royalty billing.
                </p>
              </div>
              <div className="pt-4 border-t border-[#303030] flex items-center justify-between text-xs font-bold text-orange-400">
                <span>Enter HQ Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
            {/* Store Management Portal */}
            <Link
              href="/admin"
              className="group rounded-3xl bg-[#1f1f1f] border border-[#303030] hover:border-orange-500 p-6 sm:p-8 transition-all duration-300 shadow-xl flex flex-col justify-between cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Store className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                  Store Management
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-orange-400 transition-colors">
                  Store Operations & Shifts
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Daily drawer float reconciliation, spit roasting yield logs, FSSAI compliance, and store royalty statements.
                </p>
              </div>
              <div className="pt-4 border-t border-[#303030] flex items-center justify-between text-xs font-bold text-orange-400">
                <span>Open Store Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Counter POS Terminal */}
            <Link
              href="/pos"
              className="group rounded-3xl bg-[#1f1f1f] border border-[#303030] hover:border-emerald-500 p-6 sm:p-8 transition-all duration-300 shadow-xl flex flex-col justify-between cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Flame className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Counter POS Terminal
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                  Counter POS Register
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Ultra-fast ordering, instant completed billing, split payments, petty cash logger, and offline queueing.
                </p>
              </div>
              <div className="pt-4 border-t border-[#303030] flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Launch Counter Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="z-10 text-center text-xs text-zinc-500 font-mono py-4">
        <span>Irani Koyla Shawarma Operating System &middot; Production Ready</span>
      </footer>
    </div>
  );
}
