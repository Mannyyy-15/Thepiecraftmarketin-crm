import { NextResponse } from "next/server";
import { androidRelease } from "@/lib/mobile-update";

export const dynamic = "force-dynamic";

export function GET() {
  const target = new URL(androidRelease.apkUrl);
  if (target.protocol !== "https:" || target.hostname !== "github.com") {
    return NextResponse.json(
      { error: "The Android download is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
