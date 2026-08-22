"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Flame,
  Receipt,
  WalletCards,
  ShieldCheck,
  UtensilsCrossed,
  FilePieChart,
  Settings,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import TopNav from "@/components/TopNav";
import { FranchiseProvider } from "@/lib/franchise-context";

const drawerOptions = [
  { name: "Royalty & Agreements", href: "/admin/royalties", icon: WalletCards, desc: "Franchise Invoices & Fees" },
  { name: "Master Recipes & BOM", href: "/admin/menu", icon: UtensilsCrossed, desc: "Portion Standards & Margins" },
  { name: "Food Safety & Audit", href: "/admin/compliance", icon: ShieldCheck, desc: "Temperature & FSSAI Checks" },
  { name: "Operational Audit Log", href: "/admin/audit", icon: FilePieChart, desc: "System & Wastage History" },
  { name: "System Settings", href: "/admin/settings", icon: Settings, desc: "Franchise Rules & Config" },
];

const mainNavTabs = [
  { name: "Outlets", href: "/admin/outlets", icon: Store, exact: false },
  { name: "Spit Yield", href: "/admin/yield", icon: Flame, exact: false },
  { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true, isCenter: true },
  { name: "Sales & Shifts", href: "/admin/sales", icon: Receipt, exact: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showOthersDrawer, setShowOthersDrawer] = useState(false);
  const pathname = usePathname();

  const isOthersActive = drawerOptions.some(opt => pathname.startsWith(opt.href));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <TopNav />

        <main id="main-content" className="mobile-content-safe flex-1 overflow-y-auto lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-6">{children}</div>
        </main>

        {/* Floating Mobile Bottom Navigation */}
        <div className="mobile-nav-safe lg:hidden fixed left-4 right-4 z-40 select-none">
          <nav aria-label="Primary navigation" className="bg-[#1f1f1f]/95 backdrop-blur-2xl border border-[#303030] rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-around h-16 px-2">
              {mainNavTabs.map((tab) => {
                const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                const IconComp = tab.icon;
                const isCenter = (tab as any).isCenter;

                if (isCenter) {
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      aria-current={isActive ? "page" : undefined}
                      className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative group transition-all duration-200"
                    >
                      <div className={`relative -mt-8 h-[52px] w-[52px] rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_4px_20px_rgba(245,158,11,0.5)] scale-110"
                          : "bg-gradient-to-br from-amber-500 to-orange-700 shadow-[0_4px_14px_rgba(245,158,11,0.35)] group-hover:scale-105 group-active:scale-95"
                      }`}>
                        <IconComp className="h-[22px] w-[22px] text-white" />
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wide transition-all duration-200 mt-1.5 ${
                        isActive ? "text-amber-500" : "text-slate-400 dark:text-[#a1a1b1]"
                      }`}>
                        {tab.name}
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive ? "page" : undefined}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative group transition-all duration-200"
                  >
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          key="pill"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute inset-x-1 top-1.5 bottom-1.5 bg-amber-500/15 rounded-[18px] pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                    <IconComp
                      className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                        isActive ? "text-amber-500 scale-110" : "text-slate-400 dark:text-[#a1a1b1]"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wide relative z-10 transition-all duration-200 ${
                        isActive ? "text-amber-500" : "text-slate-400 dark:text-[#a1a1b1]"
                      }`}
                    >
                      {tab.name}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={() => setShowOthersDrawer(true)}
                aria-label="Open more navigation options"
                aria-expanded={showOthersDrawer}
                aria-controls="admin-more-navigation"
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative bg-transparent border-none outline-none cursor-pointer group transition-all duration-200"
              >
                <AnimatePresence>
                  {(isOthersActive || showOthersDrawer) && (
                    <motion.div
                      key="pill-others"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute inset-x-1 top-1.5 bottom-1.5 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 rounded-[18px] pointer-events-none"
                    />
                  )}
                </AnimatePresence>
                <MoreHorizontal
                  className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                    isOthersActive || showOthersDrawer ? "text-[#3b82f6] dark:text-[#60a5fa] scale-110" : "text-slate-400 dark:text-[#5a5a68]"
                  }`}
                />
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wide relative z-10 transition-all duration-200 ${
                    isOthersActive || showOthersDrawer ? "text-[#3b82f6] dark:text-[#60a5fa]" : "text-slate-400 dark:text-[#5a5a68]"
                  }`}
                >
                  More
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Slide-Up Bottom Drawer */}
        <AnimatePresence>
          {showOthersDrawer && (
            <div id="admin-more-navigation" className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="More navigation">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setShowOthersDrawer(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
                className="relative bg-white dark:bg-[#1f1f1f] border-t border-slate-200/80 dark:border-[#303030] rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.4)] pb-10 z-10 select-none"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
                <div className="w-10 h-1 bg-slate-200 dark:bg-[#2a2a30] rounded-full mx-auto mt-3 mb-5" />
                <div className="flex justify-between items-center px-5 pb-4 border-b border-slate-100 dark:border-[#303030]">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">More Pages</h3>
                  </div>
                  <button
                    onClick={() => setShowOthersDrawer(false)}
                    className="h-9 w-9 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#28282d] cursor-pointer transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-5 pt-4 grid grid-cols-2 gap-3">
                  {drawerOptions.map((opt) => {
                    const isActive = pathname.startsWith(opt.href);
                    return (
                      <Link
                        key={opt.name}
                        href={opt.href}
                        onClick={() => setShowOthersDrawer(false)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500/40"
                            : "bg-slate-50/80 dark:bg-[#303030] border-slate-200/60 dark:border-[#303030] hover:border-[#3b82f6]/25 active:scale-[0.98]"
                        }`}
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? "bg-[#3b82f6]/10" : "bg-white dark:bg-[#303030] shadow-sm"
                          }`}
                        >
                          <opt.icon
                            className={`h-4.5 w-4.5 ${
                              isActive ? "text-[#3b82f6] dark:text-[#60a5fa]" : "text-slate-500 dark:text-[#9999a8]"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-bold truncate ${
                              isActive ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {opt.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{opt.desc}</p>
                        </div>
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isActive ? "text-blue-500" : "text-slate-300 dark:text-[#38383f]"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
