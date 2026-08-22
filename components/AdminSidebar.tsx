"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  X,
  LogOut,
  Sparkles,
  Building,
  UserCheck,
  Truck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui/cn";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { logout } from "@/app/actions/auth";
import { clearCurrentUserCache, getCurrentUserCached } from "@/lib/currentUserClient";
import { clearPersistentCache } from "@/hooks/useActionCache";
import { useFranchise } from "@/lib/franchise-context";

const superAdminNav = [
  {
    label: "HQ COMMAND",
    items: [
      { name: "HQ Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Franchise Hubs", href: "/admin/outlets", icon: Store },
      { name: "Central Supply Chain", href: "/admin/supply-chain", icon: Truck },
      { name: "Master Menu & Recipes", href: "/admin/menu", icon: UtensilsCrossed },
    ],
  },
  {
    label: "FINANCE & AUDIT",
    items: [
      { name: "Royalties & Invoices", href: "/admin/royalties", icon: WalletCards },
      { name: "Sales & Shift Audit", href: "/admin/sales", icon: Receipt },
      { name: "Meat Yield Benchmarks", href: "/admin/yield", icon: Flame },
      { name: "FSSAI & Hygiene", href: "/admin/compliance", icon: ShieldCheck },
      { name: "Audit Trail", href: "/admin/audit", icon: FilePieChart },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "HQ Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const franchiseNav = [
  {
    label: "STORE TERMINAL",
    items: [
      { name: "Store Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Counter POS Terminal", href: "/pos", icon: Flame },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { name: "Shifts & Cash Drawer", href: "/admin/sales", icon: Receipt },
      { name: "Spit Meat Yield", href: "/admin/yield", icon: Flame },
      { name: "Menu & 86 List", href: "/admin/menu", icon: UtensilsCrossed },
      { name: "FSSAI & Hygiene Logs", href: "/admin/compliance", icon: ShieldCheck },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { name: "Store Royalty Statements", href: "/admin/royalties", icon: WalletCards },
      { name: "Store Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, activeOutlet, selectedOutletId } = useFranchise();
  const [user, setUser] = useState<{ name: string; email: string; role: string; avatarUrl?: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    getCurrentUserCached().then((res) => {
      if (res) {
        setUser({ name: res.name as string, email: res.email as string, role: res.role as string, avatarUrl: res.avatarUrl as string });
      }
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const res = await logout();
    if (res.success) {
      clearCurrentUserCache();
      clearPersistentCache();
      router.push("/login");
    }
    setIsLoggingOut(false);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#1f1f1f] lg:rounded-[20px] dark:border dark:border-[#303030] shadow-[0_2px_16px_rgba(0,0,0,0.07)] dark:shadow-none overflow-hidden">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#f0f0f2] dark:border-[#303030]">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              Irani Koyla
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                OS
              </span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
              Franchise Network
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3" aria-label="FranchiseOS workspace">
        {(role === "SUPER_ADMIN" ? superAdminNav : franchiseNav).map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? "" : "mt-4"}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
              {section.label}
            </p>
            <ul role="list" className="flex flex-col gap-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-x-3 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                        isActive
                          ? "bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold shadow-sm"
                          : "text-[#4b4b5a] dark:text-zinc-400 hover:text-[#111114] dark:hover:text-white hover:bg-[#f7f7f9] dark:hover:bg-[#303030]"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-amber-500" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          isActive
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-white"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Profile & Status */}
      <div className="border-t border-[#f0f0f2] dark:border-[#303030] p-3 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#161618]">
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          className="flex flex-1 items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-[#1f1f1f] transition-colors cursor-pointer min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {role === "SUPER_ADMIN" ? "HQ" : "FO"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
              {role === "SUPER_ADMIN" ? "admin" : activeOutlet?.ownerName || "partner"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
              {role === "SUPER_ADMIN" ? "admin@iranikoyla.com" : activeOutlet?.ownerEmail || "partner.bandra@iranikoyla.com"}
            </span>
            <span className="text-[9px] font-mono text-amber-500/70 uppercase tracking-wider mt-0.5">
              v1.0.0 [BUILD 1]
            </span>
          </div>
        </Link>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
          aria-label="Log out"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default function AdminSidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-[17.5rem] lg:shrink-0 lg:pl-4 lg:py-4 lg:pr-0">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw]"
            >
              <div className="relative h-full">
                <button
                  onClick={onClose}
                  className="icon-button absolute top-4 right-4 z-10 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#303030] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
                <SidebarBody onNavigate={onClose} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
