"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { encryptCredentials } from "@/lib/security/credentials";
import { requireTenantContext, writeAuditEvent } from "@/lib/tenancy";

const inputSchema = z.object({
  organizationId: z.number().int().positive(),
  provider: z.enum(["google_ads", "meta_ads", "ga4", "search_console"]),
  externalAccountId: z.string().trim().min(1).max(255),
  displayName: z.string().trim().min(1).max(255),
  credential: z.string().trim().min(20).max(16_384),
});

export async function connectMarketingAccount(input: z.input<typeof inputSchema>) {
  try {
    const value = inputSchema.parse(input);
    const context = await requireTenantContext(value.organizationId, ["owner", "admin"]);
    if (!db) throw new Error("Database not connected.");
    const credentialsEncrypted = encryptCredentials({
      kind: value.provider === "meta_ads" ? "access_token" : "refresh_token",
      token: value.credential,
    });
    const [existing] = await db
      .select({ id: schema.connectorAccounts.id })
      .from(schema.connectorAccounts)
      .where(
        and(
          eq(schema.connectorAccounts.organizationId, context.organizationId),
          eq(schema.connectorAccounts.provider, value.provider),
          eq(schema.connectorAccounts.externalAccountId, value.externalAccountId)
        )
      )
      .limit(1);
    if (existing) {
      await db
        .update(schema.connectorAccounts)
        .set({
          displayName: value.displayName,
          credentialsEncrypted,
          status: "connected",
          lastError: null,
        })
        .where(
          and(
            eq(schema.connectorAccounts.id, existing.id),
            eq(schema.connectorAccounts.organizationId, context.organizationId)
          )
        );
    } else {
      await db.insert(schema.connectorAccounts).values({
        organizationId: context.organizationId,
        provider: value.provider,
        externalAccountId: value.externalAccountId,
        displayName: value.displayName,
        credentialsEncrypted,
        status: "connected",
        createdById: context.userId,
      });
    }
    await writeAuditEvent(context, {
      action: existing ? "connector.updated" : "connector.created",
      entityType: "connector_account",
      entityId: existing?.id,
      metadata: { provider: value.provider, externalAccountId: value.externalAccountId },
    });
    return { success: true as const };
  } catch (error) {
    console.error("[Integrations] Connector save failed.", error);
    return {
      success: false as const,
      error: "The connector could not be saved. Check access and encryption configuration.",
    };
  }
}

export async function disconnectMarketingAccount(
  organizationId: number,
  connectorId: number
) {
  try {
    const context = await requireTenantContext(organizationId, ["owner", "admin"]);
    if (!db) throw new Error("Database not connected.");
    await db
      .update(schema.connectorAccounts)
      .set({ status: "disabled", credentialsEncrypted: encryptCredentials({ revoked: true }) })
      .where(
        and(
          eq(schema.connectorAccounts.id, connectorId),
          eq(schema.connectorAccounts.organizationId, context.organizationId)
        )
      );
    await writeAuditEvent(context, {
      action: "connector.disabled",
      entityType: "connector_account",
      entityId: connectorId,
    });
    return { success: true as const };
  } catch {
    return { success: false as const, error: "The connector could not be disabled." };
  }
}
