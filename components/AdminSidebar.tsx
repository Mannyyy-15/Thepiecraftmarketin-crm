"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Contact2,
  BadgeDollarSign,
  FolderKanban,
  BarChart3,
  Target,
  Code2,
  UsersRound,
  FilePieChart,
  Receipt,
  Files,
  Settings,
  Sparkles,
  WalletCards,
  X,
  LogOut,
  Workflow,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui/cn";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { logout } from "@/app/actions/auth";
import { clearCurrentUserCache, getCurrentUserCached } from "@/lib/currentUserClient";
import { clearPersistentCache } from "@/hooks/useActionCache";

const navigationSections = [
  {
    label: "Home",
    items: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads", href: "/admin/leads", icon: Target },
      { name: "Clients", href: "/admin/clients", icon: Briefcase },
    ],
  },
  {
    label: "Delivery",
    items: [
      { name: "Team", href: "/admin/team", icon: UsersRound },
      { name: "Projects", href: "/admin/projects", icon: FolderKanban },
      { name: "Meta Ads", href: "/admin/ads", icon: BarChart3 },
      { name: "Website Dev", href: "/admin/website-dev", icon: Code2 },
      { name: "Agency Ops", href: "/admin/agency-operations", icon: Workflow },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "Finance", href: "/admin/finance", icon: WalletCards },
      { name: "Invoices", href: "/admin/invoices", icon: Receipt },
      { name: "Documents", href: "/admin/documents", icon: Files },
      { name: "Reports", href: "/admin/reports", icon: FilePieChart },
      { name: "Integrations", href: "/admin/integrations", icon: PlugZap },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Studio AI", href: "/admin/studio-ai", icon: Sparkles },
      { name: "Settings", href: "/admin/settings", icon: Settings },
      { name: "Security", href: "/admin/security", icon: ShieldCheck },
    ],
  },
] as const;

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
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
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[#f0f0f2] dark:border-[#303030]">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="relative w-9 h-9 rounded-xl bg-brand-hero flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              ThePieCraft
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              Agency OS
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Admin workspace">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex === 0 ? "" : "mt-4"}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                    "group relative flex min-h-11 items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-[#eff6ff] dark:bg-blue-500/15 text-blue-700 dark:text-white"
                      : "text-[#4b4b5a] dark:text-[#9999a8] hover:text-[#111114] dark:hover:text-white hover:bg-[#f7f7f9] dark:hover:bg-[#303030]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-blue-600 dark:bg-blue-400" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-slate-400 dark:text-[#5a5a68] group-hover:text-slate-700 dark:group-hover:text-white"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#f0f0f2] dark:border-[#303030] p-3 flex items-center justify-between gap-2">
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          className="flex flex-1 items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-[#303030] transition-colors cursor-pointer min-w-0"
        >
          <Avatar name={user?.name || "Admin"} role={user?.role} src={user?.avatarUrl} status="online" size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.name || "Agency Admin"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || "admin@thepiecraft.com"}
            </span>
            <span className="inline-block mt-1 text-[9px] font-extrabold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full w-fit uppercase tracking-wider">
              v1.5.0 (Build 7)
            </span>
          </div>
        </Link>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="icon-button text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
          aria-label="Log out"
          title="Log Out"
        >
          <LogOut className="h-4.5 w-4.5" />
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
      <aside className="hidden lg:flex lg:w-[18rem] lg:shrink-0 lg:pl-4 lg:py-4 lg:pr-0">
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
