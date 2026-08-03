export const androidRelease = {
  versionCode: 8,
  versionName: "1.5.1",
  minimumVersionCode: 1,
  apkUrl: "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.5.1/ThePieCraft-CRM-v1.5.1.apk",
  sha256: "11B23C9C3FAE6079EE465624360BA9978A5D169EC572A4E4C502D525F47DF392",
  title: "PieCraft CRM v1.5.1 Update Available",
  notes: [
    "App preloader now shows once on launch only, never on page changes.",
    "Route changes use lightweight skeleton placeholders for smooth transitions.",
    "Faster in-app updates with a direct download link.",
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
