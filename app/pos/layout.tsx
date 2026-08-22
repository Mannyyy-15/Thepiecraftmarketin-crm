"use client";

import { useState } from "react";
import PosSidebar, { PosMobileSidebar } from "@/components/PosSidebar";
import PosTopNav from "@/components/PosTopNav";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Floating Curved Sidebar */}
      <PosSidebar />

      {/* Mobile Slide-out Drawer */}
      <PosMobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Right Section (TopNav + Scrollable Content) */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <PosTopNav onMenuClick={() => setMobileMenuOpen(true)} />

        <main
          id="pos-main-content"
          className="mobile-content-safe flex-1 overflow-y-auto lg:pb-0"
        >
          <div className="p-4 sm:p-6 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
