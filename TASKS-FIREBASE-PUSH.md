# Firebase Push Notification Setup (Pending)

## Overview

Currently the app uses **in-app notifications** (bell icon) + **local notifications** (via `@capacitor/local-notifications`). Local notifications only fire when the app is in the foreground or background — they won't show if the app is killed.

To get **true push notifications** (phone receives the notification even when the app is closed), follow the steps below.

---

## Step 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project**, name it (e.g. "ThePieCraft CRM")
3. Disable Google Analytics (or enable, optional)
4. Once created, click the Android icon to add an Android app

## Step 2 — Add Android App to Firebase

1. Package name: check `android/app/build.gradle` → `applicationId` (should be `com.thepiecraft.crm`)
2. App nickname: `ThePieCraft CRM Android`
3. Download `google-services.json` and place it at:
   ```
   android/app/google-services.json
   ```
4. Follow Firebase instructions to add `google-services` plugin to `android/build.gradle` and `android/app/build.gradle`

## Step 3 — Add iOS App to Firebase

1. Bundle ID: check `ios/App/App.xcodeproj` or `ios/App/App/Info.plist` → bundle identifier (likely `com.thepiecraft.crm`)
2. App nickname: `ThePieCraft CRM iOS`
3. Download `GoogleService-Info.plist` and place it at:
   ```
   ios/App/App/GoogleService-Info.plist
   ```

## Step 4 — Install Capacitor Push Plugin

```bash
npm install @capacitor/push-notifications
npx cap sync
```

## Step 5 — Update Server Action (crm.ts)

In `app/actions/crm.ts`, the `createNotification` function needs to also send a push notification via FCM HTTP API.

Add a helper function:

```ts
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY; // from Firebase Console → Cloud Messaging

async function sendPushNotification(userId: number, title: string, body: string) {
  if (!FCM_SERVER_KEY || !db) return;
  // 1. Look up user's FCM device token(s) — need a `device_tokens` table
  // 2. Call Firebase HTTP API:
  //    POST https://fcm.googleapis.com/fcm/send
  //    Headers: Authorization: key={FCM_SERVER_KEY}, Content-Type: application/json
  //    Body: { to: token, notification: { title, body } }
}
```

## Step 6 — Add Device Tokens Table

In `lib/schema.ts`, add:

```ts
export const deviceTokens = mysqlTable("device_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // "ios" | "android"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Step 7 — Register Device Token (Frontend)

Create a component (e.g. `components/PushNotificationRegister.tsx`) that runs once on mount:

```tsx
import { isCapacitor } from "@/lib/capacitor";
import { PushNotifications } from "@capacitor/push-notifications";

useEffect(() => {
  if (!isCapacitor()) return;

  PushNotifications.requestPermissions().then(result => {
    if (result.receive === "granted") {
      PushNotifications.register();
    }
  });

  PushNotifications.addListener("registration", token => {
    // Send token.value to server action: saveDeviceToken(token.value, platform)
  });
}, []);
```

Mount it in both `app/admin/layout.tsx` and `app/employee/layout.tsx`.

## Step 8 — Create Server Action for Token Registration

In `app/actions/crm.ts`:

```ts
export async function saveDeviceToken(token: string, platform: string) {
  const session = await getAuthSession();
  if (!session || !db) return { success: false };
  // Upsert token for this user
  await db.insert(schema.deviceTokens).values({
    userId: session.id as number,
    token,
    platform,
  });
  return { success: true };
}
```

## Step 9 — Wire Push into createNotification

Modify `createNotification` in `app/actions/crm.ts` to call `sendPushNotification` after inserting the DB record. You'll need to query `deviceTokens` table for the user's tokens and send FCM requests.

## Step 10 — Test

1. Build the app: `npm run cap:build:android` (or iOS)
2. Install on device
3. Trigger a notification event (punch in, leave request, etc.)
4. Kill the app — notification should still arrive on the phone

---

## Important Notes

- FCM Server Key is found in Firebase Console → Project Settings → Cloud Messaging
- For iOS, you also need to enable Push Notifications capability in Xcode
- For test builds, use a physical device (emulators may not receive push)
- The `@capacitor/push-notifications` plugin automatically handles notification tap events — you can use `PushNotifications.addListener("pushNotificationActionPerformed", ...)` to navigate the user to the relevant page
