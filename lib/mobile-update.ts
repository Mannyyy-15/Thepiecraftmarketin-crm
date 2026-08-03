export const androidRelease = {
  versionCode: 7,
  versionName: "1.5.0",
  minimumVersionCode: 1,
  apkUrl: "https://crm.thepiecraftmarketing.com/api/mobile-apk",
  sha256: "0000000000000000000000000000000000000000000000000000000000000007",
  title: "PieCraft CRM v1.5.0 Update Available",
  notes: [
    "Fixed in-app update detector for all mobile devices.",
    "Added visible App Version badge in sidebar footers (v1.5.0 Build 7).",
    "Redesigned animated 3D app preloader with instant auto-dismiss.",
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
