"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  Code2,
  UsersRound,
  FilePieChart,
  CircleDollarSign,
  Files,
  Settings,
  Sparkles,
  MessageSquareText,
  X,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/components/ui/cn";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { getCurrentUser, logout } from "@/app/actions/auth";

const navigation = [
  { name: "Overview",     href: "/admin",              icon: LayoutDashboard },
  { name: "Clients",      href: "/admin/clients",      icon: Users },
  { name: "Team",         href: "/admin/team",         icon: UsersRound },
  { name: "Projects",     href: "/admin/projects",     icon: FolderKanban },
  { name: "Meta Ads",     href: "/admin/ads",          icon: BarChart3 },
  { name: "Website Dev",  href: "/admin/website-dev",  icon: Code2 },
  { name: "Messages",     href: "/admin/messages",     icon: MessageSquareText },
  { name: "Finance",      href: "/admin/finance",      icon: CircleDollarSign },
  { name: "Documents",    href: "/admin/documents",    icon: Files },
  { name: "Reports",      href: "/admin/reports",      icon: FilePieChart },
  { name: "Studio AI",    href: "/admin/studio-ai",    icon: Sparkles },
  { name: "Settings",     href: "/admin/settings",     icon: Settings },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res) {
        setUser({ name: res.name as string, email: res.email as string });
      }
    });
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const res = await logout();
    if (res.success) {
      router.push("/login");
    }
    setIsLoggingOut(false);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-[#0a0f26] border border-slate-200/80 dark:border-brand-900/60 lg:rounded-2xl shadow-soft dark:shadow-none overflow-hidden">
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-200 dark:border-brand-900/50">
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

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Workspace
        </p>
        <ul role="list" className="flex flex-col gap-y-0.5">
          {navigation.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-white"
                      : "text-slate-600 dark:text-brand-200/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-brand-900/40"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-600 dark:bg-brand-400" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-brand-600 dark:text-brand-300"
                        : "text-slate-400 dark:text-brand-300/50 group-hover:text-slate-700 dark:group-hover:text-white"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 dark:border-brand-900/50 p-3 flex items-center justify-between gap-2">
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          className="flex flex-1 items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer min-w-0"
        >
          <Avatar name={user?.name || "Admin"} status="online" size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.name || "Agency Admin"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || "admin@thepiecraft.com"}
            </span>
          </div>
        </Link>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
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
                  className="absolute top-4 right-4 z-10 h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
