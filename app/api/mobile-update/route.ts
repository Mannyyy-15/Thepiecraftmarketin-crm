import { NextResponse } from "next/server";
import { androidRelease } from "@/lib/mobile-update";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    { platform: "android", ...androidRelease },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
