'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const DASHBOARD_PATHS = [
  '/admin',
  '/employee',
  '/client',
  '/login',
];

export default function MobileBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { App } = await import('@capacitor/app');
        if (cancelled) return;
        const handler = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.history.length > 1) {
            router.back();
          } else if (DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
            const isDashboard = DASHBOARD_PATHS.includes(pathname);
            if (isDashboard) {
              App.exitApp();
            } else {
              router.back();
            }
          } else {
            App.exitApp();
          }
        });
        cleanupRef.current = () => { handler.remove(); };
      } catch {
        // Not running in Capacitor — no-op
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [pathname, router]);

  return null;
}
