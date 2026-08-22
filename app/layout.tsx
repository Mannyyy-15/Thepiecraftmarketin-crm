import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/providers/ToastProvider";
import MobileBackHandler from "@/components/MobileBackHandler";
import { GlobalSyncProvider } from "@/components/providers/GlobalSyncProvider";
import AppDeepLinkHandler from "@/components/AppDeepLinkHandler";
import NativeUpdatePrompt from "@/components/NativeUpdatePrompt";
import { AppPreloader } from "@/components/AppPreloader";
import { FranchiseProvider } from "@/lib/franchise-context";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Irani Koyla FranchiseOS — Shawarma Network Operating System",
  description:
    "The internal operating system for Irani Koyla Shawarma Franchise Network. Manage outlets, meat yield, daily shifts, and royalty statements in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#161618",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <GlobalSyncProvider>
          <ToastProvider>
            <FranchiseProvider>
              <AppPreloader />
              {children}
              <MobileBackHandler />
              <AppDeepLinkHandler />
              <NativeUpdatePrompt />
            </FranchiseProvider>
          </ToastProvider>
        </GlobalSyncProvider>
      </body>
    </html>
  );
}
