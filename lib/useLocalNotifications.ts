"use client";

import { useEffect } from "react";
import { isCapacitor } from "./capacitor";
import { registerFcmToken } from "@/app/actions/crm";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

export function useLocalNotifications() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitor()) return;

    let cleanupFn: (() => void) | undefined;

    const initPush = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Create notification channel for Android before requesting permissions
        if (Capacitor.getPlatform() === "android") {
          try {
            await PushNotifications.createChannel({
              id: "thepiecraft-crm",
              name: "ThePieCraft CRM",
              description: "CRM activity updates — clients, leads, expenses, messages",
              importance: 4, // HIGH
              visibility: 1, // PUBLIC
              vibration: true,
              lights: true,
              lightColor: "#3a58e8",
            });
            console.log("FCM notification channel created successfully.");
          } catch (channelErr) {
            console.error("Error creating FCM channel:", channelErr);
          }
        }

        // Request permissions
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("Push notification permission denied.");
          return;
        }

        // Register with Firebase
        await PushNotifications.register();

        // Listen for successful registration and save the token
        const registrationListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            console.log("FCM Registration success, token:", token.value);
            const platform = Capacitor.getPlatform(); // 'android' or 'ios'
            try {
              const res = await registerFcmToken(token.value, platform);
              if (res.success) {
                console.log("FCM Token successfully registered on server.");
              } else {
                console.error("Failed to register FCM Token on server.");
              }
            } catch (regErr) {
              console.error("Error sending FCM Token to server:", regErr);
            }
          }
        );

        // Listen for registration error
        const errorListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.error("FCM Registration error:", err.error);
          }
        );

        // Listen for incoming notifications when app is in foreground
        const notificationListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push notification received in foreground:", notification);
          }
        );

        // Listen for notification tap action
        const actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("Push notification action performed:", action);
            const link = action.notification.data?.link;
            if (link) {
              router.push(link);
            }
          }
        );

        cleanupFn = () => {
          registrationListener.remove();
          errorListener.remove();
          notificationListener.remove();
          actionListener.remove();
        };
      } catch (err) {
        console.error("Error initializing push notifications:", err);
      }
    };

    initPush();

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [router]);
}
