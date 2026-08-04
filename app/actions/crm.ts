"use server";

import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import * as schema from "@/lib/schema";
import { eq, and, or, inArray, desc, gte, gt, asc, isNotNull, isNull, like, notInArray, sql } from "drizzle-orm";
import { getCurrentUser } from "./auth";
import { validateGeofence } from "@/lib/geofence";
import { sendEmail } from "@/lib/mailer";
import { sendSmsWhatsAppNotification } from "@/lib/sms";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import Razorpay from "razorpay";
import { fetchUptimeMonitors } from "@/lib/uptimerobot";
import { z } from "zod";
import {
  deletePrivateFile,
  uploadPrivateFile,
} from "@/lib/storage/private-object-storage";
import { sendFcmMessage } from "@/lib/google-service-account";
import { memberAccountPasswordSchema } from "@/lib/security/password";
import { parseEmployeePermissions, serializeEmployeePermissions, type EmployeePermission } from "@/lib/member-permissions";

// Helper to check user session and get authenticated profile
async function getAuthSession() {
  return await getCurrentUser();
}

type AuthSession = NonNullable<Awaited<ReturnType<typeof getAuthSession>>>;

type OrganizationContext = {
  organizationId: number;
  membershipRole: "owner" | "admin" | "manager" | "member" | "client";
  timezone: string;
};

const publicUserFields = {
  id: schema.users.id,
  name: schema.users.name,
  email: schema.users.email,
  role: schema.users.role,
  systemRole: schema.users.systemRole,
  workingDays: schema.users.workingDays,
  shiftStartTime: schema.users.shiftStartTime,
  shiftEndTime: schema.users.shiftEndTime,
  activeShiftProfile: schema.users.activeShiftProfile,
  avatarUrl: schema.users.avatarUrl,
  permissions: schema.users.permissions,
  lastLoginAt: schema.users.lastLoginAt,
  createdAt: schema.users.createdAt,
};

const idSchema = z.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const projectStatuses = z.enum(["planning", "active", "in-progress", "review", "completed", "cancelled", "archived"]);
const taskStatuses = z.enum(["todo", "in-progress", "in-review", "done"]);

async function getOrganizationContext(session: AuthSession): Promise<OrganizationContext | null> {
  if (!db) return null;
  const [membership] = await db
    .select({
      organizationId: schema.organizationMemberships.organizationId,
      membershipRole: schema.organizationMemberships.role,
      timezone: schema.organizations.timezone,
    })
    .from(schema.organizationMemberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMemberships.organizationId))
    .where(and(
      eq(schema.organizationMemberships.userId, Number(session.id)),
      eq(schema.organizationMemberships.status, "active"),
      eq(schema.organizations.status, "active")
    ))
    .orderBy(asc(schema.organizationMemberships.id))
    .limit(1);
  return membership || null;
}

// "Today" in the organization's timezone — server (Vercel) runs UTC, so without
// this a punch between 00:00-05:29 IST gets stored under yesterday's date and
// the employee calendar (local IST) shows nothing for the day they were present.
function todayInOrgTimezone(timezone: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

async function hasEmployeePermission(session: AuthSession, permission: EmployeePermission) {
  if (session.role === "admin") return true;
  if (session.role !== "employee" || !db) return false;
  const [user] = await db.select({ permissions: schema.users.permissions })
    .from(schema.users).where(eq(schema.users.id, Number(session.id))).limit(1);
  return parseEmployeePermissions(user?.permissions).includes(permission);
}

export async function updateEmployeePermissions(userId: number, permissions: EmployeePermission[]) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) {
      return { success: false, error: "Unauthorized." };
    }
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const isActive = await isActiveOrganizationUser(context.organizationId, userId, ["employee", "admin"]);
    if (!isActive) return { success: false, error: "User not found in your organization." };

    const serialized = serializeEmployeePermissions(permissions);
    await db.update(schema.users)
      .set({ permissions: serialized })
      .where(eq(schema.users.id, userId));

    revalidatePath("/admin/team");
    return { success: true };
  } catch (error: any) {
    console.error("updateEmployeePermissions Error:", error);
    return { success: false, error: error?.message || "Failed to update permissions." };
  }
}

async function getAdminOrganizationContext(session: AuthSession) {
  if (session.role !== "admin") return null;
  if (!db) return null;
  const [membership] = await db
    .select({
      organizationId: schema.organizationMemberships.organizationId,
      membershipRole: schema.organizationMemberships.role,
    })
    .from(schema.organizationMemberships)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMemberships.organizationId))
    .where(and(
      eq(schema.organizationMemberships.userId, Number(session.id)),
      eq(schema.organizationMemberships.status, "active"),
      eq(schema.organizations.status, "active"),
      inArray(schema.organizationMemberships.role, ["owner", "admin"])
    ))
    .orderBy(asc(schema.organizationMemberships.id))
    .limit(1);
  return membership || null;
}

async function isActiveOrganizationUser(
  organizationId: number,
  userId: number,
  roles: Array<"admin" | "employee" | "client"> = ["admin", "employee", "client"]
) {
  if (!db) return false;
  const [member] = await db
    .select({ id: schema.users.id })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .where(and(
      eq(schema.organizationMemberships.organizationId, organizationId),
      eq(schema.organizationMemberships.userId, userId),
      eq(schema.organizationMemberships.status, "active"),
      inArray(schema.users.role, roles)
    ))
    .limit(1);
  return !!member;
}

function invalidInput(error: z.ZodError) {
  return { success: false as const, error: error.issues[0]?.message || "Invalid input." };
}

async function canAccessProject(session: AuthSession, projectId: number) {
  if (!db || !idSchema.safeParse(projectId).success) return false;
  const context = await getOrganizationContext(session);
  if (!context) return false;
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!project || project.organizationId !== context.organizationId) return false;
  if (session.role === "admin" && ["owner", "admin"].includes(context.membershipRole)) return true;
  const userId = Number(session.id);
  if (session.role === "client") {
    const [client] = await db.select({ id: schema.clients.id }).from(schema.clients)
      .where(and(eq(schema.clients.id, project.clientId || 0), eq(schema.clients.ownerId, userId))).limit(1);
    return !!client;
  }
  if (project.leadId === userId) return true;
  try {
    const memberIds = z.array(z.number().int().positive()).parse(JSON.parse(project.teamMemberIds || "[]"));
    if (memberIds.includes(userId)) return true;
  } catch {}
  const [task] = await db.select({ id: schema.tasks.id }).from(schema.tasks)
    .where(and(eq(schema.tasks.projectId, projectId), eq(schema.tasks.userId, userId))).limit(1);
  return !!task;
}

async function canMutateTask(session: AuthSession, taskId: number) {
  if (!db || !idSchema.safeParse(taskId).success) return false;
  const [task] = await db.select({ userId: schema.tasks.userId, projectId: schema.tasks.projectId }).from(schema.tasks)
    .where(eq(schema.tasks.id, taskId)).limit(1);
  if (!task) return false;
  if (session.role === "admin") {
    const context = await getAdminOrganizationContext(session);
    if (!context) return false;
    if (task.projectId) return canAccessProject(session, task.projectId);
    return isActiveOrganizationUser(context.organizationId, task.userId, ["admin", "employee"]);
  }
  return session.role === "employee" && task?.userId === Number(session.id);
}

async function getOwnedClientId(session: AuthSession) {
  if (!db || session.role !== "client") return null;
  const context = await getOrganizationContext(session);
  if (!context) return null;
  const [client] = await db.select({ id: schema.clients.id }).from(schema.clients)
    .where(and(
      eq(schema.clients.organizationId, context.organizationId),
      eq(schema.clients.ownerId, Number(session.id))
    )).limit(1);
  return client?.id ?? null;
}

async function canMessageOrganizationUser(session: AuthSession, otherUserId: number) {
  const context = await getOrganizationContext(session);
  if (!context || !idSchema.safeParse(otherUserId).success || Number(session.id) === otherUserId) return false;
  const [other] = await db!.select({ role: schema.users.role })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .where(and(
      eq(schema.organizationMemberships.organizationId, context.organizationId),
      eq(schema.organizationMemberships.userId, otherUserId),
      eq(schema.organizationMemberships.status, "active")
    )).limit(1);
  if (!other) return false;
  return session.role !== "client" || other.role === "admin";
}

function safeJsonArrayOfIds(value: FormDataEntryValue | null) {
  try {
    const parsed = z.array(z.number().int().positive()).max(100).parse(JSON.parse(String(value || "[]")));
    return JSON.stringify(Array.from(new Set(parsed)));
  } catch {
    return "[]";
  }
}

function createDocumentNumber(prefix: string, date = new Date()) {
  const period = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${prefix}-${period}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function revalidateClientSurfaces() {
  ["/admin", "/admin/clients", "/client", "/client/projects"].forEach(path => revalidatePath(path));
}

function revalidateProjectSurfaces() {
  ["/admin", "/admin/projects", "/admin/team", "/employee", "/employee/overview", "/employee/projects", "/employee/tasks", "/client", "/client/projects"].forEach(path => revalidatePath(path));
}

function revalidateInvoiceSurfaces() {
  ["/admin", "/admin/clients", "/admin/finance", "/admin/invoices", "/client", "/client/invoices"].forEach(path => revalidatePath(path));
}

function revalidateDocumentSurfaces() {
  ["/admin/documents", "/admin/reports", "/employee/documents", "/employee/reports", "/client/documents", "/client/reports"].forEach(path => revalidatePath(path));
}

/**
 * ----------------------------------------------------
 * CLIENT ACTIONS
 * ----------------------------------------------------
 */

// Get clients (Admins see all; employees/clients scoped accordingly)
export async function getClients() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active organization membership." };

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.clients)
        .where(eq(schema.clients.organizationId, context.organizationId));
    } else if (session.role === "employee") {
      const scopedProjects = await getProjects();
      const clientIds = Array.from(new Set((scopedProjects.data || []).map((project: any) => project.clientId).filter(Number.isInteger))) as number[];
      results = clientIds.length
        ? await db.select().from(schema.clients).where(and(
            eq(schema.clients.organizationId, context.organizationId),
            inArray(schema.clients.id, clientIds)
          ))
        : [];
    } else {
      // Clients see their own client record mapped by email
      results = await db.select().from(schema.clients).where(and(
        eq(schema.clients.organizationId, context.organizationId),
        eq(schema.clients.ownerId, session.id as number)
      ));
    }

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getClients Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Admin action to onboard a client brand
export async function onboardClient(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const name = formData.get("name") as string;
    const ownerIdStr = formData.get("ownerId") as string; // Client portal user ID
    const ownerId = ownerIdStr ? parseInt(ownerIdStr) : null;
    const details = (formData.get("details") as string) || "{}";

    if (!name) {
      return { success: false, error: "Client brand name is required." };
    }
    if (!ownerId || !(await isActiveOrganizationUser(context.organizationId, ownerId, ["client"]))) {
      return { success: false, error: "Select the active client portal account for this organization." };
    }
    let parsedDetails: any;
    try { parsedDetails = JSON.parse(details); } catch { return { success: false, error: "Client details are invalid." }; }
    const managerId = Number(parsedDetails?.accountManager);
    if (parsedDetails?.accountManager && (!Number.isInteger(managerId) || !(await isActiveOrganizationUser(context.organizationId, managerId, ["admin", "employee"])))) {
      return { success: false, error: "Select an active account manager from this organization." };
    }

    await db.insert(schema.clients).values({
      name: name.trim(),
      ownerId: ownerId,
      organizationId: context.organizationId,
      stage: "contract_signed",
      progress: 0,
      checklist: JSON.stringify([
        { id: 1, text: "NDA & Agreement Signed", checked: false },
        { id: 2, text: "Brand Assets Collected", checked: false },
        { id: 3, text: "Discovery Session Scheduled", checked: false },
        { id: 4, text: "Slack & Portal Setup", checked: false }
      ]),
      details: JSON.stringify(parsedDetails),
    });

    revalidateClientSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("onboardClient Error:", error);
    return { success: false, error: error.message };
  }
}

// Atomically provision a client portal identity, membership, and client record.
export async function createClientAccount(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_clients")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    const input = z.object({
      brandName: z.string().trim().min(1).max(255),
      contactName: z.string().trim().max(255).default(""),
      contactEmail: z.string().trim().max(254).default(""),
      contactPhone: z.string().trim().max(50).default(""),
      websiteUrl: z.string().trim().max(500).default(""),
      industry: z.string().trim().max(255).default(""),
      country: z.string().trim().max(255).default(""),
      services: z.string().trim().max(1000).default(""),
      loginEmail: z.string().trim().toLowerCase().email().max(254),
      loginPassword: z.string(),
      accountManager: z.string().default(""),
    }).safeParse({
      brandName: formData.get("brandName"),
      contactName: formData.get("contactName") || "",
      contactEmail: formData.get("contactEmail") || "",
      contactPhone: formData.get("contactPhone") || "",
      websiteUrl: formData.get("websiteUrl") || "",
      industry: formData.get("industry") || "",
      country: formData.get("country") || "",
      services: formData.get("services") || "",
      loginEmail: formData.get("loginEmail"),
      loginPassword: formData.get("loginPassword"),
      accountManager: formData.get("accountManager") || "",
    });
    if (!input.success) return invalidInput(input.error);
    if (!memberAccountPasswordSchema.safeParse(input.data.loginPassword).success) {
      return { success: false, error: "Password must be non-empty and no more than 128 characters." };
    }

    const managerId = input.data.accountManager ? Number(input.data.accountManager) : null;
    if (managerId && (!Number.isInteger(managerId) || !(await isActiveOrganizationUser(context.organizationId, managerId, ["admin", "employee"])))) {
      return { success: false, error: "Select an active account manager from this organization." };
    }
    const [existing] = await db.select({ id: schema.users.id }).from(schema.users)
      .where(eq(schema.users.email, input.data.loginEmail)).limit(1);
    if (existing) return { success: false, error: "An account with this email address already exists." };

    const passwordHash = await bcrypt.hash(input.data.loginPassword, 12);
    let userId = 0;
    let clientId = 0;
    await db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        name: input.data.contactName || input.data.brandName,
        email: input.data.loginEmail,
        password: passwordHash,
        role: "client",
        systemRole: "Client",
        organizationId: context.organizationId,
      });
      const [user] = await tx.select({ id: schema.users.id }).from(schema.users)
        .where(eq(schema.users.email, input.data.loginEmail)).limit(1);
      if (!user) throw new Error("Client account creation could not be confirmed.");
      userId = user.id;
      await tx.insert(schema.organizationMemberships).values({
        organizationId: context.organizationId,
        userId,
        role: "client",
        status: "active",
        invitedById: Number(session.id),
      });
      await tx.insert(schema.clients).values({
        organizationId: context.organizationId,
        name: input.data.brandName,
        ownerId: userId,
        stage: "contract_signed",
        progress: 0,
        checklist: JSON.stringify([
          { id: 1, text: "NDA & Agreement Signed", checked: false },
          { id: 2, text: "Brand Assets Collected", checked: false },
          { id: 3, text: "Discovery Session Scheduled", checked: false },
          { id: 4, text: "Portal Setup", checked: false },
        ]),
        details: JSON.stringify({
          contactName: input.data.contactName,
          contactEmail: input.data.contactEmail,
          contactPhone: input.data.contactPhone,
          websiteUrl: input.data.websiteUrl,
          industry: input.data.industry,
          country: input.data.country,
          services: input.data.services,
          loginEmail: input.data.loginEmail,
          accountManager: managerId ? String(managerId) : "",
        }),
      });
      const [client] = await tx.select({ id: schema.clients.id }).from(schema.clients)
        .where(and(eq(schema.clients.organizationId, context.organizationId), eq(schema.clients.ownerId, userId))).limit(1);
      if (!client) throw new Error("Client record creation could not be confirmed.");
      clientId = client.id;
    });

    revalidateClientSurfaces();
    return { success: true, userId, clientId };
  } catch (error: any) {
    console.error("createClientAccount Error:", error);
    return { success: false, error: error.message || "Could not create the client account." };
  }
}

// Update client onboarding pipeline stage
export async function updateClientStage(clientId: number, stage: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    const stageResult = z.enum(["contract_signed", "discovery", "integrations", "campaign_live", "terminated", "churned"])
      .safeParse(stage);
    if (!stageResult.success) return invalidInput(stageResult.error);

    await db.update(schema.clients)
      .set({ stage: stageResult.data })
      .where(and(eq(schema.clients.id, clientId), eq(schema.clients.organizationId, context.organizationId)));

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("updateClientStage Error:", error);
    return { success: false, error: error.message };
  }
}

// Update client onboarding pipeline checklist item check/uncheck state
export async function updateClientChecklist(clientId: number, checklistJson: string, progress: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    const parsedChecklist = z.array(z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string().trim().min(1).max(255),
      checked: z.boolean(),
    })).max(100).safeParse(JSON.parse(checklistJson || "[]"));
    const parsedProgress = z.number().int().min(0).max(100).safeParse(progress);
    if (!parsedChecklist.success || !parsedProgress.success) return { success: false, error: "Invalid onboarding checklist." };

    await db.update(schema.clients)
      .set({ 
        checklist: JSON.stringify(parsedChecklist.data),
        progress: parsedProgress.data
      })
      .where(and(eq(schema.clients.id, clientId), eq(schema.clients.organizationId, context.organizationId)));

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("updateClientChecklist Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin action to update client profile & details
export async function updateClient(clientId: number, formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const name     = (formData.get("name") as string)?.trim();
    const stage    = (formData.get("stage") as string) || "contract_signed";
    const accountManager = formData.get("accountManager") as string;

    if (!name) return { success: false, error: "Brand name is required." };
    if (accountManager) {
      const managerId = Number(accountManager);
      if (!Number.isInteger(managerId) || !(await isActiveOrganizationUser(context.organizationId, managerId, ["admin", "employee"]))) {
        return { success: false, error: "Select an active account manager from this organization." };
      }
    }

    const details = JSON.stringify({
      contactName:  (formData.get("contactName")  as string)?.trim() || "",
      contactEmail: (formData.get("contactEmail") as string)?.trim() || "",
      contactPhone: (formData.get("contactPhone") as string)?.trim() || "",
      websiteUrl:   (formData.get("websiteUrl")   as string)?.trim() || "",
      industry:     (formData.get("industry")     as string)?.trim() || "",
      country:      (formData.get("country")      as string)?.trim() || "",
      services:     (formData.get("services")     as string)?.trim() || "",
      accountManager: accountManager || "",
    });

    // NOTE: ownerId is NOT updated here — it must always point to the client's
    // own portal user account so the client login resolves to their data.
    await db.update(schema.clients)
      .set({ name, stage, details })
      .where(and(eq(schema.clients.id, clientId), eq(schema.clients.organizationId, context.organizationId)));

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("updateClient Error:", error);
    return { success: false, error: error.message };
  }
}

