export const androidRelease = {
  versionCode: 3,
  versionName: "1.2.0",
  minimumVersionCode: 1,
  apkUrl:
    "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.2.0/ThePieCraft-CRM-v1.2.0.apk",
  sha256: "21e0f87be7a4345033e8785d2a06833d123766f7de038ed4276e814031bddeb2",
  title: "A new CRM app update is ready",
  notes: [
    "Adds verified app links for crm.thepiecraftmarketing.com.",
    "Keeps the original Vercel address as a safe fallback.",
  ],
} as const;

export function shouldOfferAndroidUpdate(
  installedVersionCode: number,
  latestVersionCode: number
) {
  return (
    Number.isSafeInteger(installedVersionCode) &&
    installedVersionCode > 0 &&
    Number.isSafeInteger(latestVersionCode) &&
    latestVersionCode > installedVersionCode
  );
}
