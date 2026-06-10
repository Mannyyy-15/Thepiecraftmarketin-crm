"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FolderKanban,
  BarChart3,
  Code2,
  FilePieChart,
  CircleDollarSign,
  Files,
  Sparkles,
  MessageSquareText,
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { getCurrentUser, logout } from "@/app/actions/auth";

const navigation = [
  { name: "Home", href: "/employee", icon: Home },
  { name: "Overview", href: "/employee/overview", icon: LayoutDashboard },
  { name: "Attendance", href: "/employee/attendance", icon: Calendar },
  { name: "Meta Ads", href: "/employee/ads", icon: BarChart3 },
  { name: "Website Dev", href: "/employee/website-dev", icon: Code2 },
  { name: "Messages", href: "/employee/messages", icon: MessageSquareText },
  { name: "Projects", href: "/employee/projects", icon: FolderKanban },
  { name: "Clients", href: "/employee/clients", icon: Users },
  { name: "Reports", href: "/employee/reports", icon: FilePieChart },
  { name: "Documents", href: "/employee/documents", icon: Files },
  { name: "Studio AI", href: "/employee/studio-ai", icon: Sparkles },
  { name: "Finance", href: "/employee/finance", icon: CircleDollarSign },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; systemRole: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const res = await logout();
    if (res.success) {
      router.push("/login");
    }
    setIsLoggingOut(false);
  };

  const systemRole = user?.systemRole || "Web Developer";
  const isWebDev = systemRole.toLowerCase().includes("web developer") || systemRole.toLowerCase().includes("developer");

  // Dynamically filter navigation items based on employee role
  const filteredNavigation = navigation.filter((item) => {
    // Hide Studio AI and Finance for all employees (per user request)
    if (item.name === "Studio AI" || item.name === "Finance") {
      return false;
    }
    
    // Hide Meta Ads for Web Developers
    if (item.name === "Meta Ads" && isWebDev) {
      return false;
    }
    
    // Hide Website Dev for non-Web Developers (e.g. Digital Marketing, designers, editors)
    if (item.name === "Website Dev" && !isWebDev) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 lg:rounded-2xl shadow-soft overflow-hidden">
      <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
        <Link href="/employee" className="flex items-center gap-2.5" onClick={onNavigate}>
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
          {filteredNavigation.map((item) => {
            const isActive =
              item.href === "/employee"
                ? pathname === "/employee"
                : pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-600 dark:bg-brand-400" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer min-w-0">
          <Avatar name={user?.name || "Employee"} status="online" size="sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.name || "Team Member"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || "employee@thepiecraft.com"}
            </span>
          </div>
        </div>
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

export default function EmployeeSidebar() {
  return (
    // Desktop only — mobile uses floating bottom navigation instead
    <aside className="hidden lg:flex lg:w-[18rem] lg:shrink-0 lg:pl-4 lg:py-4 lg:pr-0">
      <SidebarBody />
    </aside>
  );
}