// Repair: re-link clients.ownerId to the matching portal user by loginEmail stored in details
export async function repairClientOwnerIds() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const allClients = await db.select().from(schema.clients).where(eq(schema.clients.organizationId, context.organizationId));
    const allUsers = await db.select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(eq(schema.organizationMemberships.organizationId, context.organizationId), eq(schema.organizationMemberships.status, "active")));
    const clientUsers = allUsers.filter(u => u.role === "client");

    let fixed = 0;
    for (const c of allClients) {
      let details: any = {};
      try { details = JSON.parse(c.details || "{}"); } catch {}
      const loginEmail = (details.loginEmail || "").trim().toLowerCase();
      if (!loginEmail) continue;

      const matchedUser = clientUsers.find(u => u.email === loginEmail);
      if (matchedUser && c.ownerId !== matchedUser.id) {
        await db.update(schema.clients).set({ ownerId: matchedUser.id }).where(eq(schema.clients.id, c.id));
        fixed++;
      }
    }

    revalidatePath("/admin/clients");
    return { success: true, fixed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Admin action to delete/terminate a client brand
export async function deleteClient(clientId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    await db.delete(schema.clients).where(and(eq(schema.clients.id, clientId), eq(schema.clients.organizationId, context.organizationId)));

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("deleteClient Error:", error);
    return { success: false, error: error.message };
  }
}

// Get a single client enriched with projects, invoices, and checklist
export async function getClientById(clientId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: null };
    if (!db) return { success: false, data: null };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: null, error: "No active administrator membership." };

    const [clientRows, projectList, invoiceList, userList] = await Promise.all([
      db.select().from(schema.clients).where(and(eq(schema.clients.id, clientId), eq(schema.clients.organizationId, context.organizationId))).limit(1),
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, context.organizationId)),
      db.select().from(schema.invoices).where(eq(schema.invoices.organizationId, context.organizationId)).orderBy(desc(schema.invoices.createdAt)),
      db.select(publicUserFields).from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(and(eq(schema.organizationMemberships.organizationId, context.organizationId), eq(schema.organizationMemberships.status, "active"))),
    ]);

    if (!clientRows.length) return { success: false, data: null };
    const client = clientRows[0];
    const linkedProjects = projectList.filter(p => p.clientId === client.id);
    const linkedInvoices = invoiceList.filter(i => i.clientId === client.id).map(i => ({
      ...i,
      projectName: projectList.find(p => p.id === i.projectId)?.name || null,
    }));
    const totalMRR = linkedProjects.reduce((s, p) => s + (p.monthlyFee || 0), 0);
    const unpaidCount = linkedInvoices.filter(i => i.status === "sent" || i.status === "overdue").length;
    const latestInvoice = linkedInvoices[0] || null;
    let accountManagerId: number | null = null;
    try {
      const details = JSON.parse(client.details || "{}");
      const candidate = Number(details.accountManager);
      accountManagerId = Number.isInteger(candidate) && candidate > 0 ? candidate : null;
    } catch {}
    const owner = userList.find(u => u.id === accountManagerId) || null;
    const portalUser = userList.find(u => u.id === client.ownerId) || null;

    return { success: true, data: { ...client, linkedProjects, linkedInvoices, totalMRR, unpaidCount, latestInvoice, owner, portalUser } };
  } catch (error: any) {
    console.error("getClientById Error:", error);
    return { success: false, data: null, error: error.message };
  }
}

// Find the client's PORTAL LOGIN account (a users row with role "client").
// clients.ownerId is the explicit FK to that portal identity.
export async function getClientLogin(clientId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: null };
    if (!db) return { success: false, data: null };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: null };

    const clientRows = await db.select().from(schema.clients).where(and(
      eq(schema.clients.id, clientId),
      eq(schema.clients.organizationId, context.organizationId)
    )).limit(1);
    if (!clientRows.length) return { success: false, data: null };
    const client = clientRows[0];

    const clientUsers = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.users.role, "client")
      ));

    const match = clientUsers.find(user => user.id === client.ownerId) || null;

    return {
      success: true,
      data: {
        // The login account (if found). Password is bcrypt-hashed and CANNOT be shown.
        userId: match?.id || null,
        email: match?.email || null,
        hasLogin: !!match,
        // All client-role users so the admin can manually link if auto-match fails.
        allClientUsers: clientUsers,
      },
    };
  } catch (error: any) {
    console.error("getClientLogin Error:", error);
    return { success: false, data: null };
  }
}

// Reset and explicitly link a client's portal identity. Password hashes are never returned.
export async function resetClientPassword(clientId: number, userId: number, newPassword: string, forceMatchName?: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    if (!memberAccountPasswordSchema.safeParse(newPassword).success) {
      return { success: false, error: "Password must be non-empty and no more than 128 characters." };
    }

    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    const [client] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(
      eq(schema.clients.id, clientId),
      eq(schema.clients.organizationId, context.organizationId)
    )).limit(1);
    if (!client) return { success: false, error: "Client not found." };

    const u = await db.select({ id: schema.users.id, role: schema.users.role })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.userId, userId),
        eq(schema.organizationMemberships.status, "active")
      )).limit(1);
    if (!u.length) return { success: false, error: "Account not found." };
    if (u[0].role !== "client") return { success: false, error: "Can only reset client accounts here." };

    const hashed = await bcrypt.hash(newPassword, 10);
    const updateData: any = { password: hashed };
    if (forceMatchName) {
      updateData.name = forceMatchName;
    }
    
    await db.transaction(async (tx) => {
      await tx.update(schema.users).set(updateData).where(eq(schema.users.id, userId));
      await tx.update(schema.clients).set({ ownerId: userId }).where(and(
        eq(schema.clients.id, clientId),
        eq(schema.clients.organizationId, context.organizationId)
      ));
    });
    revalidateClientSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("resetClientPassword Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * PROJECT ACTIONS
 * ----------------------------------------------------
 */

// Get projects
export async function getProjects() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active organization membership." };

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.projects)
        .where(eq(schema.projects.organizationId, context.organizationId));
    } else if (session.role === "employee") {
      // An employee sees a project if: they are leadId, in teamMemberIds, or have a task on it
      const uid = session.id as number;
      const taskRows = await db
        .select({ projectId: schema.tasks.projectId })
        .from(schema.tasks)
        .where(eq(schema.tasks.userId, uid));
      const taskProjectIds = Array.from(
        new Set(taskRows.map(t => t.projectId).filter((x): x is number => x != null))
      );

      const allProjects = await db.select().from(schema.projects)
        .where(eq(schema.projects.organizationId, context.organizationId));
      results = allProjects.filter(p => {
        if (p.leadId === uid) return true;
        if (taskProjectIds.includes(p.id)) return true;
        try {
          const members: number[] = JSON.parse(p.teamMemberIds || "[]");
          return members.includes(uid);
        } catch { return false; }
      });
    } else {
      // Clients see projects mapped to their client account
      const clientProfile = await db.select().from(schema.clients).where(and(
        eq(schema.clients.organizationId, context.organizationId),
        eq(schema.clients.ownerId, session.id as number)
      )).limit(1);
      if (clientProfile.length > 0) {
        results = await db.select({
          id: schema.projects.id,
          name: schema.projects.name,
          projectType: schema.projects.projectType,
          budget: schema.projects.budget,
          startDate: schema.projects.startDate,
          deadline: schema.projects.deadline,
          status: schema.projects.status,
          priority: schema.projects.priority,
          createdAt: schema.projects.createdAt,
        }).from(schema.projects).where(and(
          eq(schema.projects.organizationId, context.organizationId),
          eq(schema.projects.clientId, clientProfile[0].id)
        ));
      } else {
        results = [];
      }
    }

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getProjects Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Admin action to create a new project engagement
export async function createProject(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_projects")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    const name = formData.get("name") as string;
    const clientIdStr = formData.get("clientId") as string;
    const leadIdStr = formData.get("leadId") as string;
    const projectType = (formData.get("projectType") as string) || "other";
    const clientName = formData.get("clientName") as string;
    const startDate = formData.get("startDate") as string;
    const deadline = (formData.get("deadline") as string) || "";
    const status = (formData.get("status") as string) || "planning";
    const priority = (formData.get("priority") as string) || "medium";
    const billingModel = (formData.get("billingModel") as string) || "fixed_fee";
    const budget = parseInt((formData.get("budget") as string) || "0");
    const monthlyFee = parseInt((formData.get("monthlyFee") as string) || "0");
    const adSpendBudget = parseInt((formData.get("adSpendBudget") as string) || "0");
    const serviceDetails = (formData.get("serviceDetails") as string) || "{}";
    // Phase 1 CRM operational fields
    const billingCycleStart = formData.get("billingCycleStart") as string;
    const contractDuration = parseInt((formData.get("contractDuration") as string) || "0");
    const clientContactName = formData.get("clientContactName") as string;
    const clientContactPhone = formData.get("clientContactPhone") as string;
    const accessGranted = (formData.get("accessGranted") as string) === "true" ? 1 : 0;
    const contractLink = formData.get("contractLink") as string;
    const teamMemberIds = safeJsonArrayOfIds(formData.get("teamMemberIds"));

    if (!name) return { success: false, error: "Project name is required." };

    const clientId = clientIdStr && clientIdStr !== "__agency__" ? Number(clientIdStr) : null;
    const leadId = leadIdStr ? Number(leadIdStr) : null;
    let resolvedClientName: string | null = null;
    if (clientId) {
      const [client] = await db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(and(
        eq(schema.clients.id, clientId),
        eq(schema.clients.organizationId, context.organizationId)
      )).limit(1);
      if (!client) return { success: false, error: "Select a client from this organization." };
      resolvedClientName = client.name;
    }
    if (leadId && !(await isActiveOrganizationUser(context.organizationId, leadId, ["admin", "employee"]))) {
      return { success: false, error: "Select an active project lead from this organization." };
    }
    const teamIds = JSON.parse(teamMemberIds) as number[];
    for (const teamId of teamIds) {
      if (!(await isActiveOrganizationUser(context.organizationId, teamId, ["admin", "employee"]))) {
        return { success: false, error: "Every project member must be an active teammate in this organization." };
      }
    }

    await db.insert(schema.projects).values({
      name: name.trim(),
      clientId,
      organizationId: context.organizationId,
      clientName: resolvedClientName || clientName?.trim() || null,
      projectType,
      budget,
      monthlyFee,
      adSpendBudget,
      startDate: startDate?.trim() || null,
      deadline,
      status,
      priority,
      billingModel,
      serviceDetails,
      billingCycleStart: billingCycleStart?.trim() || null,
      contractDuration: contractDuration || 0,
      clientContactName: clientContactName?.trim() || null,
      clientContactPhone: clientContactPhone?.trim() || null,
      accessGranted,
      contractLink: contractLink?.trim() || null,
      leadId,
      teamMemberIds,
    });

    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("createProject Error:", error);
    return { success: false, error: error.message };
  }
}

// Update project status stage
export async function updateProjectStatus(projectId: number, status: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };
    const statusResult = projectStatuses.safeParse(status);
    if (!statusResult.success) return invalidInput(statusResult.error);
    if (!(await canAccessProject(session, projectId)) || session.role === "client") {
      return { success: false, error: "Forbidden." };
    }
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    await db.update(schema.projects)
      .set({ status: statusResult.data })
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.organizationId, context.organizationId)));

    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("updateProjectStatus Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin delete/archive a project
export async function deleteProject(projectId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    await db.delete(schema.projects).where(and(
      eq(schema.projects.id, projectId),
      eq(schema.projects.organizationId, context.organizationId)
    ));

    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("deleteProject Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * TIMESHEET ACTIONS
 * ----------------------------------------------------
 */

// Get timesheets
export async function getTimesheets() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.timesheets);
    } else {
      // Employees see their own logged timesheets
      results = await db.select().from(schema.timesheets).where(eq(schema.timesheets.userId, session.id as number));
    }

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getTimesheets Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Log time entries (Employees & Admins)
export async function logTimesheet(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };

    const projectIdStr = formData.get("projectId") as string;
    const description = formData.get("description") as string;
    const durationMinutesStr = formData.get("durationMinutes") as string;
    const date = formData.get("date") as string; // 'YYYY-MM-DD'

    if (!description || !durationMinutesStr || !date) {
      return { success: false, error: "Description, duration, and date are required." };
    }

    await db.insert(schema.timesheets).values({
      userId: session.id as number,
      projectId: projectIdStr ? parseInt(projectIdStr) : null,
      description: description.trim(),
      durationMinutes: parseInt(durationMinutesStr),
      date: date.trim(),
      status: "pending",
    });

    revalidatePath("/employee");
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (error: any) {
    console.error("logTimesheet Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin approve or reject a contractor timesheet entry
export async function updateTimesheetStatus(timesheetId: number, status: "approved" | "rejected") {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.timesheets)
      .set({ status })
      .where(eq(schema.timesheets.id, timesheetId));

    const ts = await db.select().from(schema.timesheets).where(eq(schema.timesheets.id, timesheetId)).limit(1);
    if (ts.length > 0) {
      await createNotification(ts[0].userId, "timesheet_" + status,
        status === "approved" ? "Hours Approved" : "Timesheet Returned",
        status === "approved"
          ? `Your entry for "${ts[0].description}" has been approved.`
          : `Your timesheet for "${ts[0].description}" was returned — check the finance page for details.`,
        "/employee/finance");
    }

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance");
    return { success: true };
  } catch (error: any) {
    console.error("updateTimesheetStatus Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * EXPENSE ACTIONS
 * ----------------------------------------------------
 */

// Get expense claims
export async function getExpenses() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.expenses);
    } else {
      results = await db.select().from(schema.expenses).where(eq(schema.expenses.userId, session.id as number));
    }

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getExpenses Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Log a contractor expense claim
export async function claimExpense(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };

    const category = formData.get("category") as string;
    const amountStr = formData.get("amount") as string;
    const description = formData.get("description") as string;

    if (!category || !amountStr || !description) {
      return { success: false, error: "Category, amount, and description are required." };
    }

    await db.insert(schema.expenses).values({
      userId: session.id as number,
      category: category.trim(),
      amount: parseInt(amountStr),
      description: description.trim(),
      status: "pending",
    });

    revalidatePath("/employee/finance");
    revalidatePath("/admin/finance");
    await notifyAdmins(Number(session.id), "expense_claim", "New Expense Claim", `${session.name || session.email} — ₹${amountStr} for ${description}`, "/admin/finance");
    return { success: true };
  } catch (error: any) {
    console.error("claimExpense Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin approve/reject expense claims
export async function updateExpenseStatus(expenseId: number, status: "approved" | "rejected") {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_expenses")) {
      return { success: false, error: "Permission denied." };
    }
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    const expense = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId)).limit(1);
    if (expense.length === 0) return { success: false, error: "Expense not found." };
    if (!(await isActiveOrganizationUser(context.organizationId, expense[0].userId, ["admin", "employee"]))) {
      return { success: false, error: "Expense not found." };
    }

    await db.update(schema.expenses)
      .set({ status })
      .where(eq(schema.expenses.id, expenseId));

    if (expense.length > 0) {
      await createNotification(expense[0].userId, "expense_" + status,
        status === "approved" ? "Expense Approved" : "Expense Returned",
        status === "approved"
          ? `₹${expense[0].amount} for "${expense[0].description}" — approved and will be processed.`
          : `Your ₹${expense[0].amount} claim for "${expense[0].description}" was returned. Check the finance page for details.`,
        "/employee/finance");
    }

    revalidatePath("/admin/finance");
    revalidatePath("/employee/finance");
    return { success: true };
  } catch (error: any) {
    console.error("updateExpenseStatus Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * ATTENDANCE ACTIONS
 * ----------------------------------------------------
 */

// Get attendance logs
export async function getAttendance() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active organization membership." };
    const results = session.role === "admin"
      ? await db.select({ attendance: schema.attendance }).from(schema.attendance)
          .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.userId, schema.attendance.userId))
          .where(and(
            eq(schema.organizationMemberships.organizationId, context.organizationId),
            eq(schema.organizationMemberships.status, "active")
          )).then(rows => rows.map(row => row.attendance))
      : await db.select().from(schema.attendance).where(eq(schema.attendance.userId, Number(session.id)));
    return { success: true, data: results };
  } catch (error: any) {
    console.error("getAttendance Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Log individual attendance checkin
export async function logAttendance(date: string, status: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    // Check if entry already exists for user on this date
    const existing = await db.select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.userId, session.id as number),
        eq(schema.attendance.date, date)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.attendance)
        .set({ status })
        .where(eq(schema.attendance.id, existing[0].id));
    } else {
      await db.insert(schema.attendance).values({
        userId: session.id as number,
        date: date,
        status: status,
      });
    }

    revalidatePath("/admin/team");
    return { success: true };
  } catch (error: any) {
    console.error("logAttendance Error:", error);
    return { success: false, error: error.message };
  }
}

// Bulk update attendance log (Admin calendar checkin grid overrides)
export async function bulkUpdateAttendance(userId: number, date: string, status: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context || !(await isActiveOrganizationUser(context.organizationId, userId, ["admin", "employee"]))) {
      return { success: false, error: "Team member not found in this organization." };
    }

    const existing = await db.select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.userId, userId),
        eq(schema.attendance.date, date)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.attendance)
        .set({ status })
        .where(eq(schema.attendance.id, existing[0].id));
    } else {
      await db.insert(schema.attendance).values({
        userId,
        date,
        status,
      });
    }

    revalidatePath("/admin/team");
    revalidatePath("/employee/attendance");
    revalidatePath("/employee");
    return { success: true };
  } catch (error: any) {
    console.error("bulkUpdateAttendance Error:", error);
    return { success: false, error: error.message };
  }
}

// Get today's attendance status for logged-in user
export async function getTodayAttendance() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    const todayStr = todayInOrgTimezone(context.timezone); // YYYY-MM-DD in org local time
    const record = await db.select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.userId, session.id as number),
        eq(schema.attendance.date, todayStr)
      ))
      .limit(1);

    if (record.length > 0) {
      return { success: true, data: record[0] };
    }
    return { success: true, data: null };
  } catch (error: any) {
    console.error("getTodayAttendance Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * NOTIFICATION ACTIONS
 * ----------------------------------------------------
 */

// Internal: create a notification for a specific user
async function createNotification(userId: number, type: string, title: string, message: string, link?: string) {
  if (!db) return;
  try {
    await db.insert(schema.notifications).values({
      userId,
      type,
      title,
      message,
      link: link || null,
      read: 0,
    });

    // Send FCM Push Notification asynchronously in the background so it doesn't block the server action
    db.select({ token: schema.fcmTokens.token })
      .from(schema.fcmTokens)
      .where(eq(schema.fcmTokens.userId, userId))
      .then((tokens) =>
        Promise.allSettled(
          tokens.map((token) =>
            sendFcmMessage({
              token: token.token,
              title,
              body: message,
              link: link || "/",
            })
          )
        )
      )
      .catch((pushError) => {
        console.error("FCM notification error:", pushError);
      });
  } catch (e) {
    console.error("createNotification error:", e);
  }
}

// Internal: notify all admin users
async function notifyAdmins(actorUserId: number, type: string, title: string, message: string, link?: string) {
  if (!db) return;
  try {
    const [actorMembership] = await db.select({ organizationId: schema.organizationMemberships.organizationId })
      .from(schema.organizationMemberships)
      .where(and(
        eq(schema.organizationMemberships.userId, actorUserId),
        eq(schema.organizationMemberships.status, "active")
      ))
      .orderBy(asc(schema.organizationMemberships.id))
      .limit(1);
    if (!actorMembership) return;
    const admins = await db.select({ id: schema.users.id })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, actorMembership.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.users.role, "admin")
      ));
    for (const admin of admins) {
      await createNotification(admin.id, type, title, message, link);
    }
  } catch (e) {
    console.error("notifyAdmins error:", e);
  }
}

