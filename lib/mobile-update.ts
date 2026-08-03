export const androidRelease = {
  versionCode: 10,
  versionName: "1.5.3",
  minimumVersionCode: 1,
  apkUrl: "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.5.3/ThePieCraft-CRM-v1.5.3.apk",
  sha256: "1E0DAD59104E0568E671D86AEFCA70C9F90D27E76866E496CEFBB39A5867909A",
  title: "PieCraft CRM v1.5.3 Update Available",
  notes: [
    "Employee and client pages now share the admin design language — same colors, spacing, borders, and page headers across the whole app.",
    "Sidebars and top bars are unified on all three sides for a consistent look in dark mode.",
    "Updates now install directly inside the app — no browser, no manual APK download.",
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
