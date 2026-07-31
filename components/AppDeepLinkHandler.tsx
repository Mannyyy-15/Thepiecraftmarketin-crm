"use client";

import { useEffect } from "react";

export default function AppDeepLinkHandler() {
  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => Promise<void>) | undefined;

    void Promise.all([import("@capacitor/core"), import("@capacitor/app")]).then(
      ([{ Capacitor }, { App }]) => {
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const listener = App.addListener("appUrlOpen", ({ url }) => {
          if (cancelled) return;
          try {
            const incoming = new URL(url);
            if (incoming.protocol !== "https:" || incoming.pathname !== "/access") return;
            window.location.assign(`/access${incoming.hash}`);
          } catch {
            // Ignore malformed or unrelated operating-system links.
          }
        });
        removeListener = async () => (await listener).remove();
      }
    );

    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, []);

  return null;
}