// Get logged-in user's notifications (most recent first)
export async function getMyNotifications() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    const results = await db.select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, session.id as number))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getMyNotifications Error:", error);
    return { success: false, data: [] };
  }
}

// Mark all notifications as read for current user
export async function markAllNotificationsRead() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false };
    if (!db) return { success: false };

    await db.update(schema.notifications)
      .set({ read: 1 })
      .where(eq(schema.notifications.userId, session.id as number));

    return { success: true };
  } catch (error: any) {
    console.error("markAllNotificationsRead Error:", error);
    return { success: false };
  }
}

// Mark one notification as read, scoped to the signed-in user.
export async function markNotificationRead(notificationId: number) {
  try {
    const session = await getAuthSession();
    if (!session || !db || !Number.isSafeInteger(notificationId) || notificationId <= 0) {
      return { success: false };
    }

    await db.update(schema.notifications)
      .set({ read: 1 })
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, session.id as number)
      ));

    return { success: true };
  } catch (error: any) {
    console.error("markNotificationRead Error:", error);
    return { success: false };
  }
}

// Dismiss (delete) a specific notification
export async function dismissNotification(notificationId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false };
    if (!db) return { success: false };

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) return { success: false };

    await db.delete(schema.notifications)
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, session.id as number)
      ));

    return { success: true };
  } catch (error: any) {
    console.error("dismissNotification Error:", error);
    return { success: false };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, count: 0 };
    if (!db) return { success: false, count: 0 };

    const results = await db.select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, session.id as number),
        eq(schema.notifications.read, 0)
      ));

    return { success: true, count: results.length };
  } catch (error: any) {
    console.error("getUnreadNotificationCount Error:", error);
    return { success: false, count: 0 };
  }
}

// Punch In
export async function punchIn(lat?: number, lng?: number, bssid?: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    // Geofence + office Wi-Fi gate — coordinates are required.
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { success: false, error: "Location required. Enable GPS and retry." };
    }
    const geo = await validateGeofence(context.organizationId, lat, lng, bssid);
    if (!geo.ok) return { success: false, error: geo.message, code: geo.code };

    const todayStr = todayInOrgTimezone(context.timezone); // YYYY-MM-DD in org local time

    const existing = await db.select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.userId, session.id as number),
        eq(schema.attendance.date, todayStr)
      ))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].punchInTime) {
        return { success: false, error: "Already punched in today" };
      }
      await db.update(schema.attendance)
        .set({
          punchInTime: new Date(),
          status: "present"
        })
        .where(eq(schema.attendance.id, existing[0].id));
    } else {
      await db.insert(schema.attendance).values({
        userId: session.id as number,
        date: todayStr,
        punchInTime: new Date(),
        status: "present"
      });
    }

    // Audit log for the geofenced punch
    if (geo.locationId) {
      try {
        await db.insert(schema.attendanceLogs).values({
          userId: session.id as number,
          locationId: geo.locationId,
          punchType: "IN",
          verifiedIp: geo.verifiedIp || "unknown",
        });
      } catch (e) { console.error("attendanceLogs IN insert error:", e); }
    }

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    // Run notifyAdmins and logActivity in background so they don't block the critical path
    notifyAdmins(Number(session.id), "punch_in", "Team Check-in", `${session.name || session.email} is in for the day`, "/admin/team").catch(err => {
      console.error("punchIn notifyAdmins async error:", err);
    });
    logActivity(session.id as number, "punch_in", `${session.name || session.email} punched in`).catch(err => {
      console.error("punchIn logActivity async error:", err);
    });
    return { success: true };
  } catch (error: any) {
    console.error("punchIn Error:", error);
    return { success: false, error: error.message };
  }
}

// Punch Out
export async function punchOut(lat?: number, lng?: number, bssid?: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    // Geofence + office Wi-Fi gate — coordinates are required.
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { success: false, error: "Location required. Enable GPS and retry." };
    }
    const geo = await validateGeofence(context.organizationId, lat, lng, bssid);
    if (!geo.ok) return { success: false, error: geo.message, code: geo.code };

    const todayStr = todayInOrgTimezone(context.timezone);

    const existing = await db.select()
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.userId, session.id as number),
        eq(schema.attendance.date, todayStr)
      ))
      .limit(1);

    if (existing.length === 0 || !existing[0].punchInTime) {
      return { success: false, error: "You must punch in first before punching out" };
    }

    if (existing[0].punchOutTime) {
      return { success: false, error: "Already punched out today" };
    }

    const punchInDate = new Date(existing[0].punchInTime);
    const punchOutDate = new Date();
    const durationMs = punchOutDate.getTime() - punchInDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // If check-in to check-out duration is less than 7 hours, it is automatically marked as half-day!
    const finalStatus = durationHours < 7 ? "half-day" : "present";

    await db.update(schema.attendance)
      .set({
        punchOutTime: punchOutDate,
        status: finalStatus
      })
      .where(eq(schema.attendance.id, existing[0].id));

    // Audit log for the geofenced punch
    if (geo.locationId) {
      try {
        await db.insert(schema.attendanceLogs).values({
          userId: session.id as number,
          locationId: geo.locationId,
          punchType: "OUT",
          verifiedIp: geo.verifiedIp || "unknown",
        });
      } catch (e) { console.error("attendanceLogs OUT insert error:", e); }
    }

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    // Run notifyAdmins and logActivity in background so they don't block the critical path
    notifyAdmins(Number(session.id), "punch_out", "Team Check-out", `${session.name || session.email} has wrapped up for the day`, "/admin/team").catch(err => {
      console.error("punchOut notifyAdmins async error:", err);
    });
    logActivity(session.id as number, "punch_out", `${session.name || session.email} punched out`).catch(err => {
      console.error("punchOut logActivity async error:", err);
    });
    return { success: true };
  } catch (error: any) {
    console.error("punchOut Error:", error);
    return { success: false, error: error.message };
  }
}

// Submit a leave request
export async function requestLeave(leaveType: string, startDate: string, endDate: string, reason: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

    await db.insert(schema.leaves).values({
      userId: session.id as number,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "pending"
    });

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await notifyAdmins(Number(session.id), "leave_request", "Leave Request", `${session.name || session.email} needs ${leaveType} leave — ${startDate} to ${endDate}`, "/admin/team");
    await logActivity(session.id as number, "leave_requested", `${session.name || session.email} requested ${leaveType} leave`);
    return { success: true };
  } catch (error: any) {
    console.error("requestLeave Error:", error);
    return { success: false, error: error.message };
  }
}

// Get logged-in user's leaves
export async function getMyLeaves() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [], error: "Database not connected" };

    const results = await db.select()
      .from(schema.leaves)
      .where(eq(schema.leaves.userId, session.id as number));

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getMyLeaves Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Get logged-in user's attendance records
export async function getMyAttendance() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [], error: "Database not connected" };

    const results = await db.select()
      .from(schema.attendance)
      .where(eq(schema.attendance.userId, session.id as number));

    return { success: true, data: results };
  } catch (error: any) {
    console.error("getMyAttendance Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Get all pending leaves for admin
export async function getPendingLeaves() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, data: [] };
    }
    if (!db) return { success: false, data: [], error: "Database not connected" };

    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active administrator membership." };
    const results = await db.select({ leave: schema.leaves })
      .from(schema.leaves)
      .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.userId, schema.leaves.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.leaves.status, "pending")
      )).then(rows => rows.map(row => row.leave));

    const usersListResult = await getTeamUsers();
    const usersList = usersListResult.data || [];
    const enriched = results.map(leave => {
      const u = usersList.find(usr => usr.id === leave.userId);
      return {
        ...leave,
        employeeName: u ? u.name : "Unknown Employee",
        employeeEmail: u ? u.email : ""
      };
    });

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getPendingLeaves Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Admin approve leave
export async function approveLeave(leaveId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }
    if (!db) return { success: false, error: "Database not connected" };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const leave = await db.select({ leave: schema.leaves })
      .from(schema.leaves)
      .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.userId, schema.leaves.userId))
      .where(and(
        eq(schema.leaves.id, leaveId),
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active")
      ))
      .limit(1);

    if (leave.length === 0) {
      return { success: false, error: "Leave request not found" };
    }

    // Update status to approved
    await db.update(schema.leaves)
      .set({ status: "approved" })
      .where(eq(schema.leaves.id, leaveId));

    // Populate attendance table for all dates in the range!
    const leaveRecord = leave[0].leave;
    const start = new Date(leaveRecord.startDate);
    const end = new Date(leaveRecord.endDate);
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toLocaleDateString("en-CA"));
    }

    const leaveStatusMap: Record<string, string> = {
      sick: "sick",
      vacation: "vacation",
      casual: "on-leave",
      other: "on-leave",
    };
    const rawType = leaveRecord.leaveType;
    const attStatus = Object.hasOwn(leaveStatusMap, rawType) ? leaveStatusMap[rawType] : "on-leave";

    for (const dt of dates) {
      const existing = await db.select()
        .from(schema.attendance)
        .where(and(
          eq(schema.attendance.userId, leaveRecord.userId),
          eq(schema.attendance.date, dt)
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.attendance)
          .set({ status: attStatus })
          .where(eq(schema.attendance.id, existing[0].id));
      } else {
        await db.insert(schema.attendance).values({
          userId: leaveRecord.userId,
          date: dt,
          status: attStatus
        });
      }
    }

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await createNotification(leaveRecord.userId, "leave_approved", "Leave Approved", `Your ${leaveRecord.leaveType} leave from ${leaveRecord.startDate} to ${leaveRecord.endDate} is confirmed. Enjoy your time off!`, "/employee/attendance");
    await logActivity(session.id as number, "leave_approved", `Approved ${leaveRecord.leaveType} leave for user #${leaveRecord.userId}`, "leave", leaveId);
    return { success: true };
  } catch (error: any) {
    console.error("approveLeave Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin reject leave
export async function rejectLeave(leaveId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }
    if (!db) return { success: false, error: "Database not connected" };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const leaveRows = await db.select({ leave: schema.leaves })
      .from(schema.leaves)
      .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.userId, schema.leaves.userId))
      .where(and(
        eq(schema.leaves.id, leaveId),
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active")
      ))
      .limit(1);
    if (!leaveRows.length) return { success: false, error: "Leave request not found" };
    const leave = leaveRows[0].leave;

    await db.update(schema.leaves)
      .set({ status: "rejected" })
      .where(eq(schema.leaves.id, leaveId));

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await createNotification(leave.userId, "leave_rejected", "Leave Not Approved", `Your ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate} couldn't be approved this time. Reach out to your manager for details.`, "/employee/attendance");
    await logActivity(session.id as number, "leave_rejected", `Rejected ${leave.leaveType} leave for user #${leave.userId}`, "leave", leaveId);
    return { success: true };
  } catch (error: any) {
    console.error("rejectLeave Error:", error);
    return { success: false, error: error.message };
  }
}

// Fetch helper for listing all team users (Admins & Employees)
export async function getTeamUsers() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };

    if (!db) return { success: false, data: [] };

    if (session.role === "client") return { success: false, data: [], error: "Forbidden." };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active organization membership." };
    const usersList = await db
      .select(publicUserFields)
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        inArray(schema.users.role, ["admin", "employee"])
      ))
      .orderBy(asc(schema.users.name));
    return { success: true, data: usersList };
  } catch (error: any) {
    console.error("getTeamUsers Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function getTeamPresence() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) {
      return { success: false, data: [], error: "Unauthorized." };
    }
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active administrator membership." };

    const teamUsers = await db
      .select({ id: schema.users.id })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        inArray(schema.users.role, ["admin", "employee"])
      ));

    const userIds = teamUsers.map(u => u.id);
    if (userIds.length === 0) return { success: true, data: [] };

    const activeSessions = await db
      .select({ userId: schema.userSessions.userId })
      .from(schema.userSessions)
      .where(and(
        eq(schema.userSessions.organizationId, context.organizationId),
        inArray(schema.userSessions.userId, userIds),
        isNull(schema.userSessions.revokedAt),
        gt(schema.userSessions.expiresAt, new Date())
      ));

    const activeSessionUserIds = new Set(activeSessions.map(s => s.userId));

    const todayStr = new Date().toLocaleDateString("en-CA");
    const todayAttendance = await db
      .select({
        userId: schema.attendance.userId,
        punchInTime: schema.attendance.punchInTime,
        punchOutTime: schema.attendance.punchOutTime,
      })
      .from(schema.attendance)
      .where(and(
        eq(schema.attendance.date, todayStr),
        inArray(schema.attendance.userId, userIds)
      ));

    const punchedInUserIds = new Set(
      todayAttendance
        .filter(a => a.punchInTime && !a.punchOutTime)
        .map(a => a.userId)
    );

    const presenceData = userIds.map(userId => ({
      userId,
      sessionActive: activeSessionUserIds.has(userId),
      punchedIn: punchedInUserIds.has(userId),
    }));

    return { success: true, data: presenceData };
  } catch (error: any) {
    console.error("getTeamPresence Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Admin action to delete a user/employee
export async function deleteUser(userId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    if (Number(session.id) === userId) return { success: false, error: "You cannot delete your own account." };
    const [target] = await db.select({ role: schema.users.role }).from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.userId, userId),
        eq(schema.organizationMemberships.status, "active")
      )).limit(1);
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "admin") {
      const admins = await db.select({ id: schema.users.id }).from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(and(
          eq(schema.organizationMemberships.organizationId, context.organizationId),
          eq(schema.organizationMemberships.status, "active"),
          eq(schema.users.role, "admin")
        ));
      if (admins.length <= 1) return { success: false, error: "The last administrator cannot be deleted." };
    }

    const memberships = await db.select({ id: schema.organizationMemberships.id })
      .from(schema.organizationMemberships)
      .where(eq(schema.organizationMemberships.userId, userId));
    if (memberships.length > 1) {
      return { success: false, error: "This person belongs to another organization and cannot be deleted here." };
    }

    await db.delete(schema.users).where(eq(schema.users.id, userId));

    revalidatePath("/admin/team");
    return { success: true };
  } catch (error: any) {
    console.error("deleteUser Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin action to update a user's system role and auth role
export async function updateUserRole(userId: number, role: "admin" | "employee" | "client", systemRole?: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    if (!(await isActiveOrganizationUser(context.organizationId, userId))) {
      return { success: false, error: "Team member not found in this organization." };
    }
    if (Number(session.id) === userId && role !== "admin") {
      return { success: false, error: "You cannot remove your own administrator access." };
    }

    const updateData: any = { role };
    if (systemRole) {
      updateData.systemRole = systemRole;
    }

    await db.transaction(async (tx) => {
      await tx.update(schema.users).set(updateData).where(eq(schema.users.id, userId));
      await tx.update(schema.organizationMemberships)
        .set({ role: role === "admin" ? "admin" : role === "client" ? "client" : "member" })
        .where(and(
          eq(schema.organizationMemberships.organizationId, context.organizationId),
          eq(schema.organizationMemberships.userId, userId)
        ));
    });

    revalidatePath("/admin/team");
    return { success: true };
  } catch (error: any) {
    console.error("updateUserRole Error:", error);
    return { success: false, error: error.message };
  }
}

// Admin action to update a user's shift schedule
export async function updateUserShiftSchedule(
  userId: number,
  workingDays: string,
  shiftStartTime: string,
  shiftEndTime: string,
  activeShiftProfile: string
) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context || !(await isActiveOrganizationUser(context.organizationId, userId, ["admin", "employee"]))) {
      return { success: false, error: "Team member not found in this organization." };
    }

    await db.update(schema.users)
      .set({
        workingDays,
        shiftStartTime,
        shiftEndTime,
        activeShiftProfile,
      })
      .where(eq(schema.users.id, userId));

    revalidatePath("/admin/team");
    return { success: true };
  } catch (error: any) {
    console.error("updateUserShiftSchedule Error:", error);
    return { success: false, error: error.message };
  }
}

// Retrieve fresh profile fields directly from the database for the active user
export async function getFreshUserProfile() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };

    const userList = await db.select(publicUserFields).from(schema.users).where(eq(schema.users.id, session.id as number)).limit(1);
    if (userList.length === 0) {
      return { success: false, error: "User profile not found in database." };
    }

    return { success: true, data: userList[0] };
  } catch (error: any) {
    console.error("getFreshUserProfile Error:", error);
    return { success: false, error: error.message };
  }
}

