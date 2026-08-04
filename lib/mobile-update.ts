export const androidRelease = {
  versionCode: 11,
  versionName: "1.5.4",
  minimumVersionCode: 1,
  apkUrl: "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.5.4/ThePieCraft-CRM-v1.5.4.apk",
  sha256: "F65D9299F7480B97D11E817EBD07648980DA8B7BC1E3EFE9AE79435C0E12947D",
  title: "PieCraft CRM v1.5.4 Update Available",
  notes: [
    "Real push notifications now work — punch-in/out, leave requests, and other activity alerts arrive even when the app is closed.",
    "Fixed garbled text (dashes, rupee signs, bullets) showing up across the app.",
    "Team page: permissions are now hidden until you tap Edit, and grant instantly instead of waiting on the server.",
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
