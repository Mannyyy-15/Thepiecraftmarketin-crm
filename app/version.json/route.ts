import { NextResponse } from "next/server";
import { androidRelease } from "@/lib/mobile-update";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      latestVersion: androidRelease.versionName,
      versionCode: androidRelease.versionCode,
      apkUrl: androidRelease.apkUrl,
      notes: androidRelease.notes,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