// Retrieve tasks for a specific user
export async function getUserTasks(userId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    if (session.role !== "admin" && Number(session.id) !== userId) return { success: false, data: [] };
    const context = await getOrganizationContext(session);
    if (!context || !(await isActiveOrganizationUser(context.organizationId, userId, ["admin", "employee"]))) {
      return { success: false, data: [], error: "Team member not found in this organization." };
    }

    const results = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, userId));
    return { success: true, data: results };
  } catch (error: any) {
    console.error("getUserTasks Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// -------------------------------------------------------
// COMBINED PAGE-DATA ACTIONS — one round-trip per page
// -------------------------------------------------------

// Admin Overview page: fetches KPIs and active projects for dashboard
export async function getAdminDashboardData() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: null };
    if (!db) return { success: false, data: null };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: null, error: "No active administrator membership." };

    const activeStatusesExcluded = ["completed", "cancelled", "archived"];
    const invoiceCutoff = new Date();
    invoiceCutoff.setDate(1);
    invoiceCutoff.setHours(0, 0, 0, 0);
    invoiceCutoff.setMonth(invoiceCutoff.getMonth() - 5);
    const invoiceMonth = sql<string>`DATE_FORMAT(${schema.invoices.createdAt}, '%Y-%m')`;

    const [clientCountRows, projectTotalsRows, recentProjects, invoiceTotals, projectTypeTotals, adSpendRows, taskProgressRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(schema.clients)
        .where(and(eq(schema.clients.organizationId, context.organizationId), sql`${schema.clients.stage} <> 'terminated'`)),
      db.select({
        activeWebsites: sql<number>`coalesce(sum(case when ${schema.projects.projectType} = 'web_dev' then 1 else 0 end), 0)`,
      })
        .from(schema.projects)
        .where(and(eq(schema.projects.organizationId, context.organizationId), notInArray(schema.projects.status, activeStatusesExcluded))),
      db.select({
        id: schema.projects.id,
        name: schema.projects.name,
        clientName: schema.clients.name,
        fallbackClientName: schema.projects.clientName,
        projectType: schema.projects.projectType,
        leadName: schema.users.name,
        deadline: schema.projects.deadline,
        status: schema.projects.status,
      })
        .from(schema.projects)
        .leftJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
        .leftJoin(schema.users, eq(schema.users.id, schema.projects.leadId))
        .where(and(eq(schema.projects.organizationId, context.organizationId), notInArray(schema.projects.status, activeStatusesExcluded)))
        .orderBy(desc(schema.projects.createdAt))
        .limit(5),
      db.select({
        month: invoiceMonth,
        revenue: sql<number>`coalesce(sum(${schema.invoices.amount}), 0)`,
      })
        .from(schema.invoices)
        .where(and(
          gte(schema.invoices.createdAt, invoiceCutoff),
          eq(schema.invoices.organizationId, context.organizationId),
          eq(schema.invoices.status, "paid"),
        ))
        .groupBy(invoiceMonth),
      db.select({
        projectType: schema.projects.projectType,
        count: sql<number>`count(*)`,
      })
        .from(schema.projects)
        .where(and(eq(schema.projects.organizationId, context.organizationId), notInArray(schema.projects.status, ["cancelled", "archived"])))
        .groupBy(schema.projects.projectType),
      db.select({ total: sql<number>`coalesce(sum(${schema.metaCampaigns.spend}), 0)` })
        .from(schema.metaCampaigns)
        .innerJoin(schema.projects, eq(schema.projects.id, schema.metaCampaigns.projectId))
        .where(eq(schema.projects.organizationId, context.organizationId)),
      db.select({
        projectId: schema.tasks.projectId,
        total: sql<number>`count(*)`,
        done: sql<number>`sum(case when ${schema.tasks.done} = 1 then 1 else 0 end)`,
      })
        .from(schema.tasks)
        .innerJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
        .where(eq(schema.projects.organizationId, context.organizationId))
        .groupBy(schema.tasks.projectId),
    ]);

    const activeClientsCount = Number(clientCountRows[0]?.count || 0);
    const totalAdSpend = Number(adSpendRows[0]?.total || 0);
    const activeWebsites = Number(projectTotalsRows[0]?.activeWebsites || 0);
    const formattedProjects = recentProjects.map(p => ({
      id: p.id,
      name: p.name,
      client: p.clientName || p.fallbackClientName || "Unknown Client",
      type: p.projectType.replace("_", " "),
      team: p.leadName ? [{ name: p.leadName }] : [],
      progress: (() => {
        const taskProgress = taskProgressRows.find(row => row.projectId === p.id);
        const total = Number(taskProgress?.total || 0);
        return total > 0 ? Math.round((Number(taskProgress?.done || 0) / total) * 100) : null;
      })(),
      deadline: p.deadline || "N/A",
      status: p.status,
    }));

    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleString('en-US', { month: 'short' }),
        revenue: 0,
        spend: 0
      };
    });
    const revenueByMonth = new Map(invoiceTotals.map(row => [row.month, Number(row.revenue || 0)]));
    last6Months.forEach(month => { month.revenue = revenueByMonth.get(month.key) || 0; });
    const monthlyRevenue = last6Months[5].revenue;

    // Project Distribution (Pie Chart) replacing "Traffic Channels"
    const typeCount: Record<string, number> = {};
    projectTypeTotals.forEach(row => {
      const typeName = row.projectType === 'web_dev' ? 'Web Dev' : row.projectType === 'meta_ads' ? 'Meta Ads' : 'Other';
      typeCount[typeName] = (typeCount[typeName] || 0) + Number(row.count || 0);
    });
    const totalProjects = Object.values(typeCount).reduce((sum, count) => sum + count, 0);

    const channelData = Object.entries(typeCount).map(([name, count]) => ({
      name,
      value: totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    return {
      success: true,
      data: {
        activeClientsCount,
        monthlyRevenue,
        totalAdSpend,
        activeWebsites,
        recentProjects: formattedProjects,
        revenueData: last6Months.map(m => ({ month: m.month, revenue: m.revenue, spend: m.spend })),
        channelData
      }
    };
  } catch (error: any) {
    console.error("getAdminDashboardData Error:", error);
    return { success: false, data: null, error: error.message };
  }
}

// Overview page: replaces 4-5 separate server action calls
export async function getOverviewPageData() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null };
    if (!db) return { success: false, data: null };

    const userId = session.id as number;
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: null };

    const [userRows, allProjects, taskRows, timesheetsRaw, attendance, tasks] = await Promise.all([
      db.select(publicUserFields).from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, context.organizationId)),
      db.select({ projectId: schema.tasks.projectId }).from(schema.tasks).where(eq(schema.tasks.userId, userId)).catch(() => [] as { projectId: number | null }[]),
      db.select().from(schema.timesheets).where(eq(schema.timesheets.userId, userId)).catch(() => []),
      db.select().from(schema.attendance).where(eq(schema.attendance.userId, userId)),
      db.select().from(schema.tasks).where(eq(schema.tasks.userId, userId)).catch(() => []),
    ]);
    const taskProjectIds = Array.from(new Set(taskRows.map((t: { projectId: number | null }) => t.projectId).filter((x): x is number => x != null)));
    const projects = allProjects.filter(p => {
      if (p.leadId === userId) return true;
      if (taskProjectIds.includes(p.id)) return true;
      try { const m: number[] = JSON.parse(p.teamMemberIds || "[]"); return m.includes(userId); } catch { return false; }
    });
    const timesheets = timesheetsRaw;

    return {
      success: true,
      data: {
        user: userRows[0] ?? null,
        projects,
        timesheets,
        attendance,
        tasks,
      },
    };
  } catch (error: any) {
    console.error("getOverviewPageData Error:", error);
    return { success: false, data: null };
  }
}

// Attendance page: replaces 3 separate server action calls
export async function getAttendancePageData() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null };
    if (!db) return { success: false, data: null };

    const userId = session.id as number;

    const [userRows, leaves, attendance] = await Promise.all([
      db.select(publicUserFields).from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      db.select().from(schema.leaves).where(eq(schema.leaves.userId, userId)),
      db.select().from(schema.attendance).where(eq(schema.attendance.userId, userId)),
    ]);

    return {
      success: true,
      data: {
        user: userRows[0] ?? null,
        leaves,
        attendance,
      },
    };
  } catch (error: any) {
    console.error("getAttendancePageData Error:", error);
    return { success: false, data: null };
  }
}

// Create a new task assigned to an employee
export async function createTask(userId: number, title: string, priority: string, projectId: number | null, dueDate?: string | null, description?: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_tasks")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };
    const input = z.object({
      userId: idSchema,
      title: z.string().trim().min(1).max(255),
      priority: z.enum(["low", "medium", "high"]),
      projectId: idSchema.nullable(),
      dueDate: dateSchema.nullable().optional(),
      description: z.string().trim().max(4000).optional(),
    }).safeParse({ userId, title, priority, projectId, dueDate, description });
    if (!input.success) return invalidInput(input.error);

    if (!(await isActiveOrganizationUser(context.organizationId, input.data.userId, ["admin", "employee"]))) {
      return { success: false, error: "Select an active team member from this organization." };
    }
    if (input.data.projectId) {
      const [project] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(
        eq(schema.projects.id, input.data.projectId),
        eq(schema.projects.organizationId, context.organizationId)
      )).limit(1);
      if (!project) return { success: false, error: "Select a project from this organization." };
    }

    await db.insert(schema.tasks).values({
      title: input.data.title,
      userId: input.data.userId,
      assignedById: Number(session.id),
      projectId: input.data.projectId,
      priority: input.data.priority,
      description: input.data.description || null,
      done: 0,
      dueDate: input.data.dueDate || null,
    });

    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("createTask Error:", error);
    return { success: false, error: error.message };
  }
}

// Toggle a task's done state (numbers 0/1 from client)
export async function toggleTaskDone(taskId: number, done: number) {
  return toggleTaskStatus(taskId, done === 1);
}

// Toggle a task's status
export async function toggleTaskStatus(id: number, doneStatus: boolean) {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "DB not initialized" };
    if (!(await canMutateTask(session, id))) return { success: false, error: "Forbidden." };

    const newDone = doneStatus ? 1 : 0;
    const newStatus = doneStatus ? 'done' : 'in-progress'; // auto-sync status

    await db.update(schema.tasks)
      .set({ done: newDone, status: newStatus })
      .where(eq(schema.tasks.id, id));

    // Sync everywhere the task surfaces.
    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTaskStage(id: number, newStage: string) {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "DB not initialized" };
    if (!(await canMutateTask(session, id))) return { success: false, error: "Forbidden." };
    const stageResult = taskStatuses.safeParse(newStage);
    if (!stageResult.success) return invalidInput(stageResult.error);

    const isDone = stageResult.data === 'done' ? 1 : 0;

    await db.update(schema.tasks)
      .set({ status: stageResult.data, done: isDone })
      .where(eq(schema.tasks.id, id));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete a task
export async function deleteTask(taskId: number) {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    if (session.role !== "admin" || !(await canMutateTask(session, taskId))) return { success: false, error: "Forbidden." };

    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));

    revalidatePath("/admin/team");
    revalidatePath("/employee");
    return { success: true };
  } catch (error: any) {
    console.error("deleteTask Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getClientDashboardData() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "client") return { success: false, data: null };
    if (!db) return { success: false, data: null };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: null };

    const clientId = await getOwnedClientId(session);
    if (!clientId) return {
      success: true,
      data: { projects: [], actionItems: [], upcomingMilestones: [], pendingInvoices: [] },
    };

    // 2. Fetch Projects
    const [projectList, invoiceList] = await Promise.all([
      db.select({
        id: schema.projects.id,
        name: schema.projects.name,
        status: schema.projects.status,
        deadline: schema.projects.deadline,
      })
        .from(schema.projects)
        .where(and(eq(schema.projects.organizationId, context.organizationId), eq(schema.projects.clientId, clientId)))
        .orderBy(desc(schema.projects.createdAt)),
      db.select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        amount: schema.invoices.amount,
        status: schema.invoices.status,
        dueDate: schema.invoices.dueDate,
      })
        .from(schema.invoices)
        .where(and(
          eq(schema.invoices.organizationId, context.organizationId),
          eq(schema.invoices.clientId, clientId),
          inArray(schema.invoices.status, ["sent", "overdue"]),
        )),
    ]);

    const actionItems = invoiceList
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .map(inv => ({
        id: inv.id,
        title: `Invoice ${inv.invoiceNumber}`,
        detail: `₹${inv.amount.toLocaleString()} ${inv.status === 'overdue' ? 'is overdue!' : `due ${inv.dueDate || 'soon'}`}`,
        cta: "Pay now",
        tone: inv.status === 'overdue' ? 'warning' : 'info'
      }));

    // Client milestones use explicit project deadlines. Internal employee task
    // titles stay private until a dedicated client-visible milestone model exists.
    const upcomingMilestones = projectList
      .filter(project => project.deadline && project.status !== "completed")
      .slice(0, 5)
      .map(project => ({
        id: project.id,
        title: `${project.name} deadline`,
        date: new Date(project.deadline!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        project: project.name,
      }));

    return {
      success: true,
      data: {
        projects: projectList,
        actionItems,
        upcomingMilestones,
        pendingInvoices: invoiceList,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Admin re-assign a project lead
export async function assignProjectLead(projectId: number, leadId: number | null) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    if (!idSchema.safeParse(projectId).success) return { success: false, error: "Invalid project." };
    const [project] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(
      eq(schema.projects.id, projectId),
      eq(schema.projects.organizationId, context.organizationId)
    )).limit(1);
    if (!project) return { success: false, error: "Project not found in this organization." };
    if (leadId !== null && !(await isActiveOrganizationUser(context.organizationId, leadId, ["admin", "employee"]))) {
      return { success: false, error: "Select an active project lead from this organization." };
    }

    await db.update(schema.projects)
      .set({ leadId })
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.organizationId, context.organizationId)));

    revalidatePath("/admin/team");
    revalidatePath("/admin/projects");
    revalidatePath("/employee");
    return { success: true };
  } catch (error: any) {
    console.error("assignProjectLead Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * MESSAGING ACTIONS
 * ----------------------------------------------------
 */

// Send a message to another user
export async function sendMessage(receiverId: number, message: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };
    if (!message.trim()) return { success: false, error: "Message cannot be empty" };
    if (message.trim().length > 4000) return { success: false, error: "Message is too long." };
    if (!(await canMessageOrganizationUser(session, receiverId))) return { success: false, error: "Recipient is not available." };

    await db.insert(schema.messages).values({
      senderId: session.id as number,
      receiverId,
      message: message.trim(),
      read: 0,
    });

    await createNotification(receiverId, "new_message", String(session.name || session.email), message.trim().substring(0, 100), "/messages");

    return { success: true };
  } catch (error: any) {
    console.error("sendMessage Error:", error);
    return { success: false, error: error.message };
  }
}

// Get conversations (latest message per unique contact pair)
export async function getConversations() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [] };

    const allMsgs = await db.select()
      .from(schema.messages)
      .where(or(
        eq(schema.messages.senderId, Number(session.id)),
        eq(schema.messages.receiverId, Number(session.id))
      ))
      .orderBy(desc(schema.messages.createdAt));

    const myId = session.id as number;
    const contactMap = new Map<number, { otherId: number; lastMsg: any; unread: number }>();

    for (const msg of allMsgs) {
      if (msg.senderId !== myId && msg.receiverId !== myId) continue;
      const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      if (!contactMap.has(otherId)) {
        contactMap.set(otherId, { otherId, lastMsg: msg, unread: 0 });
      }
      if (msg.receiverId === myId && !msg.read) {
        contactMap.get(otherId)!.unread++;
      }
    }

    const sorted = Array.from(contactMap.values()).sort(
      (a, b) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime()
    );

    const userIds = sorted.map((c) => c.otherId);
    const usersList = userIds.length > 0
      ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role })
        .from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(and(
          eq(schema.organizationMemberships.organizationId, context.organizationId),
          eq(schema.organizationMemberships.status, "active"),
          inArray(schema.users.id, userIds)
        ))
      : [];

    const enriched = sorted.map((c) => {
      const u = usersList.find((usr) => usr.id === c.otherId);
      return { ...c, otherUser: u || null };
    }).filter(conversation => conversation.otherUser && (session.role !== "client" || conversation.otherUser.role === "admin"));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getConversations Error:", error);
    return { success: false, data: [] };
  }
}

// Get messages between current user and another user
export async function getConversationMessages(otherUserId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    if (!(await canMessageOrganizationUser(session, otherUserId))) return { success: false, data: [], error: "Conversation not found." };

    const myId = session.id as number;
    const msgs = await db.select()
      .from(schema.messages)
      .where(
        (() => {
          const cond1 = and(eq(schema.messages.senderId, myId), eq(schema.messages.receiverId, otherUserId));
          const cond2 = and(eq(schema.messages.senderId, otherUserId), eq(schema.messages.receiverId, myId));
          return or(cond1, cond2);
        })()
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(100);

    return { success: true, data: msgs.reverse() };
  } catch (error: any) {
    console.error("getConversationMessages Error:", error);
    return { success: false, data: [] };
  }
}

// Mark all messages from a user as read
export async function markConversationRead(otherUserId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false };
    if (!db) return { success: false };
    if (!(await canMessageOrganizationUser(session, otherUserId))) return { success: false };

    await db.update(schema.messages)
      .set({ read: 1 })
      .where(and(
        eq(schema.messages.senderId, otherUserId),
        eq(schema.messages.receiverId, session.id as number),
        eq(schema.messages.read, 0)
      ));

    return { success: true };
  } catch (error: any) {
    console.error("markConversationRead Error:", error);
    return { success: false };
  }
}

// Get unread message count
export async function getUnreadMessageCount() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, count: 0 };
    if (!db) return { success: false, count: 0 };

    const results = await db.select({ id: schema.messages.id })
      .from(schema.messages)
      .where(and(
        eq(schema.messages.receiverId, session.id as number),
        eq(schema.messages.read, 0)
      ));

    return { success: true, count: results.length };
  } catch (error: any) {
    console.error("getUnreadMessageCount Error:", error);
    return { success: false, count: 0 };
  }
}

// Real contacts a user can message: all admins + employees except themselves.
// Returns the current user's id so the page can filter / label correctly.
export async function getMessagingContacts() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [], meId: 0 };
    if (!db) return { success: false, data: [], meId: 0 };
    if (session.role === "client") return getClientMessagingContacts();
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], meId: 0 };

    const meId = session.id as number;
    const usersList = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        systemRole: schema.users.systemRole,
      })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        inArray(schema.users.role, ["admin", "employee"])
      ));

    const contacts = usersList.filter((u) => u.id !== meId);
    return { success: true, data: contacts, meId };
  } catch (error: any) {
    console.error("getMessagingContacts Error:", error);
    return { success: false, data: [], meId: 0, error: error.message };
  }
}

// Contacts a client can message: their account lead (client.ownerId) + all admins.
export async function getClientMessagingContacts() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "client") return { success: false, data: [], meId: 0 };
    if (!db) return { success: false, data: [], meId: 0 };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [], meId: 0 };

    const meId = session.id as number;
    const clientList = await db.select().from(schema.clients).where(and(
      eq(schema.clients.organizationId, context.organizationId),
      eq(schema.clients.ownerId, meId)
    ));
    if (!clientList.length) return { success: true, data: [], meId };

    // Admins are always reachable.
    const admins = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, context.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.users.role, "admin")
      ));

    // Note: client.ownerId here points to the client's own user id (that's how
    // login links to the record), so the real "account lead" is on the admin
    // side. We expose admins as the agency contact for the client.
    const map = new Map<number, any>();
    for (const a of admins) if (a.id !== meId) map.set(a.id, a);

    return { success: true, data: Array.from(map.values()), meId };
  } catch (error: any) {
    console.error("getClientMessagingContacts Error:", error);
    return { success: false, data: [], meId: 0 };
  }
}

// Register FCM Token for Push Notifications
export async function registerFcmToken(token: string, deviceType?: string) {
  const session = await getAuthSession();
  if (!session || !db) return { success: false };

  try {
    // Check if token already exists
    const existing = await db.select().from(schema.fcmTokens).where(eq(schema.fcmTokens.token, token));
    
    if (existing.length === 0) {
      await db.insert(schema.fcmTokens).values({
        userId: session.id as number,
        token,
        deviceType: deviceType || "android",
      });
    } else if (existing[0].userId !== session.id) {
      // If token exists but belongs to another user (e.g. they logged out and someone else logged in), update it
      await db.update(schema.fcmTokens)
        .set({ userId: session.id as number })
        .where(eq(schema.fcmTokens.token, token));
    }
    return { success: true };
  } catch (e) {
    console.error("registerFcmToken Error:", e);
    return { success: false };
  }
}

/**
 * ----------------------------------------------------
 * TASK ASSIGNMENT ACTIONS
 * ----------------------------------------------------
 */

// Admin assigns a task to an employee
export async function assignTask(title: string, employeeId: number, description: string, priority: string, dueDate: string) {
  return createTask(employeeId, title, priority, null, dueDate || null, description);
}

