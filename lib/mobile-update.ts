export const androidRelease = {
  versionCode: 4,
  versionName: "1.2.1",
  minimumVersionCode: 1,
  apkUrl:
    "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.2.1/ThePieCraft-CRM-v1.2.1.apk",
  sha256: "f4d570de6dc17366b7d20811f41f44a5194672ac7a6883eed21539f26d29cb8d",
  title: "A new CRM app update is ready",
  notes: [
    "Fixes invitation links opening the installed Android app.",
    "Keeps website downloads and in-app updates on the same release.",
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
