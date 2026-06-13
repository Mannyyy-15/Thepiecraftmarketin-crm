"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FilePieChart,
  CircleDollarSign,
  Files,
  MessageSquareText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClientSidebar from "@/components/ClientSidebar";
import PortalTopNav from "@/components/PortalTopNav";

const mainNavTabs = [
  { name: "Overview", href: "/client", icon: LayoutDashboard, exact: true },
  { name: "Projects", href: "/client/projects", icon: FolderKanban, exact: false },
  { name: "Reports", href: "/client/reports", icon: FilePieChart, exact: false },
  { name: "Invoices", href: "/client/invoices", icon: CircleDollarSign, exact: false },
  { name: "Messages", href: "/client/messages", icon: MessageSquareText, exact: false },
  { name: "Files", href: "/client/documents", icon: Files, exact: false },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ClientSidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <PortalTopNav />

        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>

        {/* Floating Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 select-none">
          <nav className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/70 dark:border-slate-800/70 rounded-[26px] shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-around h-16 px-2">
              {mainNavTabs.map((tab) => {
                const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
                const IconComp = tab.icon;
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
                          className="absolute inset-x-1 top-1.5 bottom-1.5 bg-portal-500/10 dark:bg-portal-400/10 rounded-[18px] pointer-events-none"
                        />
                      )}
                    </AnimatePresence>
                    <IconComp
                      className={`h-5 w-5 relative z-10 transition-all duration-200 ${
                        isActive ? "text-portal-600 dark:text-portal-400 scale-110" : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wide relative z-10 transition-all duration-200 ${
                        isActive ? "text-portal-600 dark:text-portal-400" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {tab.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
