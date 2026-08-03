export const androidRelease = {
  versionCode: 9,
  versionName: "1.5.2",
  minimumVersionCode: 1,
  apkUrl: "https://github.com/Mannyyy-15/Thepiecraftmarketin-crm/releases/download/android-v1.5.2/ThePieCraft-CRM-v1.5.2.apk",
  sha256: "AB95FEC84030DEFB6A59E73CA023EDC183929CDCFC150A0D85AEC30E39C536CC",
  title: "PieCraft CRM v1.5.2 Update Available",
  notes: [
    "Updates now install directly inside the app — no browser, no manual APK download.",
    "Attendance: admin-marked full-day presence shows completed shift hours, and counts toward weekly hours.",
    "Attendance dates now use the organization timezone, so punches always land on the right day.",
    "Update prompt now appears only in the native app, never on the website.",
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
