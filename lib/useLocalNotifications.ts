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

export function useLocalNotifications() {
  const lastMaxId = useRef<number>(0);

  useEffect(() => {
    if (!isCapacitor()) return;

    const checkAndNotify = async () => {
      const res = await getMyNotifications();
      if (!res.success || !res.data || res.data.length === 0) return;

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
                title: n.title,
                body: n.message || "",
                smallIcon: "ic_stat_notification",
                iconColor: "#6366f1",
                vibrate: true,
                sound: "default",
              },
            ],
          });
        } catch (e) {
          console.error("Local notification error:", e);
        }
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 10000);
    return () => clearInterval(interval);
  }, []);
}
