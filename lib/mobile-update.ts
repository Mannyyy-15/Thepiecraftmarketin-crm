export const androidRelease = {
  versionCode: 6,
  versionName: "1.4.0",
  minimumVersionCode: 1,
  apkUrl: "https://crm.thepiecraftmarketing.com/api/mobile-apk",
  sha256: "0000000000000000000000000000000000000000000000000000000000000006",
  title: "PieCraft CRM v1.4.0 Update Available",
  notes: [
    "Redesigned animated app preloader with glowing PieCraft shield ring.",
    "Instant auto-dismiss preloader upon data hydration.",
    "Ultra-smooth page navigation & 0ms local storage caching.",
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
