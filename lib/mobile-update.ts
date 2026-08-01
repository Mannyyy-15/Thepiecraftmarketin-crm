export const androidRelease = {
  versionCode: 2,
  versionName: "1.1.0",
  minimumVersionCode: 1,
  apkUrl:
    "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.1.0/ThePieCraft-CRM-v1.1.0.apk",
  sha256: "114863789ef542aabe19b0be29e4bd023c2063ca01bf9cd0c5dff26deb0eabc7",
  title: "A new CRM app update is ready",
  notes: [
    "Adds secure in-app Android updates without opening a browser.",
    "Keeps the native shell current while normal CRM changes continue to update automatically.",
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
