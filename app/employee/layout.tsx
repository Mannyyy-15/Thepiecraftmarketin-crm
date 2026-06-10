"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  LayoutDashboard,
  Code2,
  BarChart3,
  MoreHorizontal,
  Users,
  FolderKanban,
  FilePieChart,
  Files,
  X,
  ChevronRight,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import EmployeeTopNav from "@/components/EmployeeTopNav";
import { getCurrentUser } from "@/app/actions/auth";
import { useLocalNotifications } from "@/lib/useLocalNotifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLocalNotifications();

  const [showOthersDrawer, setShowOthersDrawer] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; systemRole: string } | null>(null);
  const pathname = usePathname();

  // Load employee profile to fetch role-specific tabs dynamically
  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) {
        setUser({
          name: res.name as string,
          email: res.email as string,
          systemRole: (res.systemRole || "Web Developer") as string
        });
      }
    });
  }, []);

  const systemRole = user?.systemRole || "Web Developer";
  const isWebDev = systemRole.toLowerCase().includes("web developer") || systemRole.toLowerCase().includes("developer");

  const roleName = isWebDev ? "Web Dev" : "Meta Ads";
  const roleHref = isWebDev ? "/employee/website-dev" : "/employee/ads";
  const RoleIcon = isWebDev ? Code2 : BarChart3;

  // Close drawer on route change
  useEffect(() => {
    setShowOthersDrawer(false);
  }, [pathname]);

  // Drawer menu options
  const drawerOptions = [
    { name: "Profile", href: "/employee/profile", icon: User, desc: "My Profile & Schedule" },
    { name: "Reports", href: "/employee/reports", icon: FilePieChart, desc: "Analytics & Reports" },
    { name: "Documents", href: "/employee/documents", icon: Files, desc: "Files & Contracts" },
    { name: "Clients", href: "/employee/clients", icon: Users, desc: "Client Directory" },
    { name: "Projects", href: "/employee/projects", icon: FolderKanban, desc: "Project Board" },
  ];

  // Check if "Others" section is active
  const isOthersActive = drawerOptions.some(opt => pathname.startsWith(opt.href));

  // Tab order: Overview | Attend | HOME (center) | WebDev/Ads | More
  const mainNavTabs = [
    { name: "Overview", href: "/employee/overview", icon: LayoutDashboard, exact: false },
    { name: "Attend", href: "/employee/attendance", icon: Calendar, exact: false },
    { name: "Home", href: "/employee", icon: Home, exact: true, isCenter: true },
    { name: roleName, href: roleHref, icon: RoleIcon, exact: false },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop only (lg+) */}
      <EmployeeSidebar />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <EmployeeTopNav />

        {/* Main Content — pb-28 on mobile to clear the floating nav */}
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-6">{children}</div>
        </main>

        {/* ── FLOATING Mobile Bottom Navigation Bar ── */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 select-none">
          <nav className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/70 dark:border-slate-800/70 rounded-[26px] shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-around h-16 px-2">
              
              {/* Main 4 Tabs */}
              {mainNavTabs.map((tab) => {
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);
                const IconComp = tab.icon;
                const isHome = (tab as any).isCenter;

                if (isHome) {
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative group transition-all duration-200"
                    >
                      {/* Elevated center home button */}
                      <div className={`relative -mt-8 h-[52px] w-[52px] rounded-full flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? "bg-brand-600 shadow-[0_4px_20px_rgba(99,102,241,0.5)] scale-110"
                          : "bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_4px_14px_rgba(99,102,241,0.35)] group-hover:scale-105 group-active:scale-95"
                      }`}>
                        <IconComp className="h-[22px] w-[22px] text-white" />
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest transition-all duration-200 mt-1.5 ${
                        isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"
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
                    {/* Self-contained pill — always centered on this tab's content */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          key="pill"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute inset-x-1 top-1.5 bottom-1.5 bg-brand-500/10 dark:bg-brand-400/10 rounded-[18px] pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                    <IconComp
                      className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                        isActive
                          ? "text-brand-600 dark:text-brand-400 scale-110"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-widest relative z-10 transition-all duration-200 ${
                        isActive
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {tab.name}
                    </span>
                  </Link>
                );
              })}

              {/* Tab 5: Others */}
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
                      className="absolute inset-x-1 top-1.5 bottom-1.5 bg-brand-500/10 dark:bg-brand-400/10 rounded-[18px] pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <MoreHorizontal
                  className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                    isOthersActive || showOthersDrawer
                      ? "text-brand-600 dark:text-brand-400 scale-110"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-widest relative z-10 transition-all duration-200 ${
                    isOthersActive || showOthersDrawer
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  More
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* ── Slide-Up Bottom Drawer ── */}
        <AnimatePresence>
          {showOthersDrawer && (
            <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setShowOthersDrawer(false)}
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 280 }}
                className="relative bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.4)] pb-10 z-10 select-none"
              >
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

                {/* Drag handle */}
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-3 mb-5" />

                {/* Header */}
                <div className="flex justify-between items-center px-5 pb-4 border-b border-slate-100 dark:border-slate-900/80">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">More Pages</h3>
                  </div>
                  <button
                    onClick={() => setShowOthersDrawer(false)}
                    className="h-9 w-9 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Navigation Grid */}
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
                            ? "bg-brand-50 dark:bg-brand-950/30 border-brand-500/40"
                            : "bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 hover:border-brand-500/25 active:scale-[0.98]"
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-brand-500/10"
                            : "bg-white dark:bg-slate-800 shadow-sm"
                        }`}>
                          <opt.icon className={`h-4.5 w-4.5 ${isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-200"}`}>
                            {opt.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {opt.desc}
                          </p>
                        </div>
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-500" : "text-slate-300 dark:text-slate-700"}`} />
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