// Update task status (employee marks progress)
export async function updateTaskStatus(taskId: number, status: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };
    if (!(await canMutateTask(session, taskId))) return { success: false, error: "Forbidden." };
    const statusResult = taskStatuses.safeParse(status);
    if (!statusResult.success) return invalidInput(statusResult.error);

    await db.update(schema.tasks)
      .set({ status: statusResult.data, done: statusResult.data === "done" ? 1 : 0 })
      .where(eq(schema.tasks.id, taskId));

    revalidatePath("/admin/team");
    revalidatePath("/employee/overview");
    await logActivity(session.id as number, `task_${status}`, `Updated task #${taskId} to ${status}`, "task", taskId);
    return { success: true };
  } catch (error: any) {
    console.error("updateTaskStatus Error:", error);
    return { success: false, error: error.message };
  }
}

// Get tasks assigned TO the current user
export async function getMyAssignedTasks() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [] };

    const taskRows = await db.select({ task: schema.tasks })
      .from(schema.tasks)
      .leftJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
      .where(and(
        eq(schema.tasks.userId, session.id as number),
        or(isNull(schema.tasks.projectId), eq(schema.projects.organizationId, context.organizationId))
      ))
      .orderBy(desc(schema.tasks.createdAt));
    const results = taskRows.map(row => row.task);

    const assigneeIds = results.map(t => t.assignedById).filter(Boolean) as number[];
    const assigners = assigneeIds.length > 0
      ? await db.select({ id: schema.users.id, name: schema.users.name })
          .from(schema.organizationMemberships)
          .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
          .where(and(
            eq(schema.organizationMemberships.organizationId, context.organizationId),
            eq(schema.organizationMemberships.status, "active"),
            inArray(schema.users.id, assigneeIds)
          ))
      : [];

    // Join project names so the tasks page can group/filter by project.
    const projectIds = Array.from(new Set(results.map(t => t.projectId).filter(Boolean))) as number[];
    const projectsList = projectIds.length > 0
      ? await db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(and(
          eq(schema.projects.organizationId, context.organizationId),
          inArray(schema.projects.id, projectIds)
        ))
      : [];

    const enriched = results.map(task => ({
      ...task,
      assignedBy: assigners.find(a => a.id === task.assignedById) || null,
      projectName: projectsList.find(p => p.id === task.projectId)?.name || null,
    }));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getMyAssignedTasks Error:", error);
    return { success: false, data: [] };
  }
}

/**
 * ----------------------------------------------------
 * ACTIVITY LOG ACTIONS
 * ----------------------------------------------------
 */

// Internal: log an activity event
async function logActivity(userId: number, type: string, description: string, targetType?: string, targetId?: number) {
  if (!db) return;
  try {
    await db.insert(schema.activityLog).values({ userId, type, description, targetType, targetId });
  } catch (e) {
    console.error("logActivity error:", e);
  }
}

// Get activity feed
export async function getActivityFeed(limit = 30) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    limit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : 30));

    const results = await db.select()
      .from(schema.activityLog)
      .orderBy(desc(schema.activityLog.createdAt))
      .limit(limit);

    const userIds = Array.from(new Set(results.map(r => r.userId)));
    const usersList = userIds.length > 0
      ? await db.select({ id: schema.users.id, name: schema.users.name, role: schema.users.role }).from(schema.users).where(inArray(schema.users.id, userIds))
      : [];

    const enriched = results.map(entry => ({
      ...entry,
      user: usersList.find(u => u.id === entry.userId) || null,
    }));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getActivityFeed Error:", error);
    return { success: false, data: [] };
  }
}

/**
 * ----------------------------------------------------
 * PROFILE ACTIONS
 * ----------------------------------------------------
 */

// Update own profile
export async function updateMyProfile(data: { name?: string; email?: string; phone?: string; bio?: string }) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.email) updateData.email = data.email.trim();

    await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, session.id as number));

    revalidatePath("/employee/profile");
    revalidatePath("/admin/team");
    revalidatePath("/client/profile");
    return { success: true };
  } catch (error: any) {
    console.error("updateMyProfile Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * INVOICE ACTIONS
 * ----------------------------------------------------
 */

// Get all invoices (admin sees all, enriched with client/project names)
export async function getInvoices() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [] };
    const results = await db.select().from(schema.invoices)
      .where(eq(schema.invoices.organizationId, context.organizationId))
      .orderBy(desc(schema.invoices.createdAt));
    const clientIds = Array.from(new Set(results.map(i => i.clientId).filter(Boolean))) as number[];
    const projectIds = Array.from(new Set(results.map(i => i.projectId).filter(Boolean))) as number[];

    const [clientList, projectList] = await Promise.all([
      clientIds.length > 0 ? db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(and(eq(schema.clients.organizationId, context.organizationId), inArray(schema.clients.id, clientIds))) : [],
      projectIds.length > 0 ? db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(and(eq(schema.projects.organizationId, context.organizationId), inArray(schema.projects.id, projectIds))) : [],
    ]);

    const enriched = results.map(inv => ({
      ...inv,
      clientName: clientList.find(c => c.id === inv.clientId)?.name || "—",
      projectName: projectList.find(p => p.id === inv.projectId)?.name || null,
    }));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getInvoices Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Create invoice (manual or auto from project)
export async function createInvoice(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_invoices")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    const clientId = parseInt(formData.get("clientId") as string);
    const projectIdStr = formData.get("projectId") as string;
    const amount = parseInt((formData.get("amount") as string) || "0");
    const dueDate = formData.get("dueDate") as string;
    const notes = (formData.get("notes") as string) || "";

    if (!clientId || amount <= 0) return { success: false, error: "Client and a positive amount are required." };
    const [client] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(
      eq(schema.clients.id, clientId),
      eq(schema.clients.organizationId, context.organizationId)
    )).limit(1);
    if (!client) return { success: false, error: "Select a client from this organization." };
    const projectId = projectIdStr ? parseInt(projectIdStr) : null;
    if (projectId) {
      const [project] = await db.select({ id: schema.projects.id, clientId: schema.projects.clientId }).from(schema.projects).where(and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.organizationId, context.organizationId)
      )).limit(1);
      if (!project || project.clientId !== clientId) return { success: false, error: "Select a project belonging to this client." };
    }

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    const now = new Date();
    const invoiceNumber = createDocumentNumber("INV", now);

    await db.insert(schema.invoices).values({
      clientId,
      organizationId: context.organizationId,
      projectId,
      invoiceNumber,
      amount,
      status: "draft",
      dueDate: dueDate || null,
      notes: notes.trim() || null,
    });

    revalidateInvoiceSurfaces();
    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error("createInvoice Error:", error);
    return { success: false, error: error.message };
  }
}

// Service-based invoice. Each line item is a service/deliverable with an amount
// (and optional unit count, e.g. "3 months retainer") + an optional per-item note
// such as "Domain & hosting included for 1 year". Stored as JSON in `notes` so we
// avoid a schema migration. clientId is optional (manual/one-off billing).
export interface InvoiceServiceItem {
  service: string;        // e.g. "Web Development", "Meta Ads Management"
  details?: string;       // scope/description, e.g. "5-page responsive site"
  units?: number;         // optional (months, posts, hours); blank = flat fee
  amount: number;         // total for this line
  note?: string;          // e.g. "Domain & hosting included for 1 year"
}
export interface CreateInvoiceFullInput {
  clientId?: number | null;
  projectId?: number | null;
  type?: "invoice" | "proposal" | "contract";
  billToName: string;
  billToEmail?: string;
  billToAddress?: string;
  items: InvoiceServiceItem[];
  taxPercent?: number;
  discount?: number;        // flat amount
  servicePeriod?: string;   // e.g. "June 2026" or "May–Jul 2026"
  paymentTerms?: string;    // e.g. "50% advance, balance on delivery"
  dueDate?: string;
  notes?: string;           // overall invoice note / terms
  
  // Proposal-specific
  proposalIntro?: string;
  proposalGoals?: string;
  proposalScope?: string;
  proposalNextSteps?: string;

  // Contract-specific
  contractParties?: string;
  contractScope?: string;
  contractTerms?: string;

  status?: "draft" | "sent";
}

export async function createInvoiceFull(input: CreateInvoiceFullInput) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_invoices")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    if (input.clientId) {
      const [client] = await db.select({ id: schema.clients.id }).from(schema.clients).where(and(
        eq(schema.clients.id, input.clientId),
        eq(schema.clients.organizationId, context.organizationId)
      )).limit(1);
      if (!client) return { success: false, error: "Select a client from this organization." };
    }
    if (input.projectId) {
      const [project] = await db.select({ id: schema.projects.id, clientId: schema.projects.clientId }).from(schema.projects).where(and(
        eq(schema.projects.id, input.projectId),
        eq(schema.projects.organizationId, context.organizationId)
      )).limit(1);
      if (!project || (input.clientId && project.clientId !== input.clientId)) return { success: false, error: "Select a project belonging to this client." };
    }

    const items = (input.items || []).filter(i => (i.service || "").trim() && Number(i.amount) > 0);
    if (!input.billToName?.trim()) return { success: false, error: "Bill-to name is required." };
    if (items.length === 0) return { success: false, error: "Add at least one service." };

    const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const taxPercent = Number(input.taxPercent || 0);
    const discount = Number(input.discount || 0);
    const taxAmount = Math.round((subtotal * taxPercent) / 100);
    const total = Math.max(0, subtotal + taxAmount - discount);

    // Auto-generate document number based on type
    const now = new Date();
    const docType = input.type || "invoice";
    let typePrefix = "INV";
    if (docType === "proposal") typePrefix = "PROP";
    else if (docType === "contract") typePrefix = "CONT";

    const invoiceNumber = createDocumentNumber(typePrefix, now);

    const payload = {
      v: 2,
      type: docType,
      billTo: { name: input.billToName.trim(), email: input.billToEmail?.trim() || "", address: input.billToAddress?.trim() || "" },
      items: items.map(i => ({
        service: i.service.trim(),
        details: i.details?.trim() || "",
        units: i.units ? Number(i.units) : null,
        amount: Number(i.amount || 0),
        note: i.note?.trim() || "",
      })),
      subtotal, taxPercent, taxAmount, discount, total,
      servicePeriod: input.servicePeriod?.trim() || "",
      paymentTerms: input.paymentTerms?.trim() || "",
      note: input.notes?.trim() || "",
      // Extended fields
      proposalIntro: input.proposalIntro?.trim() || "",
      proposalGoals: input.proposalGoals?.trim() || "",
      proposalScope: input.proposalScope?.trim() || "",
      proposalNextSteps: input.proposalNextSteps?.trim() || "",
      contractParties: input.contractParties?.trim() || "",
      contractScope: input.contractScope?.trim() || "",
      contractTerms: input.contractTerms?.trim() || "",
    };

    await db.insert(schema.invoices).values({
      clientId: input.clientId || null,
      organizationId: context.organizationId,
      projectId: input.projectId || null,
      invoiceNumber,
      amount: total,
      status: input.status || "draft",
      dueDate: input.dueDate || null,
      notes: JSON.stringify(payload),
    });

    // Save virtual document to populate Documents page
    await db.insert(schema.documents).values({
      organizationId: context.organizationId,
      name: `Invoice ${invoiceNumber} - ${input.billToName.trim()}`,
      clientId: input.clientId || null,
      clientName: input.billToName.trim() || "Unknown Client",
      type: "PDF",
      size: "—",
      folder: "Invoices",
      ownerName: (session.name as string) || "System",
      url: "/admin/invoices",
    });

    revalidateInvoiceSurfaces();
    revalidateDocumentSurfaces();
    return { success: true, invoiceNumber };
  } catch (error: any) {
    console.error("createInvoiceFull Error:", error);
    return { success: false, error: error.message };
  }
}

// Update invoice status
export async function updateInvoiceStatus(invoiceId: number, status: "draft" | "sent" | "paid" | "overdue", paidDate?: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_invoices")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    await db.update(schema.invoices)
      .set({ status, ...(paidDate ? { paidDate } : {}) })
      .where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.organizationId, context.organizationId)));

    revalidateInvoiceSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("updateInvoiceStatus Error:", error);
    return { success: false, error: error.message };
  }
}

// Delete invoice
export async function deleteInvoice(invoiceId: number) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_invoices")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };

    await db.delete(schema.invoices).where(and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.organizationId, context.organizationId)));
    revalidateInvoiceSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("deleteInvoice Error:", error);
    return { success: false, error: error.message };
  }
}

// Auto-generate invoices for all active retainer projects whose billing cycle is due
export async function autoGenerateInvoices() {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized.", generated: 0 };
    if (!await hasEmployeePermission(session, "manage_invoices")) return { success: false, error: "Permission denied.", generated: 0 };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership.", generated: 0 };

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDay = today.getDate();

    // Find all active retainer projects with a billing cycle start date
    const retainerProjects = await db.select().from(schema.projects)
      .where(and(
        eq(schema.projects.organizationId, context.organizationId),
        eq(schema.projects.billingModel, "retainer"),
        eq(schema.projects.status, "active")
      ));

    let generated = 0;
    const now = new Date();

    for (const project of retainerProjects) {
      if (!project.billingCycleStart || !project.monthlyFee) continue;

      // Check if billing day matches today
      const cycleDay = new Date(project.billingCycleStart).getDate();
      if (cycleDay !== currentDay) continue;

      // Check if an invoice already exists for this project this month
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const existing = await db.select({ id: schema.invoices.id })
        .from(schema.invoices)
        .where(and(
          eq(schema.invoices.projectId, project.id),
          eq(schema.invoices.organizationId, context.organizationId),
          gte(schema.invoices.createdAt, new Date(monthStart))
        ));

      if (existing.length > 0) continue;

      // Compute due date: 7 days from today
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      const invoiceNumber = createDocumentNumber("INV", now);

      await db.insert(schema.invoices).values({
        clientId: project.clientId,
        organizationId: context.organizationId,
        projectId: project.id,
        invoiceNumber,
        amount: project.monthlyFee ?? 0,
        status: "draft",
        dueDate: dueDateStr,
        notes: `Auto-generated monthly retainer invoice for ${project.name}`,
      });

      generated++;
    }

    revalidateInvoiceSurfaces();
    return { success: true, generated };
  } catch (error: any) {
    console.error("autoGenerateInvoices Error:", error);
    return { success: false, error: error.message, generated: 0 };
  }
}

// Get clients enriched with their projects and latest invoice
export async function getClientsEnriched() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [] };

    const [clientList, projectList, invoiceList] = await Promise.all([
      db.select().from(schema.clients).where(eq(schema.clients.organizationId, context.organizationId)),
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, context.organizationId)),
      db.select().from(schema.invoices).where(eq(schema.invoices.organizationId, context.organizationId)).orderBy(desc(schema.invoices.createdAt)),
    ]);

    const enriched = clientList.map(client => {
      const linkedProjects = projectList.filter(p => p.clientId === client.id);
      const linkedInvoices = invoiceList.filter(i => i.clientId === client.id);
      const totalMRR = linkedProjects.reduce((s, p) => s + (p.monthlyFee || 0), 0);
      const unpaidCount = linkedInvoices.filter(i => i.status === "sent" || i.status === "overdue").length;
      const latestInvoice = linkedInvoices[0] || null;
      return { ...client, linkedProjects, linkedInvoices, totalMRR, unpaidCount, latestInvoice };
    });

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getClientsEnriched Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Employee-facing enriched clients: returns ALL clients with computed MRR /
// project counts / health, plus an `isMine` flag for clients this employee owns.
// The UI can then offer a "Only my accounts" toggle without a second request.
export async function getMyClients() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    const uid = Number(session.id);
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [] };
    // Every org client — and every org project for computing each client's
    // true MRR/project count — is visible here, not just what this employee
    // is assigned to. The `isMine` flag below (not row-filtering) is what
    // distinguishes "my accounts" for the UI's toggle.
    const [clientList, projectList, userList] = await Promise.all([
      db.select().from(schema.clients).where(eq(schema.clients.organizationId, context.organizationId)),
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, context.organizationId)),
      db.select({ id: schema.users.id, name: schema.users.name })
        .from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(and(eq(schema.organizationMemberships.organizationId, context.organizationId), eq(schema.organizationMemberships.status, "active"))),
    ]);

    const enriched = clientList.map(client => {
      const linkedProjects = projectList.filter(p => p.clientId === client.id);
      const totalMRR = linkedProjects.reduce((s, p) => s + (p.monthlyFee || p.budget || 0), 0);
      let accountManagerId: number | null = null;
      try {
        const parsed = JSON.parse(client.details || "{}");
        const candidate = Number(parsed.accountManager);
        accountManagerId = Number.isInteger(candidate) && candidate > 0 ? candidate : null;
      } catch {}
      const owner = userList.find(u => u.id === accountManagerId) || null;
      // Derive a simple status + health from the existing stage/progress fields.
      const stage = client.stage || "contract_signed";
      const status =
        stage === "campaign_live" ? "active" :
        stage === "contract_signed" ? "onboarding" : "onboarding";
      const health = Math.max(0, Math.min(100, client.progress || 0));
      return {
        ...client,
        linkedProjects,
        projectCount: linkedProjects.length,
        totalMRR,
        ownerName: owner?.name || null,
        status,
        health,
        isMine: accountManagerId === uid || linkedProjects.some(project => {
          if (project.leadId === uid) return true;
          try { return (JSON.parse(project.teamMemberIds || "[]") as number[]).includes(uid); } catch { return false; }
        }),
      };
    });

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error("getMyClients Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Get a single project enriched with tasks, lead user, client, and invoices
export async function getProjectById(projectId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null, error: "Unauthorized." };
    if (!db) return { success: false, data: null, error: "Database not connected." };
    if (!(await canAccessProject(session, projectId))) return { success: false, data: null, error: "Project not found." };
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: null, error: "No active organization membership." };

    const [projectRows, taskList, userList, clientList, invoiceList] = await Promise.all([
      db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.organizationId, context.organizationId))).limit(1),
      db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId)).orderBy(schema.tasks.createdAt),
      db.select(publicUserFields).from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(and(eq(schema.organizationMemberships.organizationId, context.organizationId), eq(schema.organizationMemberships.status, "active"))),
      db.select().from(schema.clients).where(eq(schema.clients.organizationId, context.organizationId)),
      session.role === "admin"
        ? db.select().from(schema.invoices).where(eq(schema.invoices.organizationId, context.organizationId)).orderBy(desc(schema.invoices.createdAt))
        : Promise.resolve([]),
    ]);

    if (!projectRows.length) {
      return { success: false, data: null };
    }
    const project = projectRows[0];
    const lead = userList.find(u => u.id === project.leadId) || null;
    const client = clientList.find(c => c.id === project.clientId) || null;
    const linkedInvoices = invoiceList.filter(i => i.projectId === projectId);
    const totalPaid = linkedInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = linkedInvoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const tasksDone = taskList.filter(t => t.done === 1).length;

    return {
      success: true,
      data: { ...project, tasks: taskList, lead, client, linkedInvoices, totalPaid, outstanding, tasksDone, tasksTotal: taskList.length },
    };
  } catch (error: any) {
    console.error("getProjectById Error:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * ----------------------------------------------------
 * PROJECT TASK MANAGEMENT
 * ----------------------------------------------------
 */

// Get all project-linked tasks grouped by projectId (admin sees all, employee sees own)
export async function getProjectTasksGrouped() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: {} };
    if (!db) return { success: false, data: {} };

    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: {}, error: "No active organization membership." };
    let results: any[];
    if (session.role === "admin") {
      const rows = await db.select({ task: schema.tasks }).from(schema.tasks)
        .innerJoin(schema.projects, eq(schema.projects.id, schema.tasks.projectId))
        .where(eq(schema.projects.organizationId, context.organizationId));
      results = rows.map(row => row.task);
    } else {
      const accessible = await getProjects();
      const projectIds = (accessible.data || []).map((project: any) => project.id).filter(Number.isInteger) as number[];
      if (!projectIds.length) return { success: true, data: {} };
      const [aggregateRows, ownTasks] = await Promise.all([
        db.select({ id: schema.tasks.id, projectId: schema.tasks.projectId, done: schema.tasks.done })
          .from(schema.tasks)
          .where(inArray(schema.tasks.projectId, projectIds)),
        db.select().from(schema.tasks).where(and(
          eq(schema.tasks.userId, Number(session.id)),
          inArray(schema.tasks.projectId, projectIds)
        )),
      ]);
      const ownTaskMap = new Map(ownTasks.map(task => [task.id, task]));
      results = aggregateRows.map(task => ownTaskMap.get(task.id) || task);
    }

    const grouped: Record<number, { total: number; done: number; tasks: any[] }> = {};
    for (const task of results) {
      if (task.projectId == null) continue;
      if (!grouped[task.projectId]) grouped[task.projectId] = { total: 0, done: 0, tasks: [] };
      grouped[task.projectId].total++;
      if (task.done === 1) grouped[task.projectId].done++;
      if ("title" in task) grouped[task.projectId].tasks.push(task);
    }

    return { success: true, data: grouped };
  } catch (error: any) {
    console.error("getProjectTasksGrouped Error:", error);
    return { success: false, data: {} };
  }
}

