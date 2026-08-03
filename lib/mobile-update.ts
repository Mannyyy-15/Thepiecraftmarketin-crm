export const androidRelease = {
  versionCode: 5,
  versionName: "1.3.0",
  minimumVersionCode: 1,
  apkUrl: "https://crm.thepiecraftmarketing.com/api/mobile-apk",
  sha256: "0000000000000000000000000000000000000000000000000000000000000005",
  title: "PieCraft CRM v1.3.0 Update Available",
  notes: [
    "Instant 0ms LocalStorage persistent caching for fast page loading.",
    "Universal Web & Mobile Slide-to-Punch Check-in / Check-out.",
    "Eliminated route-level skeleton flashes across Team, Clients & Projects.",
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
