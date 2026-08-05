export const androidRelease = {
  versionCode: 12,
  versionName: "1.6.0",
  minimumVersionCode: 1,
  apkUrl: "https://raw.githubusercontent.com/Mannyyy-15/Thepiecraftmarketin-crm/main/ThePieCraft-CRM-App-Debug.apk",
  sha256: "B6F17E4D71E0261F81AF1C1CBF34A145B35931AB238D3196952150B5BDBE2D02",
  title: "PieCraft CRM v1.6.0 Update Available",
  notes: [
    "Clean dark launch screen — native splash screen icon removed.",
    "Smart conditional client onboarding (Meta Ads, Web Dev, Agency Retainer).",
    "Studio AI now queries live CRM database context (clients, invoices, unpaid balances).",
    "Automated invoice billing sync and performance improvements.",
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