// Admin adds a task to a project (assigned to the project's lead developer)
export async function addProjectTask(projectId: number, title: string, priority: string, assignToUserId?: number, dueDate?: string | null, description?: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };
    if (!await hasEmployeePermission(session, "manage_tasks")) return { success: false, error: "Permission denied." };
    const context = session.role === "admin"
      ? await getAdminOrganizationContext(session)
      : await getOrganizationContext(session);
    if (!context) return { success: false, error: "No active organization membership." };
    const input = z.object({
      projectId: idSchema,
      title: z.string().trim().min(1).max(255),
      priority: z.enum(["low", "medium", "high"]),
      assignToUserId: idSchema.optional(),
      dueDate: dateSchema.nullable().optional(),
      description: z.string().trim().max(4000).optional(),
    }).safeParse({ projectId, title, priority, assignToUserId, dueDate, description });
    if (!input.success) return invalidInput(input.error);

    const [project] = await db.select().from(schema.projects).where(and(
      eq(schema.projects.id, input.data.projectId),
      eq(schema.projects.organizationId, context.organizationId)
    )).limit(1);
    if (!project) return { success: false, error: "Project not found." };

    const assignedUserId = input.data.assignToUserId || project.leadId;
    if (!assignedUserId) return { success: false, error: "Choose an assignee or set a project lead first." };
    if (!(await isActiveOrganizationUser(context.organizationId, assignedUserId, ["admin", "employee"]))) {
      return { success: false, error: "Select an active team member from this organization." };
    }

    await db.insert(schema.tasks).values({
      title: input.data.title,
      userId: assignedUserId,
      assignedById: session.id as number,
      projectId,
      priority: input.data.priority,
      dueDate: input.data.dueDate || null,
      description: input.data.description || null,
      status: "todo",
      done: 0,
    });

    revalidatePath("/admin/projects");
    revalidatePath("/employee/projects");
    return { success: true };
  } catch (error: any) {
    console.error("addProjectTask Error:", error);
    return { success: false, error: error.message };
  }
}

