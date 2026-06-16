"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  UsersRound,
  Building2,
  MoreHorizontal,
  Sparkles,
  BarChart3,
  Target,
  Code2,
  FilePieChart,
  CircleDollarSign,
  Receipt,
  Files,
  Settings,
  X,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import TopNav from "@/components/TopNav";
import { useLocalNotifications } from "@/lib/useLocalNotifications";

const drawerOptions = [
  { name: "Studio AI", href: "/admin/studio-ai", icon: Sparkles, desc: "AI Assistant" },
  { name: "Leads", href: "/admin/leads", icon: Target, desc: "Sales Pipeline" },
  { name: "Meta Ads", href: "/admin/ads", icon: BarChart3, desc: "Ad Campaigns" },
  { name: "Website Dev", href: "/admin/website-dev", icon: Code2, desc: "Dev Projects" },
  { name: "Reports", href: "/admin/reports", icon: FilePieChart, desc: "Analytics" },
  { name: "Finance", href: "/admin/finance", icon: CircleDollarSign, desc: "Billing & Finance" },
  { name: "Invoices", href: "/admin/invoices", icon: Receipt, desc: "Create & Send Invoices" },
  { name: "Documents", href: "/admin/documents", icon: Files, desc: "Files & Contracts" },
  { name: "Settings", href: "/admin/settings", icon: Settings, desc: "System Settings" },
];

const mainNavTabs = [
  { name: "Team", href: "/admin/team", icon: UsersRound, exact: false },
  { name: "Clients", href: "/admin/clients", icon: Building2, exact: false },
  { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true, isCenter: true },
  { name: "Projects", href: "/admin/projects", icon: FolderKanban, exact: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showOthersDrawer, setShowOthersDrawer] = useState(false);
  const pathname = usePathname();

  const isOthersActive = drawerOptions.some(opt => pathname.startsWith(opt.href));

  useLocalNotifications();

  // Auto-refresh server components every 30 s so data stays live
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopNav />

        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-6">{children}</div>
        </main>

        {/* Floating Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 select-none">
          <nav className="bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-2xl border border-[#f0f0f2] dark:border-[#303030] rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
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
                      className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative group transition-all duration-200"
                    >
                      <div className={`relative -mt-8 h-[52px] w-[52px] rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? "bg-[#3b82f6] shadow-[0_4px_20px_rgba(59,130,246,0.5)] scale-110"
                          : "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] shadow-[0_4px_14px_rgba(59,130,246,0.35)] group-hover:scale-105 group-active:scale-95"
                      }`}>
                        <IconComp className="h-[22px] w-[22px] text-white" />
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wide transition-all duration-200 mt-1.5 ${
                        isActive ? "text-[#3b82f6] dark:text-[#60a5fa]" : "text-slate-400 dark:text-[#5a5a68]"
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
                          className="absolute inset-x-1 top-1.5 bottom-1.5 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/10 rounded-[18px] pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                    <IconComp
                      className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                        isActive ? "text-[#3b82f6] dark:text-[#60a5fa] scale-110" : "text-slate-400 dark:text-[#5a5a68]"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wide relative z-10 transition-all duration-200 ${
                        isActive ? "text-[#3b82f6] dark:text-[#60a5fa]" : "text-slate-400 dark:text-[#5a5a68]"
                      }`}
                    >
                      {tab.name}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={() => setShowOthersDrawer(true)}
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
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
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
