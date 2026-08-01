"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ACCESS_ORIGIN = "https://thepiecraft-crm.vercel.app";
const LOGIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function trustedAccessPath(value: string) {
  try {
    const incoming = new URL(value);
    if (
      incoming.origin !== ACCESS_ORIGIN ||
      incoming.pathname !== "/access" ||
      incoming.username !== "" ||
      incoming.password !== ""
    ) {
      return null;
    }

    const fragmentToken = incoming.hash.slice(1);
    const queryEntries = [...incoming.searchParams.entries()];
    const fragmentOnly =
      incoming.search === "" && LOGIN_TOKEN_PATTERN.test(fragmentToken);
    const queryOnly =
      incoming.hash === "" &&
      queryEntries.length === 1 &&
      queryEntries[0][0] === "token" &&
      LOGIN_TOKEN_PATTERN.test(queryEntries[0][1]);

    if (!fragmentOnly && !queryOnly) return null;
    const token = fragmentOnly ? fragmentToken : queryEntries[0][1];

    return `/access#${token}`;
  } catch {
    return null;
  }
}

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
