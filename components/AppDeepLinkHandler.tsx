"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trustedAccessPath } from "@/lib/access-links";

export default function AppDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => Promise<void>) | undefined;
    const handledUrls = new Set<string>();

    const handleUrl = (url: string) => {
      if (cancelled || handledUrls.has(url)) return;
      const target = trustedAccessPath(url);
      if (!target) return;
      handledUrls.add(url);
      router.replace(target);
    };

    void Promise.all([import("@capacitor/core"), import("@capacitor/app")])
      .then(async ([{ Capacitor }, { App }]) => {
        if (cancelled || !Capacitor.isNativePlatform()) return;

        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          handleUrl(url);
        });
        removeListener = () => listener.remove();

        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) handleUrl(launchUrl.url);
      })
      .catch(() => {
        // The web app can run without native plugins; ignore unavailable bridges.
      });

    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, [router]);

  return null;
}
