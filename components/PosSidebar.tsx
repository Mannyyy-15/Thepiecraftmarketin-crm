"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  Receipt,
  Banknote,
  Flame,
  Store,
  Layers,
  LogOut,
  X,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui/cn";
import { useFranchise } from "@/lib/franchise-context";
import { logout } from "@/app/actions/auth";

const posNavigationSections = [
  {
    label: "COUNTER OPERATIONS",
    items: [
      { name: "Counter Billing", href: "/pos", icon: ShoppingBag, exact: true },
      { name: "Live Order Tickets", href: "/pos/live-kot", icon: Clock, exact: false, badgeKey: "orders" },
      { name: "Menu & 86-List", href: "/pos/menu", icon: UtensilsCrossed, exact: false },
    ],
  },
  {
    label: "REGISTER & AUDIT",
    items: [
      { name: "Order History", href: "/pos/history", icon: Receipt, exact: false },
      { name: "Shift Register", href: "/pos/shift", icon: Banknote, exact: false },
      { name: "Live Spit Roasters", href: "/pos/spit-live", icon: Flame, exact: false },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { name: "Store Management", href: "/admin", icon: Store, exact: false },
      { name: "Switch Workspace", href: "/select-portal", icon: Layers, exact: false },
    ],
  },
] as const;

function PosSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOutlet, outlets, liveOrders } = useFranchise();
  const currentOutlet = activeOutlet || outlets[0];

  const totalOrdersCount = liveOrders.length;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.push("/login");
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#1f1f1f] lg:rounded-[20px] dark:border dark:border-[#303030] shadow-[0_2px_16px_rgba(0,0,0,0.07)] dark:shadow-none overflow-hidden">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#f0f0f2] dark:border-[#303030]">
        <Link href="/pos" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              Irani Koyla
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                POS
              </span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
              Counter Register #01
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3" aria-label="POS navigation">
        {posNavigationSections.map((section, sectionIndex) => (
          <div key={section.label} className={cn("space-y-1", sectionIndex > 0 && "mt-5")}>
            <div className="px-3 py-1">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-500 dark:text-zinc-500 uppercase">
                {section.label}
              </span>
            </div>
            {section.items.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const badgeValue = (item as any).badgeKey === "orders" ? totalOrdersCount : null;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                    isActive
                      ? "bg-amber-600 text-white shadow-[0_2px_12px_rgba(217,119,6,0.35)] dark:bg-amber-600 dark:text-white"
                      : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#303030] hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-500 dark:text-zinc-500 group-hover:text-amber-500"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {badgeValue !== null && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {badgeValue}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Cashier Footer Profile */}
      <div className="shrink-0 p-3 border-t border-[#f0f0f2] dark:border-[#303030] bg-slate-50/50 dark:bg-[#161618]/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1f1f1f] border border-slate-200/80 dark:border-[#303030]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              IS
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block leading-tight">
                Imran S.
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold truncate block leading-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Cashier
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#303030] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PosSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col pl-4 py-4 z-20">
      <PosSidebarBody />
    </aside>
  );
}

export function PosMobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] p-3"
          >
            <PosSidebarBody onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