// Update an existing project (edit form)
export async function updateProject(projectId: number, formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const name = (formData.get("name") as string)?.trim();
    const clientName = (formData.get("clientName") as string)?.trim();
    const clientIdRaw = formData.get("clientId") as string;
    const leadIdStr = formData.get("leadId") as string;
    const status = formData.get("status") as string;
    const priority = formData.get("priority") as string;
    const startDate = (formData.get("startDate") as string)?.trim() || null;
    const deadline = (formData.get("deadline") as string) || "";
    const monthlyFee = parseInt((formData.get("monthlyFee") as string) || "0");
    const adSpendBudget = parseInt((formData.get("adSpendBudget") as string) || "0");
    const budget = parseInt((formData.get("budget") as string) || "0");
    const billingCycleStart = (formData.get("billingCycleStart") as string)?.trim() || null;
    const contractDuration = parseInt((formData.get("contractDuration") as string) || "0");
    const clientContactName = (formData.get("clientContactName") as string)?.trim() || null;
    const clientContactPhone = (formData.get("clientContactPhone") as string)?.trim() || null;
    const accessGranted = (formData.get("accessGranted") as string) === "true" ? 1 : 0;
    const contractLink = (formData.get("contractLink") as string)?.trim() || null;
    const teamMemberIds = safeJsonArrayOfIds(formData.get("teamMemberIds"));

    if (!name) return { success: false, error: "Project name is required." };

    const newLeadId = leadIdStr ? parseInt(leadIdStr) : null;
    const clientId = clientIdRaw ? Number(clientIdRaw) : null;
    let resolvedClientName: string | null = null;
    const [existingProject] = await db.select({ id: schema.projects.id }).from(schema.projects).where(and(
      eq(schema.projects.id, projectId),
      eq(schema.projects.organizationId, context.organizationId)
    )).limit(1);
    if (!existingProject) return { success: false, error: "Project not found in this organization." };
    if (clientId) {
      const [client] = await db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(and(
        eq(schema.clients.id, clientId),
        eq(schema.clients.organizationId, context.organizationId)
      )).limit(1);
      if (!client) return { success: false, error: "Select a client from this organization." };
      resolvedClientName = client.name;
    }
    if (newLeadId && !(await isActiveOrganizationUser(context.organizationId, newLeadId, ["admin", "employee"]))) {
      return { success: false, error: "Select an active project lead from this organization." };
    }
    for (const teamId of JSON.parse(teamMemberIds) as number[]) {
      if (!(await isActiveOrganizationUser(context.organizationId, teamId, ["admin", "employee"]))) {
        return { success: false, error: "Every project member must be an active teammate in this organization." };
      }
    }

    await db.update(schema.projects).set({
      name,
      clientId,
      clientName: resolvedClientName || clientName || null,
      leadId: newLeadId,
      teamMemberIds,
      status: status || "planning",
      priority: priority || "medium",
      startDate,
      deadline,
      monthlyFee,
      adSpendBudget,
      budget,
      billingCycleStart,
      contractDuration,
      clientContactName,
      clientContactPhone,
      accessGranted,
      contractLink,
    }).where(and(eq(schema.projects.id, projectId), eq(schema.projects.organizationId, context.organizationId)));

    revalidateProjectSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("updateProject Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMetaAdsDashboardData() {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    const scopedProjects = await getProjects();
    const projectsList = (scopedProjects.data || []).filter((project: any) => project.projectType === "meta_ads");
    return { success: true, data: projectsList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWebDevDashboardData() {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, data: { projects: [], tasks: [] } };
    if (!db) return { success: false, data: { projects: [], tasks: [] } };

    // Use getProjects to automatically apply Admin / Employee / Client RBAC filters
    const allProjRes = await getProjects();
    if (!allProjRes.success) throw new Error(allProjRes.error || "Failed to load projects");

    let projectsList = (allProjRes.data || []).filter((p: any) => p.projectType === "web_dev");
    const projectIds = projectsList.map((p: any) => p.id);
    if (session.role === "client" && projectIds.length > 0) {
      const detailRows = await db.select({ id: schema.projects.id, serviceDetails: schema.projects.serviceDetails })
        .from(schema.projects)
        .where(inArray(schema.projects.id, projectIds));
      projectsList = projectsList.map((project: any) => {
        const raw = detailRows.find(row => row.id === project.id)?.serviceDetails;
        let details: any = {};
        try { details = JSON.parse(raw || "{}"); } catch {}
        return {
          ...project,
          serviceDetails: JSON.stringify({
            domain: details.domain || "",
            domainExpiry: details.domainExpiry || "",
            status: details.status || "unconfigured",
            uptime: Number.isFinite(Number(details.uptime)) ? Number(details.uptime) : null,
            response: Number.isFinite(Number(details.response)) ? Number(details.response) : null,
            isLive: details.isLive === true,
          }),
        };
      });
    }
    let allTasks: any[] = [];
    if (projectIds.length > 0) {
      allTasks = session.role === "client"
        ? []
        : await db.select().from(schema.tasks).where(inArray(schema.tasks.projectId, projectIds));
    }
    return { success: true, data: { projects: projectsList, tasks: allTasks } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncWebHealthMetrics() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "DB Error" };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const apiRes = await fetchUptimeMonitors();
    if (!apiRes.success || !apiRes.monitors) {
      throw new Error(apiRes.error || "Failed to fetch monitors");
    }

    const projectsList = await db.select().from(schema.projects).where(and(
      eq(schema.projects.organizationId, context.organizationId),
      eq(schema.projects.projectType, "web_dev")
    ));

    let updatedCount = 0;

    for (const project of projectsList) {
      let sd: any = {};
      try { sd = JSON.parse(project.serviceDetails || "{}"); } catch(e) {}
      
      const projectUrl = String(sd.domain || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (!projectUrl) continue;

      const monitor = apiRes.monitors.find((m: any) => m.url.includes(projectUrl));
      if (monitor) {
        sd.uptime = monitor.uptimeRatio;
        sd.response = monitor.averageResponseTime;
        // status map: 2=operational, 9/8=outage, 0/1=degraded/pending
        if (monitor.status === 2) sd.status = "operational";
        else if (monitor.status === 9 || monitor.status === 8) sd.status = "outage";
        else sd.status = "degraded";

        await db.update(schema.projects)
          .set({ serviceDetails: JSON.stringify(sd) })
          .where(and(eq(schema.projects.id, project.id), eq(schema.projects.organizationId, context.organizationId)));
        updatedCount++;
      }
    }

    revalidatePath("/admin/website-dev");
    return { success: true, updatedCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGlobalSearchData(query = "", limit = 10) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null };
    if (!db) return { success: false, data: null };

    if (session.role !== "admin") return { success: false, data: null };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: null };
    const input = z.object({
      query: z.string().trim().max(100),
      limit: z.number().int().min(1).max(25),
    }).safeParse({ query, limit });
    if (!input.success) return { ...invalidInput(input.error), data: null };

    const pattern = `%${input.data.query}%`;
    const clientFilter = input.data.query
      ? and(eq(schema.clients.organizationId, context.organizationId), like(schema.clients.name, pattern))
      : eq(schema.clients.organizationId, context.organizationId);
    const projectFilter = input.data.query
      ? and(eq(schema.projects.organizationId, context.organizationId), or(like(schema.projects.name, pattern), like(schema.projects.clientName, pattern)))
      : eq(schema.projects.organizationId, context.organizationId);
    const userFilter = input.data.query
      ? or(like(schema.users.name, pattern), like(schema.users.email, pattern), like(schema.users.systemRole, pattern))
      : undefined;
    const [clientsList, projectsList, usersList] = await Promise.all([
      db.select({ id: schema.clients.id, name: schema.clients.name })
        .from(schema.clients)
        .where(clientFilter)
        .orderBy(desc(schema.clients.createdAt))
        .limit(input.data.limit),
      db.select({
        id: schema.projects.id,
        name: schema.projects.name,
        projectType: schema.projects.projectType,
        budget: schema.projects.budget,
      })
        .from(schema.projects)
        .where(projectFilter)
        .orderBy(desc(schema.projects.createdAt))
        .limit(input.data.limit),
      db.select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        systemRole: schema.users.systemRole,
      })
        .from(schema.organizationMemberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
        .where(userFilter
          ? and(
              eq(schema.organizationMemberships.organizationId, context.organizationId),
              eq(schema.organizationMemberships.status, "active"),
              userFilter
            )
          : and(
              eq(schema.organizationMemberships.organizationId, context.organizationId),
              eq(schema.organizationMemberships.status, "active")
            ))
        .orderBy(desc(schema.users.createdAt))
        .limit(input.data.limit),
    ]);

    return { success: true, data: { clients: clientsList, projects: projectsList, users: usersList } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// QUICK TOOLS ACTIONS
// ----------------------------------------------------

export async function quickAddClient(name: string, industry: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, error: "Unauthorized." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    const input = z.object({ name: z.string().trim().min(1).max(255), industry: z.string().trim().max(255) })
      .safeParse({ name, industry });
    if (!input.success) return invalidInput(input.error);
    await db.insert(schema.clients).values({
      name: input.data.name,
      ownerId: null,
      organizationId: context.organizationId,
      details: JSON.stringify({ industry: input.data.industry })
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function quickAddProject(title: string, clientName: string, type: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, error: "Unauthorized." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };
    const input = z.object({
      title: z.string().trim().min(1).max(255),
      clientName: z.string().trim().min(1).max(255),
      type: z.enum(["Website", "Meta Ads", "Branding", "SEO", "Content"]),
    }).safeParse({ title, clientName, type });
    if (!input.success) return invalidInput(input.error);
    // Find client ID
    const clients = await db.select().from(schema.clients).where(and(
      eq(schema.clients.organizationId, context.organizationId),
      eq(schema.clients.name, input.data.clientName)
    )).limit(1);
    if (!clients.length) return { success: false, error: "Select a client from this organization." };
    const clientId = clients[0].id;
    
    // map type string to enum
    let dbType = "other";
    if (input.data.type === "Website") dbType = "web_dev";
    if (input.data.type === "Meta Ads") dbType = "meta_ads";

    await db.insert(schema.projects).values({
      name: input.data.title,
      clientName: input.data.clientName,
      clientId: clientId,
      organizationId: context.organizationId,
      projectType: dbType,
      leadId: session.id as number,
      status: "planning"
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function quickAddTimesheet(hours: number) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false };
    await db.insert(schema.timesheets).values({
      userId: session.id as number,
      description: "General billable work via Quick Tools",
      durationMinutes: hours * 60,
      date: new Date().toISOString().split("T")[0]
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function quickAddExpense(amount: number, description: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false };
    await db.insert(schema.expenses).values({
      userId: session.id as number,
      category: "other",
      amount,
      description
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ----------------------------------------------------
// FINANCE DASHBOARD ACTIONS
// ----------------------------------------------------

export async function getFinanceDashboardData() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, data: null };

    // Get Invoices
    const allInvoices = await db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt));

    // Map client names + the bill-to name saved in the invoice JSON payload.
    const invClientIds = Array.from(new Set(allInvoices.map(i => i.clientId).filter(Boolean))) as number[];
    const invClients = invClientIds.length > 0
      ? await db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(inArray(schema.clients.id, invClientIds))
      : [];
    const enrichedInvoices = allInvoices.map(inv => {
      let billToName = "";
      try { const p = JSON.parse(inv.notes || "{}"); billToName = p?.billTo?.name || ""; } catch {}
      const clientName = invClients.find(c => c.id === inv.clientId)?.name || billToName || "—";
      return { id: inv.id, invoiceNumber: inv.invoiceNumber, amount: inv.amount, status: inv.status, dueDate: inv.dueDate, clientName };
    });

    // Calculate Revenue (Paid invoices) and Pending AR (Sent/Overdue)
    let revenue = 0;
    let pendingAR = 0;
    allInvoices.forEach(inv => {
      if (inv.status === "paid") revenue += inv.amount;
      else if (inv.status === "sent" || inv.status === "overdue") pendingAR += inv.amount;
    });

    // Get Expenses
    const allExpenses = await db.select().from(schema.expenses);
    let approvedCosts = 0;
    const pendingExpenses = allExpenses.filter(e => e.status === "pending");
    allExpenses.forEach(e => {
      if (e.status === "approved") approvedCosts += e.amount;
    });

    // Get Timesheets (calculate cost using $25/hr default)
    const allTimesheets = await db.select().from(schema.timesheets);
    const HOURLY_RATE = 25;
    const pendingTimesheets = allTimesheets.filter(t => t.status === "pending");
    allTimesheets.forEach(t => {
      if (t.status === "approved") {
        const hours = t.durationMinutes / 60;
        approvedCosts += hours * HOURLY_RATE;
      }
    });

    // We fetch user names to map them onto the expenses/timesheets
    const users = await db.select(publicUserFields).from(schema.users);
    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<number, string>);

    const mappedPendingExpenses = pendingExpenses.map(e => ({
      ...e,
      userName: userMap[e.userId] || "Unknown User"
    }));

    const mappedPendingTimesheets = pendingTimesheets.map(t => ({
      ...t,
      userName: userMap[t.userId] || "Unknown User",
      cost: (t.durationMinutes / 60) * HOURLY_RATE
    }));

    // Build last-6-months chart data from real invoices + expenses
    const now = new Date();
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: d.toLocaleString("en", { month: "short" }), revenue: 0, costs: 0 };
    });
    allInvoices.forEach(inv => {
      if (inv.status !== "paid" || !inv.createdAt) return;
      const d = new Date(inv.createdAt);
      const mIdx = monthlyData.findIndex(m => {
        const base = new Date(now.getFullYear(), now.getMonth() - (5 - monthlyData.indexOf(m)), 1);
        return d.getFullYear() === base.getFullYear() && d.getMonth() === base.getMonth();
      });
      if (mIdx !== -1) monthlyData[mIdx].revenue += inv.amount;
    });
    allExpenses.forEach(e => {
      if (e.status !== "approved" || !e.createdAt) return;
      const d = new Date(e.createdAt);
      const mIdx = monthlyData.findIndex((m, i) => {
        const base = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return d.getFullYear() === base.getFullYear() && d.getMonth() === base.getMonth();
      });
      if (mIdx !== -1) monthlyData[mIdx].costs += e.amount;
    });

    return {
      success: true,
      data: {
        revenue,
        pendingAR,
        approvedCosts,
        margin: revenue - approvedCosts,
        invoices: enrichedInvoices.slice(0, 12),
        pendingExpenses: mappedPendingExpenses,
        pendingTimesheets: mappedPendingTimesheets,
        monthlyChart: monthlyData,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// DOCUMENT AND REPORT ACTIONS
// ----------------------------------------------------

export async function getDocuments() {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, data: [] };

    if (session.role === "client") return getClientDocuments();
    const context = await getOrganizationContext(session);
    if (!context) return { success: false, data: [] };
    let dbDocs;
    if (session.role === "admin") {
      dbDocs = await db.select().from(schema.documents)
        .where(eq(schema.documents.organizationId, context.organizationId))
        .orderBy(desc(schema.documents.createdAt));
    } else {
      const projectResult = await getProjects();
      const clientIds = Array.from(new Set((projectResult.data || []).map((p: any) => p.clientId).filter(Number.isInteger))) as number[];
      dbDocs = clientIds.length
        ? await db.select().from(schema.documents).where(and(
            eq(schema.documents.organizationId, context.organizationId),
            inArray(schema.documents.clientId, clientIds)
          )).orderBy(desc(schema.documents.createdAt))
        : [];
    }

    return { success: true, data: dbDocs };
  } catch (error: any) {
    console.error("getDocuments Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createDocument(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, error: "Unauthorized." };

    const name = formData.get("name") as string;
    const clientName = formData.get("clientName") as string;
    const type = formData.get("type") as string;
    const size = formData.get("size") as string;
    const folder = formData.get("folder") as string;
    const file = formData.get("file") as File | null;
    const membership = await getAdminOrganizationContext(session);
    if (!membership) return { success: false, error: "No active administrator membership." };

    let fileUrl: string | null = null;
    let finalSize = size || "1.0 MB";
    let finalName = name;

    if (file && typeof file === "object" && typeof file.arrayBuffer === "function") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const stored = await uploadPrivateFile({
        organizationId: membership.organizationId,
        ownerUserId: Number(session.id),
        data: buffer,
        fileName: file.name,
        mimeType: file.type,
      });
      await db.insert(schema.storageObjects).values({
        organizationId: membership.organizationId,
        objectKey: stored.key,
        bucket: process.env.OBJECT_STORAGE_BUCKET!,
        originalName: file.name.slice(0, 255),
        contentType: file.type,
        sizeBytes: stored.size,
        checksumSha256: stored.sha256,
        scanStatus: "clean",
        visibility: clientName ? "client" : "organization",
        entityType: "document",
        uploadedById: Number(session.id),
      });
      const [object] = await db
        .select({ id: schema.storageObjects.id })
        .from(schema.storageObjects)
        .where(eq(schema.storageObjects.objectKey, stored.key))
        .limit(1);
      if (!object) throw new Error("The uploaded object could not be registered.");
      fileUrl = `/api/files/${object.id}`;
      finalName = file.name;
      
      const szBytes = buffer.length;
      if (szBytes >= 1024 * 1024) {
        finalSize = `${(szBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        finalSize = `${(szBytes / 1024).toFixed(0)} KB`;
      }
    }

    if (!finalName || !folder) {
      return { success: false, error: "Name and folder are required." };
    }

    // Find client ID
    let clientId: number | null = null;
    if (clientName) {
      const clients = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.name, clientName),
            eq(schema.clients.organizationId, membership.organizationId)
          )
        );
      if (clients.length > 0) clientId = clients[0].id;
    }

    await db.insert(schema.documents).values({
      organizationId: membership.organizationId,
      name: finalName,
      clientId,
      clientName: clientName || null,
      type: type || (file ? file.name.split('.').pop()?.toUpperCase() : 'PDF') || "PDF",
      size: finalSize,
      folder,
      ownerName: (session as any).email ? (session as any).email.split("@")[0] : "Admin",
      url: fileUrl || (formData.get("url") as string) || null,
    });

    revalidateDocumentSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("createDocument Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteDocument(id: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const [document] = await db
      .select({ url: schema.documents.url })
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.organizationId, context.organizationId)))
      .limit(1);
    if (!document) return { success: false, error: "Document not found." };
    const objectIdMatch = document?.url?.match(/^\/api\/files\/([1-9]\d*)$/);
    if (objectIdMatch) {
      const [object] = await db
        .select()
        .from(schema.storageObjects)
        .where(eq(schema.storageObjects.id, Number(objectIdMatch[1])))
        .limit(1);
      if (object) {
        const [membership] = await db
          .select({ id: schema.organizationMemberships.id })
          .from(schema.organizationMemberships)
          .where(
            and(
              eq(
                schema.organizationMemberships.organizationId,
                object.organizationId
              ),
              eq(schema.organizationMemberships.userId, Number(session.id)),
              eq(schema.organizationMemberships.status, "active")
            )
          )
          .limit(1);
        if (!membership) return { success: false, error: "Forbidden." };
        await deletePrivateFile(object.objectKey);
        await db
          .update(schema.storageObjects)
          .set({ deletedAt: new Date() })
          .where(eq(schema.storageObjects.id, object.id));
      }
    }
    await db.delete(schema.documents).where(and(eq(schema.documents.id, id), eq(schema.documents.organizationId, context.organizationId)));

    revalidateDocumentSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("deleteDocument Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFolder(folderName: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    await db.delete(schema.documents).where(and(
      eq(schema.documents.organizationId, context.organizationId),
      eq(schema.documents.folder, folderName)
    ));

    revalidateDocumentSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("deleteFolder Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getReports() {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, data: [] };

    if (session.role === "client") return getClientReports();
    const docs = await getDocuments();
    const dbReports = (docs.data || []).filter((document: any) => document.folder === "Reports");

    return { success: true, data: dbReports };
  } catch (error: any) {
    console.error("getReports Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createReport(title: string, type: string, clientName: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, error: "Unauthorized." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const clients = clientName
      ? await db.select().from(schema.clients).where(and(
          eq(schema.clients.organizationId, context.organizationId),
          eq(schema.clients.name, clientName)
        )).limit(1)
      : [];
    const clientId = clients.length > 0 ? clients[0].id : null;

    await db.insert(schema.documents).values({
      organizationId: context.organizationId,
      name: title,
      clientId,
      clientName: clientName || null,
      type: "PDF",
      size: "0 KB",
      folder: "Reports",
      ownerName: "AI Analyst",
    });

    revalidateDocumentSurfaces();
    return { success: true };
  } catch (error: any) {
    console.error("createReport Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getReportsTrendAndAI() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) return { success: false, data: null };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: null, error: "No active administrator membership." };

    const [clientsList, projectsList, timesheetRows, teamResult] = await Promise.all([
      db.select().from(schema.clients).where(eq(schema.clients.organizationId, context.organizationId)),
      db.select().from(schema.projects).where(eq(schema.projects.organizationId, context.organizationId)),
      db.select({ timesheet: schema.timesheets }).from(schema.timesheets)
        .innerJoin(schema.organizationMemberships, eq(schema.organizationMemberships.userId, schema.timesheets.userId))
        .where(and(
          eq(schema.organizationMemberships.organizationId, context.organizationId),
          eq(schema.organizationMemberships.status, "active")
        )),
      getTeamUsers(),
    ]);
    const timesheetsList = timesheetRows.map(row => row.timesheet);
    const usersList = teamResult.data || [];

    // Compute real last-6-months trend from DB records
    const now = new Date();
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      const monthName = d.toLocaleString("en", { month: "short" });

      const clientsCount = clientsList.filter(c => c.createdAt && new Date(c.createdAt) < nextD).length;
      const projectsCount = projectsList.filter(p => p.createdAt && new Date(p.createdAt) < nextD).length;
      const hoursCount = timesheetsList
        .filter(t => t.createdAt && new Date(t.createdAt) >= d && new Date(t.createdAt) < nextD)
        .reduce((sum, t) => sum + Math.round((t.durationMinutes || 0) / 60), 0);

      return { month: monthName, clients: clientsCount, projects: projectsCount, hours: hoursCount };
    });

    // Compute metrics for live AI Summary
    const activeClientsCount = clientsList.filter(c => c.stage !== "churned").length;
    const activeProjects = projectsList.filter(p => !["completed", "cancelled", "archived"].includes(p.status));
    const totalMRR = activeProjects.reduce((sum, p) => sum + (p.monthlyFee || 0), 0);
    const totalAdSpend = activeProjects.reduce((sum, p) => sum + (p.adSpendBudget || 0), 0);

    // Calculate team allocation: find user with max hours in timesheets
    const userHours: Record<number, number> = {};
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    timesheetsList.filter(t => t.createdAt && new Date(t.createdAt) >= currentMonthStart).forEach(t => {
      userHours[t.userId] = (userHours[t.userId] || 0) + (t.durationMinutes / 60);
    });
    let maxUserId = -1;
    let maxHours = 0;
    Object.entries(userHours).forEach(([uid, hrs]) => {
      if (hrs > maxHours) {
        maxHours = hrs;
        maxUserId = parseInt(uid);
      }
    });

    const peakUser = usersList.find(u => u.id === maxUserId);
    const peakUserName = peakUser ? peakUser.name : "the team";
    const peakUserHoursPercent = maxHours > 0 ? Math.min(Math.round((maxHours / 160) * 100), 100) : 0;
    const totalHours = Object.values(userHours).reduce((sum, hours) => sum + hours, 0);
    const employeeCount = usersList.filter(user => user.role === "employee").length;
    const utilization = employeeCount > 0 ? Math.min(Math.round((totalHours / (employeeCount * 160)) * 100), 100) : 0;

    const dynamicDigest = 
      `**CRM OPERATING SUMMARY:**\n\n` +
      `• **Contracted work**: Active project monthly fees total **₹${totalMRR.toLocaleString()}** across **${activeClientsCount}** non-churned client records.\n` +
      `• **Managed media budgets**: Active project budget fields total **₹${totalAdSpend.toLocaleString()}**. This is planned budget, not provider-confirmed spend.\n` +
      `• **Recorded workload**: Timesheets represent **${utilization}%** of ${employeeCount * 160} available monthly team hours. ${peakUserName} has the highest recorded allocation at **${peakUserHoursPercent}%**.`;

    return {
      success: true,
      data: {
        monthlyData,
        aiSummary: dynamicDigest
      }
    };
  } catch (error: any) {
    console.error("getReportsTrendAndAI Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getClientDocuments() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "client" || !db) return { success: false, data: [] };

    const context = await getOrganizationContext(session);
    const clientId = await getOwnedClientId(session);
    if (!context || !clientId) return { success: true, data: [] };

    const dbDocs = await db.select()
      .from(schema.documents)
      .where(and(
        eq(schema.documents.organizationId, context.organizationId),
        eq(schema.documents.clientId, clientId)
      ))
      .orderBy(desc(schema.documents.createdAt));

    return { success: true, data: dbDocs };
  } catch (error: any) {
    console.error("getClientDocuments Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function getClientReports() {
  try {
    const res = await getClientDocuments();
    if (res.success && res.data) {
      const reportsList = res.data.filter((doc: any) => doc.folder === "Reports");
      return { success: true, data: reportsList };
    }
    return { success: false, data: [] };
  } catch (error: any) {
    console.error("getClientReports Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// The logged-in client's real invoices (with parsed line items for the portal).
export async function getClientInvoices() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "client") return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    const context = await getOrganizationContext(session);
    const clientId = await getOwnedClientId(session);
    if (!context || !clientId) return { success: true, data: [] };

    const rows = await db.select().from(schema.invoices)
      .where(and(eq(schema.invoices.organizationId, context.organizationId), eq(schema.invoices.clientId, clientId)))
      .orderBy(desc(schema.invoices.createdAt));

    const data = rows.map(inv => {
      let items: any[] = [];
      let payload: any = {};
      try { 
        payload = JSON.parse(inv.notes || "{}"); 
        if (Array.isArray(payload.items)) items = payload.items; 
      } catch {}
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        status: inv.status,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        createdAt: inv.createdAt,
        items,
        payload,
      };
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("getClientInvoices Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

// Generate a Razorpay payment link for one of the client's own invoices.
export async function getClientPaymentLink(invoiceId: number) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "client") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const context = await getOrganizationContext(session);
    const clientId = await getOwnedClientId(session);
    if (!context || !clientId) return { success: false, error: "Client not found." };

    const invRows = await db.select().from(schema.invoices).where(and(
      eq(schema.invoices.id, invoiceId),
      eq(schema.invoices.organizationId, context.organizationId),
      eq(schema.invoices.clientId, clientId)
    )).limit(1);
    if (!invRows.length) return { success: false, error: "Invoice not found." };
    const inv = invRows[0];
    if (inv.status === "paid") return { success: false, error: "This invoice is already paid." };

    const email = (session.email as string) || "";
    const res = await generatePaymentLink(inv.id, inv.amount, email, `Invoice ${inv.invoiceNumber}`);
    if ((res as any)?.success && (res as any).url) return { success: true, url: (res as any).url };
    return { success: false, error: (res as any)?.error || "Payment links are not enabled. Please contact us." };
  } catch (error: any) {
    console.error("getClientPaymentLink Error:", error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------
// AD CAMPAIGN & MOCK INTEGRATION ACTIONS
// ----------------------------------------------------

export async function getMetaCampaigns(projectId?: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    if (projectId && !(await canAccessProject(session, projectId))) return { success: false, data: [], error: "Forbidden." };
    let campaignsList;
    if (projectId) {
      campaignsList = await db.select().from(schema.metaCampaigns).where(eq(schema.metaCampaigns.projectId, projectId));
    } else if (session.role === "admin") {
      campaignsList = await db.select().from(schema.metaCampaigns);
    } else {
      const scoped = await getProjects();
      const projectIds = (scoped.data || []).map((project: any) => project.id);
      campaignsList = projectIds.length
        ? await db.select().from(schema.metaCampaigns).where(inArray(schema.metaCampaigns.projectId, projectIds))
        : [];
    }
    return { success: true, data: campaignsList };
  } catch (error: any) {
    console.error("getMetaCampaigns error:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createMetaCampaign(data: {
  name: string;
  clientName: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  roas: number;
  status: string;
}) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    // Look up client by name
    let projectId: number | null = null;
    const clientRecord = await db.select().from(schema.clients).where(eq(schema.clients.name, data.clientName));
    if (clientRecord.length > 0) {
      const projects = await db.select()
        .from(schema.projects)
        .where(and(
          eq(schema.projects.clientId, clientRecord[0].id),
          eq(schema.projects.projectType, "meta_ads")
        ));
      if (projects.length > 0) {
        projectId = projects[0].id;
      } else {
        const anyProjects = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientRecord[0].id));
        if (anyProjects.length > 0) {
          projectId = anyProjects[0].id;
        }
      }
    }

    const calculatedCtr = data.clicks > 0 && data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0.2;

    await db.insert(schema.metaCampaigns).values({
      projectId,
      name: data.name,
      platform: data.platform || "Meta Ads",
      spend: data.spend || 0,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      ctr: calculatedCtr,
      roas: data.roas || 0,
      status: data.status || "active",
    });

    revalidatePath("/admin/ads");
    return { success: true };
  } catch (error: any) {
    console.error("createMetaCampaign error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMetaCampaign(campaignId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.delete(schema.metaCampaigns).where(eq(schema.metaCampaigns.id, campaignId));

    revalidatePath("/admin/ads");
    return { success: true };
  } catch (error: any) {
    console.error("deleteMetaCampaign error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleMetaCampaignStatus(campaignId: number, status: "active" | "paused" | "draft") {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.metaCampaigns).set({ status }).where(eq(schema.metaCampaigns.id, campaignId));

    revalidatePath("/admin/ads");
    return { success: true };
  } catch (error: any) {
    console.error("toggleMetaCampaignStatus error:", error);
    return { success: false, error: error.message };
  }
}

export async function triggerMetaAPISync(projectId?: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    return { success: false, error: "No verified Meta Ads integration is configured. Synthetic metrics are disabled." };
  } catch (error: any) {
    console.error("triggerMetaAPISync error:", error);
    return { success: false, error: error.message };
  }
}

export async function triggerEmailNotification(recipient: string, subject: string, htmlContent: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    const input = z.object({
      recipient: z.email(),
      subject: z.string().trim().min(1).max(200),
      htmlContent: z.string().min(1).max(100_000),
    }).safeParse({ recipient, subject, htmlContent });
    if (!input.success) return invalidInput(input.error);
    const res = await sendEmail(input.data.recipient, input.data.subject, input.data.htmlContent);
    if (res.skipped) {
      console.warn(`[Email] SMTP not configured — email to ${recipient} skipped.`);
    }
    return { success: res.success, error: res.error };
  } catch (error: any) {
    console.error("triggerEmailNotification Error:", error);
    return { success: false, error: error.message };
  }
}

export async function simulateStripePayment(invoiceId: number) {
  if (!idSchema.safeParse(invoiceId).success) return { success: false, error: "Invalid invoice." };
  return { success: false, error: "Simulated payments are disabled. Payment state must come from a verified gateway webhook or an administrator." };
  /* Legacy implementation retained temporarily for UI compatibility; unreachable by design.
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };

    const invoiceList = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId));
    if (invoiceList.length === 0) return { success: false, error: "Invoice not found." };
    const invoice = invoiceList[0];

    await db.update(schema.invoices)
      .set({ 
        status: "paid", 
        paidDate: new Date().toISOString().split("T")[0] 
      })
      .where(eq(schema.invoices.id, invoiceId));

    await db.insert(schema.activityLog).values({
      userId: session.id as number,
      type: "payment",
      description: `Invoice #${invoice.invoiceNumber} (₹${invoice.amount}) was paid successfully via Stripe.`,
      targetType: "invoice",
      targetId: invoiceId,
    });

    const adminUsers = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(eq(schema.users.role, "admin"));
    for (const admin of adminUsers) {
      await db.insert(schema.notifications).values({
        userId: admin.id,
        type: "payment",
        title: "Payment Received",
        message: `Stripe Payment of ₹${invoice.amount} received for Invoice #${invoice.invoiceNumber}.`,
        link: `/admin/finance`,
      });
    }

    if (session.role === "client") {
      await db.insert(schema.notifications).values({
        userId: session.id as number,
        type: "payment",
        title: "Payment Successful",
        message: `Your payment of ₹${invoice.amount} for Invoice #${invoice.invoiceNumber} was processed successfully.`,
        link: `/client/invoices`,
      });
    }

    await triggerEmailNotification(
      String(session.email || "client@thepiecraft.com"),
      `Payment Receipt: Invoice #${invoice.invoiceNumber}`,
      `<h1>Thank you for your payment!</h1>
       <p>We received your payment of <strong>₹${invoice.amount}</strong> for Invoice #${invoice.invoiceNumber}.</p>
       <p>Status: Paid</p>`
    );

    revalidatePath("/admin/finance");
    revalidatePath("/client/invoices");
    return { success: true };
  } catch (error: any) {
    console.error("simulateStripePayment error:", error);
    return { success: false, error: error.message };
  }
  */
}

export async function signContractSOW(projectId: number, signatureDataUrl: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "client" || !db) return { success: false, error: "Unauthorized." };
    if (!(await canAccessProject(session, projectId))) return { success: false, error: "Forbidden." };
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signatureDataUrl) || signatureDataUrl.length > 1_500_000) {
      return { success: false, error: "Signature must be a PNG smaller than 1 MB." };
    }

    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const projectList = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (projectList.length === 0) return { success: false, error: "Project not found." };
    const project = projectList[0];
    if (!project.organizationId) {
      return { success: false, error: "Project organization is not configured." };
    }
    const stored = await uploadPrivateFile({
      organizationId: project.organizationId,
      ownerUserId: Number(session.id),
      data: buffer,
      fileName: `signature-project-${projectId}.png`,
      mimeType: "image/png",
    });
    await db.insert(schema.storageObjects).values({
      organizationId: project.organizationId,
      objectKey: stored.key,
      bucket: process.env.OBJECT_STORAGE_BUCKET!,
      originalName: `signature-project-${projectId}.png`,
      contentType: "image/png",
      sizeBytes: stored.size,
      checksumSha256: stored.sha256,
      scanStatus: "clean",
      visibility: "client",
      entityType: "project_signature",
      entityId: projectId,
      uploadedById: Number(session.id),
    });
    const [object] = await db
      .select({ id: schema.storageObjects.id })
      .from(schema.storageObjects)
      .where(eq(schema.storageObjects.objectKey, stored.key))
      .limit(1);
    if (!object) throw new Error("The signed document could not be registered.");
    const sigUrl = `/api/files/${object.id}`;

    await db.update(schema.projects)
      .set({ contractLink: sigUrl })
      .where(eq(schema.projects.id, projectId));

    await db.insert(schema.documents).values({
      organizationId: project.organizationId,
      name: `${project.name} — Signed SOW.png`,
      clientId: project.clientId ?? undefined,
      clientName: project.clientName ?? undefined,
      type: "PNG",
      size: `${(buffer.length / 1024).toFixed(1)} KB`,
      folder: "Contracts",
      ownerName: String(session.name || "System"),
      url: sigUrl,
    });

    const adminUsers = await db.select({ id: schema.users.id })
      .from(schema.organizationMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
      .where(and(
        eq(schema.organizationMemberships.organizationId, project.organizationId),
        eq(schema.organizationMemberships.status, "active"),
        eq(schema.users.role, "admin")
      ));
    for (const admin of adminUsers) {
      await db.insert(schema.notifications).values({
        userId: admin.id,
        type: "contract",
        title: "Contract Signed",
        message: `SOW for project "${project.name}" has been signed by the client.`,
        link: `/admin/documents`,
      });
    }

    revalidateDocumentSurfaces();
    revalidateProjectSurfaces();
    return { success: true, contractLink: sigUrl };
  } catch (error: any) {
    console.error("signContractSOW error:", error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeads() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: [] };
    if (!db) return { success: false, data: [] };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [] };
    const rows = await db.select().from(schema.leads)
      .where(eq(schema.leads.organizationId, context.organizationId))
      .orderBy(desc(schema.leads.createdAt));
    return { success: true, data: rows };
  } catch (error: any) {
    console.error("getLeads Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createLead(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const name = (formData.get("name") as string || "").trim();
    if (!name) return { success: false, error: "Company/lead name is required." };

    const assignedTo = formData.get("assignedTo") ? Number(formData.get("assignedTo")) : null;
    if (assignedTo && !(await isActiveOrganizationUser(context.organizationId, assignedTo, ["admin", "employee"]))) {
      return { success: false, error: "Select an active teammate from this organization." };
    }

    await db.insert(schema.leads).values({
      organizationId: context.organizationId,
      name,
      contactName: (formData.get("contactName") as string) || null,
      contactPhone: (formData.get("contactPhone") as string) || null,
      contactEmail: (formData.get("contactEmail") as string) || null,
      source: (formData.get("source") as string) || null,
      service: (formData.get("service") as string) || null,
      stage: (formData.get("stage") as string) || "new",
      estimatedValue: Number(formData.get("estimatedValue") || 0),
      notes: (formData.get("notes") as string) || null,
      assignedTo: assignedTo || null,
      followUpDate: (formData.get("followUpDate") as string) || null,
    });

    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: any) {
    console.error("createLead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLead(id: number, formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const assignedTo = formData.get("assignedTo") ? Number(formData.get("assignedTo")) : null;
    if (assignedTo && !(await isActiveOrganizationUser(context.organizationId, assignedTo, ["admin", "employee"]))) {
      return { success: false, error: "Select an active teammate from this organization." };
    }

    await db.update(schema.leads).set({
      name: (formData.get("name") as string)?.trim(),
      contactName: (formData.get("contactName") as string) || null,
      contactPhone: (formData.get("contactPhone") as string) || null,
      contactEmail: (formData.get("contactEmail") as string) || null,
      source: (formData.get("source") as string) || null,
      service: (formData.get("service") as string) || null,
      stage: (formData.get("stage") as string) || "new",
      estimatedValue: Number(formData.get("estimatedValue") || 0),
      notes: (formData.get("notes") as string) || null,
      assignedTo: assignedTo || null,
      followUpDate: (formData.get("followUpDate") as string) || null,
    }).where(and(eq(schema.leads.id, id), eq(schema.leads.organizationId, context.organizationId)));

    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: any) {
    console.error("updateLead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function moveLeadStage(id: number, stage: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    await db.update(schema.leads).set({ stage }).where(and(eq(schema.leads.id, id), eq(schema.leads.organizationId, context.organizationId)));
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: any) {
    console.error("moveLeadStage Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteLead(id: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    await db.delete(schema.leads).where(and(eq(schema.leads.id, id), eq(schema.leads.organizationId, context.organizationId)));
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: any) {
    console.error("deleteLead Error:", error);
    return { success: false, error: error.message };
  }
}

export async function convertLeadToClient(id: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, error: "No active administrator membership." };

    const [lead] = await db.select().from(schema.leads).where(and(
      eq(schema.leads.id, id),
      eq(schema.leads.organizationId, context.organizationId)
    )).limit(1);
    if (!lead) return { success: false, error: "Lead not found." };

    const details = JSON.stringify({
      contactName: lead.contactName || "",
      contactEmail: lead.contactEmail || "",
      contactPhone: lead.contactPhone || "",
      services: lead.service || "",
      accountManager: lead.assignedTo ? String(lead.assignedTo) : "",
    });

    const [result] = await db.insert(schema.clients).values({
      name: lead.name,
      ownerId: null,
      organizationId: context.organizationId,
      stage: "discovery",
      details,
    });

    await db.update(schema.leads).set({ stage: "won" }).where(and(eq(schema.leads.id, id), eq(schema.leads.organizationId, context.organizationId)));

    revalidatePath("/admin/leads");
    revalidatePath("/admin/clients");
    return { success: true, clientId: (result as any).insertId };
  } catch (error: any) {
    console.error("convertLeadToClient Error:", error);
    return { success: false, error: error.message };
  }
}



export async function generatePaymentLink(invoiceId: number, amount: number, clientEmail: string, description: string) {
  const session = await getAuthSession();
  if (!session || !db) return { success: false, error: "Unauthorized." };
  const context = await getOrganizationContext(session);
  if (!context) return { success: false, error: "No active organization membership." };
  const [invoice] = await db.select().from(schema.invoices).where(and(
    eq(schema.invoices.id, invoiceId),
    eq(schema.invoices.organizationId, context.organizationId)
  )).limit(1);
  if (!invoice || invoice.status === "paid" || invoice.amount <= 0) return { success: false, error: "Invoice is not payable." };
  if (session.role === "client") {
    const clientId = await getOwnedClientId(session);
    if (!clientId || invoice.clientId !== clientId) return { success: false, error: "Invoice not found." };
  } else if (session.role !== "admin") {
    return { success: false, error: "Forbidden." };
  }
  amount = invoice.amount;
  clientEmail = String(clientEmail || session.email || "").trim();
  description = `Invoice ${invoice.invoiceNumber}`;
  let settings: any = null;
  if (db) {
    try {
      settings = await db.query.agencySettings.findFirst();
    } catch (e) {
      // ignore
    }
  }

  const keyId = settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { success: false, error: "Razorpay is not configured." };
  }

  try {
    const rzp = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const paymentLink = await rzp.paymentLink.create({
      amount: amount * 100, 
      currency: "INR",
      accept_partial: false,
      description: description,
      customer: {
        email: clientEmail,
      },
      notify: {
        sms: false,
        email: true,
      },
      reminder_enable: true,
      notes: {
        invoice_id: invoiceId.toString(),
      },
    });

    return { success: true, url: paymentLink.short_url };
  } catch (error: any) {
    console.error("Razorpay error:", error);
    return { success: false, error: "Failed to generate payment link via Razorpay." };
  }
}

// Agency profile + invoice defaults for the invoice generator (admin only).
export async function getInvoiceSettings() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: null };
    if (!db) return { success: false, data: null };
    const s: any = await db.query.agencySettings.findFirst();
    if (!s) return { success: true, data: null };
    return {
      success: true,
      data: {
        agencyName: s.agencyName || "ThePieCraft Marketing",
        agencyEmail: s.agencyEmail || "",
        agencyPhone: s.agencyPhone || "",
        agencyWebsite: s.agencyWebsite || "",
        agencyAddress: s.agencyAddress || "",
        gstNumber: s.gstNumber || "",
        agencyLogoUrl: s.agencyLogoUrl || "",
        invoiceTaxPercent: s.invoiceTaxPercent ?? 0,
        invoicePaymentTerms: s.invoicePaymentTerms || "",
        invoiceNotes: s.invoiceNotes || "",
        bankDetails: s.bankDetails || "",
      },
    };
  } catch (err: any) {
    console.error("getInvoiceSettings error:", err?.message);
    return { success: false, data: null };
  }
}

