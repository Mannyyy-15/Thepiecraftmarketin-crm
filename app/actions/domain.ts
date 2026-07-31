"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/app/actions/auth";
import { db } from "@/lib/db";
import {
  accounts,
  auditEvents,
  connectorAccounts,
  contacts,
  dealStages,
  deals,
  organizationMemberships,
  organizations,
} from "@/lib/schema";
import {
  requireTenantContext,
  TenantAuthorizationError,
  writeAuditEvent,
} from "@/lib/tenancy";

const internalRoles = ["owner", "admin", "manager", "member"] as const;
const managerRoles = ["owner", "admin", "manager"] as const;
const adminRoles = ["owner", "admin"] as const;
const idSchema = z.number().int().positive();
const optionalIdSchema = idSchema.nullish();
const nullableText = (length: number) =>
  z.string().trim().max(length).nullish().transform((value) => value || null);

const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  legalName: nullableText(255),
  website: z.string().trim().url().max(500).nullish().or(z.literal("")).transform((value) => value || null),
  industry: nullableText(100),
  billingEmail: z.string().trim().email().max(255).nullish().or(z.literal("")).transform((value) => value || null),
  phone: nullableText(50),
  ownerId: optionalIdSchema,
});

const contactInputSchema = z.object({
  accountId: optionalIdSchema,
  firstName: z.string().trim().min(1).max(120),
  lastName: nullableText(120),
  email: z.string().trim().email().max(255).nullish().or(z.literal("")).transform((value) => value || null),
  phone: nullableText(50),
  jobTitle: nullableText(120),
  ownerId: optionalIdSchema,
  consentStatus: z.enum(["unknown", "granted", "denied", "withdrawn"]).default("unknown"),
});

const dealInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  accountId: optionalIdSchema,
  primaryContactId: optionalIdSchema,
  stageId: optionalIdSchema,
  ownerId: optionalIdSchema,
  amount: z.number().int().min(0).max(2_147_483_647).default(0),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).default("INR"),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  utmSource: nullableText(255),
  utmMedium: nullableText(255),
  utmCampaign: nullableText(255),
  utmTerm: nullableText(255),
  utmContent: nullableText(255),
  gclid: nullableText(255),
  gbraid: nullableText(255),
  wbraid: nullableText(255),
  fbclid: nullableText(255),
});

function actionError(error: unknown) {
  if (error instanceof TenantAuthorizationError) {
    return { success: false as const, error: error.message };
  }
  if (error instanceof z.ZodError) {
    return {
      success: false as const,
      error: error.issues[0]?.message || "Invalid input.",
    };
  }
  console.error("[Tenant CRM]", error);
  return { success: false as const, error: "The operation could not be completed." };
}

async function assertUserInTenant(organizationId: number, userId: number | null | undefined) {
  if (!userId || !db) return;
  const rows = await db
    .select({ id: organizationMemberships.id })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active")
      )
    )
    .limit(1);
  if (!rows[0]) throw new TenantAuthorizationError();
}

export async function getMyOrganizations() {
  try {
    const user = await getCurrentUser();
    if (!user || !db) return { success: false as const, data: [], error: "Unauthorized." };

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        timezone: organizations.timezone,
        baseCurrency: organizations.baseCurrency,
        role: organizationMemberships.role,
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
      .where(
        and(
          eq(organizationMemberships.userId, Number(user.id)),
          eq(organizationMemberships.status, "active"),
          eq(organizations.status, "active")
        )
      )
      .orderBy(asc(organizations.name));
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  timezone?: string;
  baseCurrency?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin" || !db) throw new TenantAuthorizationError();
    const parsed = z.object({
      name: z.string().trim().min(2).max(255),
      slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
      timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata"),
      baseCurrency: z.string().trim().regex(/^[A-Z]{3}$/).default("INR"),
    }).parse(input);

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values(parsed);
      const [organization] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, parsed.slug))
        .limit(1);
      if (!organization) throw new Error("Organization insert failed.");
      await tx.insert(organizationMemberships).values({
        organizationId: organization.id,
        userId: Number(user.id),
        role: "owner",
        status: "active",
      });
      await tx.insert(dealStages).values([
        { organizationId: organization.id, name: "Qualified", position: 10, probability: 20, kind: "open" },
        { organizationId: organization.id, name: "Proposal", position: 20, probability: 50, kind: "open" },
        { organizationId: organization.id, name: "Negotiation", position: 30, probability: 75, kind: "open" },
        { organizationId: organization.id, name: "Won", position: 40, probability: 100, kind: "won" },
        { organizationId: organization.id, name: "Lost", position: 50, probability: 0, kind: "lost" },
      ]);
      await tx.insert(auditEvents).values({
        organizationId: organization.id,
        actorUserId: Number(user.id),
        action: "organization.created",
        entityType: "organization",
        entityId: String(organization.id),
        afterData: JSON.stringify({ name: parsed.name, slug: parsed.slug }),
      });
    });
    return { success: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function listAccounts(organizationId: number) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), internalRoles);
    if (!db) throw new Error("Database not connected.");
    const rows = await db.select().from(accounts)
      .where(eq(accounts.organizationId, context.organizationId))
      .orderBy(asc(accounts.name));
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}

