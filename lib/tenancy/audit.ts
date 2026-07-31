import { db } from "@/lib/db";
import { auditEvents } from "@/lib/schema";
import type { TenantContext } from "./authorization";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: number | string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

function serializeAuditValue(value: unknown) {
  if (value === undefined) return null;
  const serialized = JSON.stringify(value);
  return serialized.length <= 60_000 ? serialized : JSON.stringify({ truncated: true });
}
export async function writeAuditEvent(context: TenantContext, input: AuditInput) {
  if (!db) throw new Error("Database not connected.");

  await db.insert(auditEvents).values({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: input.action.slice(0, 100),
    entityType: input.entityType.slice(0, 100),
    entityId: input.entityId == null ? null : String(input.entityId).slice(0, 100),
    beforeData: serializeAuditValue(input.before),
    afterData: serializeAuditValue(input.after),
    metadata: serializeAuditValue(input.metadata),
  });
}