export async function getAgencySettings() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const settings = await db.query.agencySettings.findFirst();
    if (!settings) return { success: true, data: null };
    const { razorpayKeySecret, smtpPass, ...safeSettings } = settings;
    return {
      success: true,
      data: {
        ...safeSettings,
        razorpayKeySecret: razorpayKeySecret ? "••••••••" : "",
        smtpPass: smtpPass ? "••••••••" : "",
        hasRazorpaySecret: !!razorpayKeySecret,
        hasSmtpPassword: !!smtpPass,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAgencySettings(data: Partial<typeof schema.agencySettings.$inferInsert>) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const allowedKeys = [
      "agencyName", "agencyLogoUrl", "baseCurrency", "agencyEmail", "agencyPhone",
      "agencyWebsite", "agencyAddress", "gstNumber", "invoiceTaxPercent",
      "invoicePaymentTerms", "invoiceNotes", "bankDetails", "razorpayKeyId",
      "razorpayKeySecret", "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom",
    ] as const;
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      const value = data[key];
      if (value === undefined) continue;
      if ((key === "razorpayKeySecret" || key === "smtpPass") && (value === "••••••••" || value === "")) continue;
      sanitized[key] = typeof value === "string" ? value.trim() : value;
    }
    if (Object.keys(sanitized).length === 0) return { success: false, error: "No valid settings supplied." };

    const settings = await db.query.agencySettings.findFirst();
    if (settings) {
      await db.update(schema.agencySettings).set(sanitized as any).where(eq(schema.agencySettings.id, settings.id));
    } else {
      await db.insert(schema.agencySettings).values(sanitized as any);
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function clearAllData() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.transaction(async (tx) => {
      const adminRowsBefore = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));
      if (adminRowsBefore.length === 0) {
        throw new Error("Cleanup refused because no administrator exists.");
      }
      const adminIds = adminRowsBefore.map((row) => row.id);
      const [organizationRowsBefore, settingsRowsBefore, adminMembershipRowsBefore] = await Promise.all([
        tx.select({ id: schema.organizations.id }).from(schema.organizations),
        tx.select({ id: schema.agencySettings.id }).from(schema.agencySettings),
        tx.select({ id: schema.organizationMemberships.id })
          .from(schema.organizationMemberships)
          .where(inArray(schema.organizationMemberships.userId, adminIds)),
      ]);

      const nonAdminRows = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(or(eq(schema.users.role, "employee"), eq(schema.users.role, "client")));
      const nonAdminIds = nonAdminRows.map((row) => row.id);

      // Remove every operational table in FK-safe child-first order. DELETE is
      // intentional: unlike TRUNCATE, it remains covered by this transaction.
      await tx.delete(schema.importRows);
      await tx.delete(schema.importJobs);
      await tx.delete(schema.automationRuns);
      await tx.delete(schema.customFieldValues);
      await tx.delete(schema.attributionTouchpoints);
      await tx.delete(schema.accountContacts);
      await tx.delete(schema.aiChatMessages);
      await tx.delete(schema.attendanceLogs);

      await tx.delete(schema.notifications);
      await tx.delete(schema.activityLog);
      await tx.delete(schema.messages);
      await tx.delete(schema.tasks);
      await tx.delete(schema.timesheets);
      await tx.delete(schema.metaCampaigns);
      await tx.delete(schema.invoices);
      await tx.delete(schema.documents);
      await tx.delete(schema.expenses);
      await tx.delete(schema.attendance);
      await tx.delete(schema.leaves);
      await tx.delete(schema.aiChats);

      await tx.delete(schema.projects);
      await tx.delete(schema.leads);
      await tx.delete(schema.clients);
      await tx.delete(schema.deals);
      await tx.delete(schema.contacts);
      await tx.delete(schema.accounts);
      await tx.delete(schema.dealStages);
      await tx.delete(schema.customFieldDefinitions);
      await tx.delete(schema.automationDefinitions);
      await tx.delete(schema.auditEvents);
      await tx.delete(schema.connectorAccounts);
      await tx.delete(schema.webhookEventLedger);
      await tx.delete(schema.storageObjects);
      await tx.delete(schema.locations);

      // Identity-scoped security records are removed only for identities being
      // deleted. Administrator users, MFA, sessions, tokens, and memberships
      // remain intact.
      if (nonAdminIds.length > 0) {
        await tx.delete(schema.loginLinks).where(or(
          inArray(schema.loginLinks.userId, nonAdminIds),
          inArray(schema.loginLinks.createdById, nonAdminIds)
        ));
        await tx.delete(schema.userSessions).where(inArray(schema.userSessions.userId, nonAdminIds));
        await tx.delete(schema.mfaFactors).where(inArray(schema.mfaFactors.userId, nonAdminIds));
        await tx.delete(schema.fcmTokens).where(inArray(schema.fcmTokens.userId, nonAdminIds));
        await tx.delete(schema.organizationMemberships).where(inArray(schema.organizationMemberships.userId, nonAdminIds));
        await tx.update(schema.organizationMemberships)
          .set({ invitedById: null })
          .where(inArray(schema.organizationMemberships.invitedById, nonAdminIds));
      }

      await tx.delete(schema.users).where(or(
        eq(schema.users.role, "employee"),
        eq(schema.users.role, "client")
      ));

      const adminRowsAfter = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));
      const [organizationRowsAfter, settingsRowsAfter, adminMembershipRowsAfter] = await Promise.all([
        tx.select({ id: schema.organizations.id }).from(schema.organizations),
        tx.select({ id: schema.agencySettings.id }).from(schema.agencySettings),
        tx.select({ id: schema.organizationMemberships.id })
          .from(schema.organizationMemberships)
          .where(inArray(schema.organizationMemberships.userId, adminIds)),
      ]);
      const [remainingNonAdmins] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .where(or(eq(schema.users.role, "employee"), eq(schema.users.role, "client")));
      const [remainingOperational] = await tx.select({
        clients: sql<number>`(select count(*) from ${schema.clients})`,
        projects: sql<number>`(select count(*) from ${schema.projects})`,
        tasks: sql<number>`(select count(*) from ${schema.tasks})`,
        invoices: sql<number>`(select count(*) from ${schema.invoices})`,
        messages: sql<number>`(select count(*) from ${schema.messages})`,
        attendance: sql<number>`(select count(*) from ${schema.attendance})`,
        leads: sql<number>`(select count(*) from ${schema.leads})`,
        accounts: sql<number>`(select count(*) from ${schema.accounts})`,
        contacts: sql<number>`(select count(*) from ${schema.contacts})`,
        deals: sql<number>`(select count(*) from ${schema.deals})`,
        auditEvents: sql<number>`(select count(*) from ${schema.auditEvents})`,
        storageObjects: sql<number>`(select count(*) from ${schema.storageObjects})`,
        importJobs: sql<number>`(select count(*) from ${schema.importJobs})`,
      }).from(schema.users).limit(1);

      const adminsBefore = adminRowsBefore.map((row) => row.id).sort((a, b) => a - b);
      const adminsAfter = adminRowsAfter.map((row) => row.id).sort((a, b) => a - b);
      const sameIds = (before: { id: number }[], after: { id: number }[]) => {
        const beforeIds = before.map((row) => row.id).sort((a, b) => a - b);
        const afterIds = after.map((row) => row.id).sort((a, b) => a - b);
        return beforeIds.length === afterIds.length &&
          beforeIds.every((id, index) => id === afterIds[index]);
      };
      const adminsPreserved = adminsBefore.length === adminsAfter.length &&
        adminsBefore.every((id, index) => id === adminsAfter[index]);
      const protectedRowsPreserved =
        sameIds(organizationRowsBefore, organizationRowsAfter) &&
        sameIds(settingsRowsBefore, settingsRowsAfter) &&
        sameIds(adminMembershipRowsBefore, adminMembershipRowsAfter);
      const operationalRowsRemain = Object.values(remainingOperational || {})
        .some((count) => Number(count) !== 0);

      if (!adminsPreserved || !protectedRowsPreserved || Number(remainingNonAdmins?.count || 0) !== 0 || operationalRowsRemain) {
        throw new Error("Cleanup verification failed.");
      }
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    console.error("clearAllData failed; transaction rolled back.");
    return { success: false, error: "Cleanup failed. No partial cleanup was committed." };
  }
}

export async function getAuditLogs() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin" || !db) {
      return { success: false, data: [], error: "Unauthorized" };
    }
    const context = await getAdminOrganizationContext(session);
    if (!context) return { success: false, data: [], error: "No active admin context" };

    const logs = await db
      .select({
        id: schema.auditEvents.id,
        action: schema.auditEvents.action,
        entityType: schema.auditEvents.entityType,
        entityId: schema.auditEvents.entityId,
        metadata: schema.auditEvents.metadata,
        createdAt: schema.auditEvents.createdAt,
        actorId: schema.auditEvents.actorUserId,
        actorName: schema.users.name,
        actorEmail: schema.users.email,
      })
      .from(schema.auditEvents)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditEvents.actorUserId))
      .where(eq(schema.auditEvents.organizationId, context.organizationId))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(100);

    return { success: true, data: logs };
  } catch (error: any) {
    console.error("getAuditLogs error:", error);
    return { success: false, data: [], error: error?.message || "Failed to fetch audit logs" };
  }
}

export async function sendInvoiceReminder(invoiceId: number) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized" };

    const [invoice] = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, invoiceId))
      .limit(1);

    if (!invoice) return { success: false, error: "Invoice not found." };

    let phone = "";
    let clientName = "Valued Client";
    if (invoice.clientId) {
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, invoice.clientId))
        .limit(1);
      if (client) {
        clientName = client.name || clientName;
        try {
          const parsed = JSON.parse(client.details || "{}");
          phone = parsed.phone || parsed.contactPhone || "";
        } catch {}
      }
    }

    const msg = `Hello ${clientName}, reminder from ThePieCraft: Invoice #${invoice.invoiceNumber} for ₹${invoice.amount.toLocaleString()} is due on ${invoice.dueDate || "receipt"}. Please make payment promptly. Thank you!`;

    const smsRes = await sendSmsWhatsAppNotification({
      to: phone || "+15550000000",
      message: msg,
    });

    if (invoice.clientId) {
      const [clientUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(eq(schema.users.role, "client"), eq(schema.users.id, invoice.clientId)))
        .limit(1);
      if (clientUser) {
        await createNotification(clientUser.id, "invoice_reminder", `Invoice #${invoice.invoiceNumber} Payment Reminder`, msg, `/client/invoices`);
      }
    }

    return { success: true, provider: smsRes.provider };
  } catch (error: any) {
    console.error("sendInvoiceReminder error:", error);
    return { success: false, error: error?.message || "Failed to send invoice reminder" };
  }
}