export async function createAccount(organizationId: number, input: z.input<typeof accountInputSchema>) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), managerRoles);
    const values = accountInputSchema.parse(input);
    if (!db) throw new Error("Database not connected.");
    await assertUserInTenant(context.organizationId, values.ownerId);
    await db.insert(accounts).values({ ...values, organizationId: context.organizationId });
    const [created] = await db.select().from(accounts)
      .where(and(eq(accounts.organizationId, context.organizationId), eq(accounts.name, values.name)))
      .orderBy(desc(accounts.id)).limit(1);
    await writeAuditEvent(context, { action: "account.created", entityType: "account", entityId: created?.id, after: values });
    return { success: true as const, data: created };
  } catch (error) {
    return actionError(error);
  }
}

export async function listContacts(organizationId: number) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), internalRoles);
    if (!db) throw new Error("Database not connected.");
    const rows = await db.select().from(contacts)
      .where(eq(contacts.organizationId, context.organizationId))
      .orderBy(desc(contacts.createdAt));
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}

export async function createContact(organizationId: number, input: z.input<typeof contactInputSchema>) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), internalRoles);
    const values = contactInputSchema.parse(input);
    if (!db) throw new Error("Database not connected.");
    await assertUserInTenant(context.organizationId, values.ownerId);
    if (values.accountId) {
      const [account] = await db.select({ id: accounts.id }).from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.organizationId, context.organizationId))).limit(1);
      if (!account) throw new TenantAuthorizationError();
    }
    await db.insert(contacts).values({ ...values, organizationId: context.organizationId });
    const [created] = await db.select().from(contacts)
      .where(eq(contacts.organizationId, context.organizationId)).orderBy(desc(contacts.id)).limit(1);
    await writeAuditEvent(context, { action: "contact.created", entityType: "contact", entityId: created?.id, after: values });
    return { success: true as const, data: created };
  } catch (error) {
    return actionError(error);
  }
}

export async function listDeals(organizationId: number) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), internalRoles);
    if (!db) throw new Error("Database not connected.");
    const rows = await db.select().from(deals)
      .where(eq(deals.organizationId, context.organizationId))
      .orderBy(desc(deals.createdAt));
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}

export async function createDeal(organizationId: number, input: z.input<typeof dealInputSchema>) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), managerRoles);
    const values = dealInputSchema.parse(input);
    if (!db) throw new Error("Database not connected.");
    await assertUserInTenant(context.organizationId, values.ownerId);

    if (values.accountId) {
      const [account] = await db.select({ id: accounts.id }).from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.organizationId, context.organizationId))).limit(1);
      if (!account) throw new TenantAuthorizationError();
    }
    if (values.primaryContactId) {
      const [contact] = await db.select({ id: contacts.id }).from(contacts)
        .where(and(eq(contacts.id, values.primaryContactId), eq(contacts.organizationId, context.organizationId))).limit(1);
      if (!contact) throw new TenantAuthorizationError();
    }
    if (values.stageId) {
      const [stage] = await db.select({ id: dealStages.id }).from(dealStages)
        .where(and(eq(dealStages.id, values.stageId), eq(dealStages.organizationId, context.organizationId))).limit(1);
      if (!stage) throw new TenantAuthorizationError();
    }

    await db.insert(deals).values({ ...values, organizationId: context.organizationId });
    const [created] = await db.select().from(deals)
      .where(eq(deals.organizationId, context.organizationId)).orderBy(desc(deals.id)).limit(1);
    await writeAuditEvent(context, { action: "deal.created", entityType: "deal", entityId: created?.id, after: values });
    return { success: true as const, data: created };
  } catch (error) {
    return actionError(error);
  }
}

export async function listConnectorAccounts(organizationId: number) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), adminRoles);
    if (!db) throw new Error("Database not connected.");
    const rows = await db.select({
      id: connectorAccounts.id,
      provider: connectorAccounts.provider,
      externalAccountId: connectorAccounts.externalAccountId,
      displayName: connectorAccounts.displayName,
      status: connectorAccounts.status,
      lastSyncedAt: connectorAccounts.lastSyncedAt,
      lastError: connectorAccounts.lastError,
      createdAt: connectorAccounts.createdAt,
    }).from(connectorAccounts)
      .where(eq(connectorAccounts.organizationId, context.organizationId))
      .orderBy(asc(connectorAccounts.provider));
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}

export async function listAuditEvents(organizationId: number, limit = 100) {
  try {
    const context = await requireTenantContext(idSchema.parse(organizationId), adminRoles);
    const safeLimit = z.number().int().min(1).max(250).parse(limit);
    if (!db) throw new Error("Database not connected.");
    const rows = await db.select().from(auditEvents)
      .where(eq(auditEvents.organizationId, context.organizationId))
      .orderBy(desc(auditEvents.createdAt)).limit(safeLimit);
    return { success: true as const, data: rows };
  } catch (error) {
    return { ...actionError(error), data: [] };
  }
}
