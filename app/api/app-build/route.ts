import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const releaseId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_URL ||
    "local-development";
  return NextResponse.json(
    { releaseId },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
