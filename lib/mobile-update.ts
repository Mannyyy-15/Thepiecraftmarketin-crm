export const androidRelease = {
  versionCode: 13,
  versionName: "1.6.1",
  minimumVersionCode: 13,
  apkUrl: "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/v1.6.1/ThePieCraft-CRM-App-Debug.apk",
  sha256: "2016142CC9B00389CB6FA43BC8D46E5B04B34AE4BE12C308902D18B8EB82A359",
  title: "Irani Koyla OS v1.6.1 Update Available",
  notes: [
    "Removed redundant punch in/out buttons — simplified to slide-to-punch control.",
    "Cleaned up Today Activity timeline & status labels.",
    "Eliminated extra bottom scroll space on employee home.",
    "Android native notification & in-app update trigger active.",
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
