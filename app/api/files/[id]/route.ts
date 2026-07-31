import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { createPrivateDownloadUrl } from "@/lib/storage/private-object-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !db) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [object] = await db
    .select()
    .from(schema.storageObjects)
    .where(
      and(
        eq(schema.storageObjects.id, Number(id)),
        eq(schema.storageObjects.scanStatus, "clean")
      )
    )
    .limit(1);
  if (!object || object.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [membership] = await db
    .select({ role: schema.organizationMemberships.role })
    .from(schema.organizationMemberships)
    .where(
      and(
        eq(
          schema.organizationMemberships.organizationId,
          object.organizationId
        ),
        eq(schema.organizationMemberships.userId, user.id),
        eq(schema.organizationMemberships.status, "active")
      )
    )
    .limit(1);
  if (
    !membership ||
    (membership.role === "client" && object.visibility !== "client")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const signedUrl = await createPrivateDownloadUrl(object.objectKey);
  return NextResponse.redirect(signedUrl, 307);
}
