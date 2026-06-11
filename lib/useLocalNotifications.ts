"use client";

import { useEffect, useRef } from "react";
import { isCapacitor } from "./capacitor";
import { getMyNotifications } from "@/app/actions/crm";
import type { Notification } from "./schema";

let LocalNotifications: any = null;
if (typeof window !== "undefined" && isCapacitor()) {
  import("@capacitor/local-notifications").then((mod) => {
    LocalNotifications = mod.LocalNotifications;
  });
}

// Friendly channel ID → label mapping for Android notification channels
const CHANNEL_ID = "thepiecraft-crm";
const CHANNEL_NAME = "ThePieCraft CRM";

async function ensureChannelAndPermission() {
  if (!LocalNotifications) return false;
  try {
    // Request permission (required on Android 13+ / iOS)
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") return false;

    // Create a named notification channel so Android shows our app name + icon
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      description: "CRM activity updates — clients, leads, expenses, messages",
      importance: 4, // HIGH
      visibility: 1, // PUBLIC
      vibration: true,
      lights: true,
      lightColor: "#3a58e8",
    });
    return true;
  } catch {
    return false;
  }
}

// Map notification type → friendly icon key
function iconForType(type: string): string {
  if (type.includes("message")) return "ic_stat_message";
  if (type.includes("expense") || type.includes("payment")) return "ic_stat_payment";
  if (type.includes("leave")) return "ic_stat_event";
  if (type.includes("punch")) return "ic_stat_access_time";
  return "ic_stat_notification";
}

export function useLocalNotifications() {
  const lastMaxId = useRef<number>(0);
  const channelReady = useRef<boolean>(false);

  useEffect(() => {
    if (!isCapacitor()) return;

    const init = async () => {
      channelReady.current = await ensureChannelAndPermission();
    };
    init();

    const checkAndNotify = async () => {
      if (!channelReady.current) {
        channelReady.current = await ensureChannelAndPermission();
        if (!channelReady.current) return;
      }

      const res = await getMyNotifications();
      if (!res.success || !res.data || res.data.length === 0) return;

      // On first load, snapshot the highest ID without firing any notifications
      if (lastMaxId.current === 0) {
        lastMaxId.current = Math.max(...res.data.map((n: Notification) => n.id));
        return;
      }

      const newNotifs = res.data.filter((n: Notification) => n.id > lastMaxId.current);
      if (newNotifs.length === 0) return;

      lastMaxId.current = Math.max(...res.data.map((n: Notification) => n.id));

      if (!LocalNotifications) return;

      for (const n of newNotifs) {
        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: n.id,
                channelId: CHANNEL_ID,
                title: n.title,
                body: n.message || "",
                smallIcon: iconForType(n.type),
                iconColor: "#3a58e8",
                vibrate: true,
                sound: undefined, // use system default
                autoCancel: true,
                extra: { link: n.link || "/" },
              },
            ],
          });
        } catch (e) {
          console.error("Local notification error:", e);
        }
      }
    };

    // Check immediately after init, then every 15 seconds
    const delay = setTimeout(checkAndNotify, 2000);
    const interval = setInterval(checkAndNotify, 15000);
    return () => {
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, []);
}
