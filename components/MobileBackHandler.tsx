'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';

// Section root pages — pressing back here should confirm before exiting
const SECTION_ROOTS = new Set(['/employee', '/admin', '/client', '/login', '/']);

function getSectionRoot(path: string): string {
  if (path.startsWith('/admin')) return '/admin';
  if (path.startsWith('/employee')) return '/employee';
  if (path.startsWith('/client')) return '/client';
  return '/';
}

export default function MobileBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const lastBackTime = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { App } = await import('@capacitor/app');
        if (cancelled) return;

        cleanupRef.current?.();

        const { remove } = await App.addListener('backButton', ({ canGoBack }) => {
          const atRoot = SECTION_ROOTS.has(pathname);

          if (atRoot) {
            const now = Date.now();
            if (now - lastBackTime.current < 2000) {
              App.exitApp();
            } else {
              lastBackTime.current = now;
              toast('Press back again to exit', 'info', 2000);
            }
            return;
          }

          if (canGoBack || window.history.length > 1) {
            router.back();
          } else {
            // No browser history — navigate to section home instead of exiting
            router.push(getSectionRoot(pathname));
          }
        });

        cleanupRef.current = remove;
      } catch {
        // Not running in Capacitor — no-op
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    };
  }, [pathname, router, toast]);

  return null;
}
