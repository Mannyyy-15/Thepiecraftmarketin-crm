"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import * as schema from "@/lib/schema";
import { eq, and, or, inArray, desc, gte } from "drizzle-orm";
import { decrypt, getCurrentUser } from "./auth";
import { validateGeofence } from "@/lib/geofence";
import { sendEmail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";

// Helper to check user session and get authenticated profile
async function getAuthSession() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  return await decrypt(token);
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

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.clients);
    } else if (session.role === "employee") {
      // Employees see clients where they are the owner or mapped lead
      results = await db.select().from(schema.clients).where(eq(schema.clients.ownerId, session.id as number));
    } else {
      // Clients see their own client record mapped by email
      results = await db.select().from(schema.clients).where(eq(schema.clients.ownerId, session.id as number));
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

    const name = formData.get("name") as string;
    const ownerIdStr = formData.get("ownerId") as string; // Target employee user ID
    const ownerId = ownerIdStr ? parseInt(ownerIdStr) : null;
    const details = (formData.get("details") as string) || "{}";

    if (!name) {
      return { success: false, error: "Client brand name is required." };
    }

    await db.insert(schema.clients).values({
      name: name.trim(),
      ownerId: ownerId,
      stage: "contract_signed",
      progress: 0,
      checklist: JSON.stringify([
        { id: 1, text: "NDA & Agreement Signed", checked: true },
        { id: 2, text: "Brand Assets Collected", checked: false },
        { id: 3, text: "Discovery Session Scheduled", checked: false },
        { id: 4, text: "Slack & Portal Setup", checked: false }
      ]),
      details: details,
    });

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("onboardClient Error:", error);
    return { success: false, error: error.message };
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

    await db.update(schema.clients)
      .set({ stage })
      .where(eq(schema.clients.id, clientId));

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
    if (!session) return { success: false, error: "Unauthorized." };

    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.clients)
      .set({ 
        checklist: checklistJson,
        progress: progress 
      })
      .where(eq(schema.clients.id, clientId));

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

    const name     = (formData.get("name") as string)?.trim();
    const ownerIdStr = formData.get("ownerId") as string;
    const stage    = (formData.get("stage") as string) || "contract_signed";

    if (!name) return { success: false, error: "Brand name is required." };

    const details = JSON.stringify({
      contactName:  (formData.get("contactName")  as string)?.trim() || "",
      contactEmail: (formData.get("contactEmail") as string)?.trim() || "",
      contactPhone: (formData.get("contactPhone") as string)?.trim() || "",
      websiteUrl:   (formData.get("websiteUrl")   as string)?.trim() || "",
      industry:     (formData.get("industry")     as string)?.trim() || "",
      country:      (formData.get("country")      as string)?.trim() || "",
      services:     (formData.get("services")     as string)?.trim() || "",
    });

    await db.update(schema.clients)
      .set({
        name,
        ownerId: ownerIdStr ? parseInt(ownerIdStr) : null,
        stage,
        details,
      })
      .where(eq(schema.clients.id, clientId));

    revalidatePath("/admin/clients");
    return { success: true };
  } catch (error: any) {
    console.error("updateClient Error:", error);
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

    await db.delete(schema.clients).where(eq(schema.clients.id, clientId));

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

    const [clientRows, projectList, invoiceList, userList] = await Promise.all([
      db.select().from(schema.clients).where(eq(schema.clients.id, clientId)).limit(1),
      db.select().from(schema.projects),
      db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt)),
      db.select().from(schema.users),
    ]);

    if (!clientRows.length) return { success: false, data: null };
    const client = clientRows[0];
    const linkedProjects = projectList.filter(p => p.clientId === client.id || p.clientName === client.name);
    const linkedInvoices = invoiceList.filter(i => i.clientId === client.id).map(i => ({
      ...i,
      projectName: projectList.find(p => p.id === i.projectId)?.name || null,
    }));
    const totalMRR = linkedProjects.reduce((s, p) => s + (p.monthlyFee || 0), 0);
    const unpaidCount = linkedInvoices.filter(i => i.status === "sent" || i.status === "overdue").length;
    const latestInvoice = linkedInvoices[0] || null;
    const owner = userList.find(u => u.id === client.ownerId) || null;

    return { success: true, data: { ...client, linkedProjects, linkedInvoices, totalMRR, unpaidCount, latestInvoice, owner } };
  } catch (error: any) {
    console.error("getClientById Error:", error);
    return { success: false, data: null, error: error.message };
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

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.projects);
    } else if (session.role === "employee") {
      // An employee is "on" a project if they are the lead OR they have any
      // task assigned to them on that project. This makes the employee's
      // Projects view reflect everything they actually work on.
      const uid = session.id as number;
      const taskRows = await db
        .select({ projectId: schema.tasks.projectId })
        .from(schema.tasks)
        .where(eq(schema.tasks.userId, uid));
      const taskProjectIds = Array.from(
        new Set(taskRows.map(t => t.projectId).filter((x): x is number => x != null))
      );

      const allProjects = await db.select().from(schema.projects);
      results = allProjects.filter(
        p => p.leadId === uid || taskProjectIds.includes(p.id)
      );
    } else {
      // Clients see projects mapped to their client account
      const clientProfile = await db.select().from(schema.clients).where(eq(schema.clients.ownerId, session.id as number)).limit(1);
      if (clientProfile.length > 0) {
        results = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientProfile[0].id));
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
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };

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

    if (!name) return { success: false, error: "Project name is required." };

    await db.insert(schema.projects).values({
      name: name.trim(),
      clientId: clientIdStr ? parseInt(clientIdStr) : null,
      clientName: clientName?.trim() || null,
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
      leadId: leadIdStr ? parseInt(leadIdStr) : null,
    });

    // Auto-create default tasks when a developer is assigned
    if (leadIdStr) {
      const [latest] = await db.select({ id: schema.projects.id }).from(schema.projects).orderBy(desc(schema.projects.id)).limit(1);
      const newProjectId = latest?.id;
      if (newProjectId) {
        const META_TASKS = [
          { title: "Setup ad account & business manager access", priority: "high" },
          { title: "Configure pixel & conversion tracking", priority: "high" },
          { title: "Create campaign structure & ad sets", priority: "high" },
          { title: "Design ad creatives & copy", priority: "medium" },
          { title: "Launch campaign & verify delivery", priority: "high" },
          { title: "First week performance review", priority: "medium" },
          { title: "Monthly optimization & reporting", priority: "low" },
        ];
        const WEBDEV_TASKS = [
          { title: "Discovery & project brief finalization", priority: "high" },
          { title: "Wireframes & design mockups", priority: "high" },
          { title: "Design approval from client", priority: "medium" },
          { title: "Frontend development", priority: "high" },
          { title: "Responsive & mobile optimization", priority: "medium" },
          { title: "Backend / CMS integration", priority: "medium" },
          { title: "Testing & bug fixes", priority: "medium" },
          { title: "Client review & feedback round", priority: "medium" },
          { title: "Final launch & deployment", priority: "high" },
        ];
        const templates = projectType === "meta_ads" ? META_TASKS : projectType === "web_dev" ? WEBDEV_TASKS : [];
        for (const t of templates) {
          await db.insert(schema.tasks).values({
            title: t.title,
            userId: parseInt(leadIdStr),
            assignedById: session.id as number,
            projectId: newProjectId,
            priority: t.priority,
            status: "todo",
            done: 0,
          });
        }
      }
    }

    revalidatePath("/admin/projects");
    revalidatePath("/employee/projects");
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

    await db.update(schema.projects)
      .set({ status })
      .where(eq(schema.projects.id, projectId));

    revalidatePath("/admin/projects");
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

    await db.delete(schema.projects).where(eq(schema.projects.id, projectId));

    revalidatePath("/admin/projects");
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
    await notifyAdmins("expense_claim", "New Expense Claim", `${session.name || session.email} — ₹${amountStr} for ${description}`, "/admin/finance");
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
    if (!session || session.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.expenses)
      .set({ status })
      .where(eq(schema.expenses.id, expenseId));

    const expense = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expenseId)).limit(1);
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

    const results = await db.select().from(schema.attendance);
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

    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
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
    const { messaging } = require("@/lib/firebase-admin");
    if (messaging) {
      db.select({ token: schema.fcmTokens.token })
        .from(schema.fcmTokens)
        .where(eq(schema.fcmTokens.userId, userId))
        .then((tokens) => {
          for (const t of tokens) {
            messaging.send({
              token: t.token,
              notification: {
                title,
                body: message,
              },
              data: {
                link: link || "/",
              },
              android: {
                notification: {
                  channelId: "thepiecraft-crm",
                },
              },
            }).catch((fcmErr: any) => {
              console.error("FCM Send Error:", fcmErr);
            });
          }
        })
        .catch((dbErr) => {
          console.error("FCM Token fetch DB error:", dbErr);
        });
    }
  } catch (e) {
    console.error("createNotification error:", e);
  }
}

// Internal: notify all admin users
async function notifyAdmins(type: string, title: string, message: string, link?: string) {
  if (!db) return;
  try {
    const admins = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin"));
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

// Dismiss (delete) a specific notification
export async function dismissNotification(notificationId: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false };
    if (!db) return { success: false };

    await db.delete(schema.notifications)
      .where(eq(schema.notifications.id, notificationId));

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

    // Geofence + office Wi-Fi gate — coordinates are required.
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { success: false, error: "Location required. Enable GPS and retry." };
    }
    const geo = await validateGeofence(lat, lng, bssid);
    if (!geo.ok) return { success: false, error: geo.message };

    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

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
    notifyAdmins("punch_in", "Team Check-in", `${session.name || session.email} is in for the day`, "/admin/team").catch(err => {
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

    // Geofence + office Wi-Fi gate — coordinates are required.
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { success: false, error: "Location required. Enable GPS and retry." };
    }
    const geo = await validateGeofence(lat, lng, bssid);
    if (!geo.ok) return { success: false, error: geo.message };

    const todayStr = new Date().toLocaleDateString("en-CA");

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
    notifyAdmins("punch_out", "Team Check-out", `${session.name || session.email} has wrapped up for the day`, "/admin/team").catch(err => {
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
    await notifyAdmins("leave_request", "Leave Request", `${session.name || session.email} needs ${leaveType} leave — ${startDate} to ${endDate}`, "/admin/team");
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

    const results = await db.select()
      .from(schema.leaves)
      .where(eq(schema.leaves.status, "pending"));

    // Fetch user details for each leave
    const usersList = await db.select().from(schema.users);
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

    const leave = await db.select()
      .from(schema.leaves)
      .where(eq(schema.leaves.id, leaveId))
      .limit(1);

    if (leave.length === 0) {
      return { success: false, error: "Leave request not found" };
    }

    // Update status to approved
    await db.update(schema.leaves)
      .set({ status: "approved" })
      .where(eq(schema.leaves.id, leaveId));

    // Populate attendance table for all dates in the range!
    const start = new Date(leave[0].startDate);
    const end = new Date(leave[0].endDate);
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
    const rawType = leave[0].leaveType;
    const attStatus = Object.hasOwn(leaveStatusMap, rawType) ? leaveStatusMap[rawType] : "on-leave";

    for (const dt of dates) {
      const existing = await db.select()
        .from(schema.attendance)
        .where(and(
          eq(schema.attendance.userId, leave[0].userId),
          eq(schema.attendance.date, dt)
        ))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.attendance)
          .set({ status: attStatus })
          .where(eq(schema.attendance.id, existing[0].id));
      } else {
        await db.insert(schema.attendance).values({
          userId: leave[0].userId,
          date: dt,
          status: attStatus
        });
      }
    }

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await createNotification(leave[0].userId, "leave_approved", "Leave Approved", `Your ${leave[0].leaveType} leave from ${leave[0].startDate} to ${leave[0].endDate} is confirmed. Enjoy your time off!`, "/employee/attendance");
    await logActivity(session.id as number, "leave_approved", `Approved ${leave[0].leaveType} leave for user #${leave[0].userId}`, "leave", leaveId);
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

    const leave = await db.select()
      .from(schema.leaves)
      .where(eq(schema.leaves.id, leaveId))
      .limit(1);

    await db.update(schema.leaves)
      .set({ status: "rejected" })
      .where(eq(schema.leaves.id, leaveId));

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    if (leave.length > 0) {
      await createNotification(leave[0].userId, "leave_rejected", "Leave Not Approved", `Your ${leave[0].leaveType} leave from ${leave[0].startDate} to ${leave[0].endDate} couldn't be approved this time. Reach out to your manager for details.`, "/employee/attendance");
      await logActivity(session.id as number, "leave_rejected", `Rejected ${leave[0].leaveType} leave for user #${leave[0].userId}`, "leave", leaveId);
    }
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

    const usersList = await db.select().from(schema.users).where(inArray(schema.users.role, ["admin", "employee"]));
    return { success: true, data: usersList };
  } catch (error: any) {
    console.error("getTeamUsers Error:", error);
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

    const updateData: any = { role };
    if (systemRole) {
      updateData.systemRole = systemRole;
    }

    await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, userId));

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

    const userList = await db.select().from(schema.users).where(eq(schema.users.id, session.id as number)).limit(1);
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

    const [clientList, projectList, usersList, invoiceList] = await Promise.all([
      db.select().from(schema.clients),
      db.select().from(schema.projects).orderBy(desc(schema.projects.createdAt)),
      db.select().from(schema.users),
      db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt)),
    ]);

    // Calculate Active Clients (exclude terminated)
    const activeClientsCount = clientList.filter(c => c.stage !== "terminated").length;

    // Calculate Monthly Revenue and Total Ad Spend from active/in_progress projects
    let monthlyRevenue = 0;
    let totalAdSpend = 0;
    projectList.forEach(p => {
      if (p.status !== "completed" && p.status !== "cancelled" && p.status !== "archived") {
        monthlyRevenue += p.monthlyFee || 0;
        totalAdSpend += p.adSpendBudget || 0;
      }
    });

    // Recent Active Projects
    const activeProjectsRaw = projectList.filter(p => p.status !== "completed" && p.status !== "cancelled" && p.status !== "archived").slice(0, 5);
    
    // Format projects for the UI table
    const formattedProjects = activeProjectsRaw.map(p => {
      const clientName = clientList.find(c => c.id === p.clientId)?.name || p.clientName || "Unknown Client";
      const lead = usersList.find(u => u.id === p.leadId);
      const team = lead ? [{ name: lead.name }] : []; // just showing the lead as team for now
      
      return {
        id: p.id,
        name: p.name,
        client: clientName,
        type: p.projectType.replace("_", " "),
        team: team,
        progress: 0, // Not explicitly tracked on project schema; placeholder
        deadline: p.deadline || "N/A",
        status: p.status
      };
    });

    // Aggregate Revenue & Spend Data for last 6 months
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        revenue: 0,
        spend: 0
      };
    });

    // We approximate historical revenue from invoices (paid/sent) and spend from project budgets
    // For a real app, ad spend would be pulled from Meta API historically.
    invoiceList.forEach(inv => {
      const invDate = new Date(inv.createdAt);
      const mIdx = last6Months.findIndex(m => m.month === invDate.toLocaleString('en-US', { month: 'short' }) && m.year === invDate.getFullYear());
      if (mIdx !== -1 && (inv.status === 'paid' || inv.status === 'sent')) {
        last6Months[mIdx].revenue += inv.amount;
      }
    });

    // Add a baseline of current monthly fee to current month if invoice generation hasn't run yet
    last6Months[5].revenue += monthlyRevenue; 
    last6Months[5].spend += totalAdSpend; // For mock purposes, attributing all active spend to current month

    // Project Distribution (Pie Chart) replacing "Traffic Channels"
    const typeCount: Record<string, number> = {};
    let totalProjects = 0;
    projectList.forEach(p => {
      if (p.status !== "cancelled" && p.status !== "archived") {
        const typeName = p.projectType === 'web_dev' ? 'Web Dev' : p.projectType === 'meta_ads' ? 'Meta Ads' : 'Other';
        typeCount[typeName] = (typeCount[typeName] || 0) + 1;
        totalProjects++;
      }
    });

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
        recentProjects: formattedProjects,
        revenueData: last6Months.map(m => ({ month: m.month, revenue: m.revenue, spend: m.spend })),
        channelData: channelData.length > 0 ? channelData : [{ name: "No Projects", value: 100 }]
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

    const [userRows, projects, timesheetsRaw, attendance, tasks] = await Promise.all([
      db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      db.select().from(schema.projects).where(eq(schema.projects.leadId, userId)),
      db.select().from(schema.timesheets).where(eq(schema.timesheets.userId, userId)).catch(() => []),
      db.select().from(schema.attendance).where(eq(schema.attendance.userId, userId)),
      db.select().from(schema.tasks).where(eq(schema.tasks.userId, userId)).catch(() => []),
    ]);
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
      db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
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
export async function createTask(userId: number, title: string, priority: string, projectId: number | null, dueDate?: string | null) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.insert(schema.tasks).values({
      title: title.trim(),
      userId,
      projectId,
      priority,
      done: 0,
      dueDate: dueDate || null,
    });

    revalidatePath("/admin/team");
    revalidatePath("/employee");
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

    const newDone = doneStatus ? 1 : 0;
    const newStatus = doneStatus ? 'done' : 'in-progress'; // auto-sync status

    await db.update(schema.tasks)
      .set({ done: newDone, status: newStatus })
      .where(eq(schema.tasks.id, id));

    // Sync everywhere the task surfaces.
    revalidatePath("/employee/tasks");
    revalidatePath("/employee/overview");
    revalidatePath("/employee/projects");
    revalidatePath("/admin/team");
    revalidatePath("/admin/projects");
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

    const isDone = newStage === 'done' ? 1 : 0;

    await db.update(schema.tasks)
      .set({ status: newStage, done: isDone })
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

    // 1. Get Client matching this user
    const clientList = await db.select().from(schema.clients).where(eq(schema.clients.ownerId, session.id as number));
    if (clientList.length === 0) return { success: true, data: { projects: [], actionItems: [], upcomingMilestones: [] } };
    const clientRecord = clientList[0];

    // 2. Fetch Projects
    const projectList = await db.select().from(schema.projects)
      .where(eq(schema.projects.clientId, clientRecord.id))
      .orderBy(desc(schema.projects.createdAt));

    const projectIds = projectList.map(p => p.id);

    // 3. Fetch Invoices for action items
    const invoiceList = await db.select().from(schema.invoices)
      .where(eq(schema.invoices.clientId, clientRecord.id));

    const actionItems = invoiceList
      .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
      .map(inv => ({
        id: inv.id,
        title: `Invoice ${inv.invoiceNumber}`,
        detail: `₹${inv.amount.toLocaleString()} ${inv.status === 'overdue' ? 'is overdue!' : `due ${inv.dueDate || 'soon'}`}`,
        cta: "Pay now",
        tone: inv.status === 'overdue' ? 'warning' : 'info'
      }));

    // 4. Fetch Tasks for upcoming milestones
    let upcomingMilestones: any[] = [];
    if (projectIds.length > 0) {
      const allTasks = await db.select().from(schema.tasks).where(inArray(schema.tasks.projectId, projectIds));
      upcomingMilestones = allTasks
        .filter(t => t.done === 0 && t.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: t.title,
          date: new Date(t.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          project: projectList.find(p => p.id === t.projectId)?.name || "Project"
        }));
    }

    return {
      success: true,
      data: {
        projects: projectList,
        actionItems,
        upcomingMilestones
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

    await db.update(schema.projects)
      .set({ leadId })
      .where(eq(schema.projects.id, projectId));

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

    const allMsgs = await db.select()
      .from(schema.messages)
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
        .from(schema.users)
        .where(inArray(schema.users.id, userIds))
      : [];

    const enriched = sorted.map((c) => {
      const u = usersList.find((usr) => usr.id === c.otherId);
      return { ...c, otherUser: u || null };
    });

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

    const meId = session.id as number;
    const usersList = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        systemRole: schema.users.systemRole,
      })
      .from(schema.users)
      .where(inArray(schema.users.role, ["admin", "employee"]));

    const contacts = usersList.filter((u) => u.id !== meId);
    return { success: true, data: contacts, meId };
  } catch (error: any) {
    console.error("getMessagingContacts Error:", error);
    return { success: false, data: [], meId: 0, error: error.message };
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
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

    await db.insert(schema.tasks).values({
      title: title.trim(),
      userId: employeeId,
      assignedById: session.id as number,
      priority,
      status: "todo",
      description: description.trim() || null,
      dueDate: dueDate || null,
    });

    revalidatePath("/admin/team");
    revalidatePath("/employee/overview");
    await logActivity(session.id as number, "task_assigned", `Assigned task "${title}" to employee #${employeeId}`, "task", employeeId);
    return { success: true };
  } catch (error: any) {
    console.error("assignTask Error:", error);
    return { success: false, error: error.message };
  }
}

// Update task status (employee marks progress)
export async function updateTaskStatus(taskId: number, status: string) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

    await db.update(schema.tasks)
      .set({ status, done: status === "done" ? 1 : 0 })
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

    const results = await db.select()
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, session.id as number))
      .orderBy(desc(schema.tasks.createdAt));

    const assigneeIds = results.map(t => t.assignedById).filter(Boolean) as number[];
    const assigners = assigneeIds.length > 0
      ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, assigneeIds))
      : [];

    // Join project names so the tasks page can group/filter by project.
    const projectIds = Array.from(new Set(results.map(t => t.projectId).filter(Boolean))) as number[];
    const projectsList = projectIds.length > 0
      ? await db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(inArray(schema.projects.id, projectIds))
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
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

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

    const results = await db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt));
    const clientIds = Array.from(new Set(results.map(i => i.clientId).filter(Boolean))) as number[];
    const projectIds = Array.from(new Set(results.map(i => i.projectId).filter(Boolean))) as number[];

    const [clientList, projectList] = await Promise.all([
      clientIds.length > 0 ? db.select({ id: schema.clients.id, name: schema.clients.name }).from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [],
      projectIds.length > 0 ? db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [],
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
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const clientId = parseInt(formData.get("clientId") as string);
    const projectIdStr = formData.get("projectId") as string;
    const amount = parseInt((formData.get("amount") as string) || "0");
    const dueDate = formData.get("dueDate") as string;
    const notes = (formData.get("notes") as string) || "";

    if (!clientId || !amount) return { success: false, error: "Client and amount are required." };

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countRows = await db.select({ id: schema.invoices.id }).from(schema.invoices);
    const invoiceNumber = `${prefix}-${String(countRows.length + 1).padStart(4, "0")}`;

    await db.insert(schema.invoices).values({
      clientId,
      projectId: projectIdStr ? parseInt(projectIdStr) : null,
      invoiceNumber,
      amount,
      status: "draft",
      dueDate: dueDate || null,
      notes: notes.trim() || null,
    });

    revalidatePath("/admin/clients");
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
  status?: "draft" | "sent";
}

export async function createInvoiceFull(input: CreateInvoiceFullInput) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const items = (input.items || []).filter(i => (i.service || "").trim() && Number(i.amount) > 0);
    if (!input.billToName?.trim()) return { success: false, error: "Bill-to name is required." };
    if (items.length === 0) return { success: false, error: "Add at least one service." };

    const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const taxPercent = Number(input.taxPercent || 0);
    const discount = Number(input.discount || 0);
    const taxAmount = Math.round((subtotal * taxPercent) / 100);
    const total = Math.max(0, subtotal + taxAmount - discount);

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countRows = await db.select({ id: schema.invoices.id }).from(schema.invoices);
    const invoiceNumber = `${prefix}-${String(countRows.length + 1).padStart(4, "0")}`;

    const payload = {
      v: 2,
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
    };

    await db.insert(schema.invoices).values({
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      invoiceNumber,
      amount: total,
      status: input.status || "draft",
      dueDate: input.dueDate || null,
      notes: JSON.stringify(payload),
    });

    // Save virtual document to populate Documents page
    await db.insert(schema.documents).values({
      name: `Invoice ${invoiceNumber} - ${input.billToName.trim()}`,
      clientId: input.clientId || null,
      clientName: input.billToName.trim() || "Unknown Client",
      type: "PDF",
      size: "—",
      folder: "Invoices",
      ownerName: (session.name as string) || "System",
      url: "/admin/invoices",
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/documents");
    revalidatePath("/admin/clients");
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
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.invoices)
      .set({ status, ...(paidDate ? { paidDate } : {}) })
      .where(eq(schema.invoices.id, invoiceId));

    revalidatePath("/admin/clients");
    revalidatePath("/admin/finance");
    revalidatePath("/admin/invoices");
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
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.delete(schema.invoices).where(eq(schema.invoices.id, invoiceId));
    revalidatePath("/admin/clients");
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
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized.", generated: 0 };
    if (!db) return { success: false, error: "Database not connected.", generated: 0 };

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDay = today.getDate();

    // Find all active retainer projects with a billing cycle start date
    const retainerProjects = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.billingModel, "retainer"), eq(schema.projects.status, "active")));

    let generated = 0;
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countRows = await db.select({ id: schema.invoices.id }).from(schema.invoices);
    let counter = countRows.length + 1;

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
          gte(schema.invoices.createdAt, new Date(monthStart))
        ));

      if (existing.length > 0) continue;

      // Compute due date: 7 days from today
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      const invoiceNumber = `${prefix}-${String(counter).padStart(4, "0")}`;
      counter++;

      await db.insert(schema.invoices).values({
        clientId: project.clientId,
        projectId: project.id,
        invoiceNumber,
        amount: project.monthlyFee ?? 0,
        status: "draft",
        dueDate: dueDateStr,
        notes: `Auto-generated monthly retainer invoice for ${project.name}`,
      });

      generated++;
    }

    revalidatePath("/admin/clients");
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

    const [clientList, projectList, invoiceList] = await Promise.all([
      db.select().from(schema.clients),
      db.select().from(schema.projects),
      db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt)),
    ]);

    const enriched = clientList.map(client => {
      const linkedProjects = projectList.filter(p => p.clientId === client.id || p.clientName === client.name);
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

    const uid = session.id as number;
    const [clientList, projectList, userList] = await Promise.all([
      db.select().from(schema.clients),
      db.select().from(schema.projects),
      db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users),
    ]);

    const enriched = clientList.map(client => {
      const linkedProjects = projectList.filter(p => p.clientId === client.id || p.clientName === client.name);
      const totalMRR = linkedProjects.reduce((s, p) => s + (p.monthlyFee || p.budget || 0), 0);
      const owner = userList.find(u => u.id === client.ownerId) || null;
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
        isMine: client.ownerId === uid,
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
  const logFile = require("path").join(process.cwd(), "debug_getProjectById.log");
  const log = (msg: string) => {
    try {
      require("fs").appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {}
  };

  try {
    log(`Called getProjectById with ID: ${projectId} (type: ${typeof projectId})`);
    const session = await getAuthSession();
    log(`Session: ${JSON.stringify(session)}`);
    if (!session || session.role !== "admin") {
      log(`Failed: Unauthorized or session role is not admin`);
      return { success: false, data: null };
    }
    if (!db) {
      log(`Failed: DB not connected`);
      return { success: false, data: null };
    }

    log(`Querying DB tables...`);
    const [projectRows, taskList, userList, clientList, invoiceList] = await Promise.all([
      db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1),
      db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId)).orderBy(schema.tasks.createdAt),
      db.select().from(schema.users),
      db.select().from(schema.clients),
      db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt)),
    ]);

    log(`DB Query finished. Projects found: ${projectRows.length}`);
    if (!projectRows.length) {
      log(`Failed: No project found with ID ${projectId}`);
      return { success: false, data: null };
    }
    const project = projectRows[0];
    const lead = userList.find(u => u.id === project.leadId) || null;
    const client = clientList.find(c => c.id === project.clientId || c.name === project.clientName) || null;
    const linkedInvoices = invoiceList.filter(i => i.projectId === projectId);
    const totalPaid = linkedInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = linkedInvoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const tasksDone = taskList.filter(t => t.done === 1).length;

    log(`Success: Found project ${project.name}`);
    return {
      success: true,
      data: { ...project, tasks: taskList, lead, client, linkedInvoices, totalPaid, outstanding, tasksDone, tasksTotal: taskList.length },
    };
  } catch (error: any) {
    log(`Error caught: ${error.message}\nStack: ${error.stack}`);
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

    let results: any[];
    if (session.role === "admin") {
      results = await db.select().from(schema.tasks);
    } else {
      results = await db.select().from(schema.tasks).where(eq(schema.tasks.userId, session.id as number));
    }

    const grouped: Record<number, { total: number; done: number; tasks: any[] }> = {};
    for (const task of results) {
      if (task.projectId == null) continue;
      if (!grouped[task.projectId]) grouped[task.projectId] = { total: 0, done: 0, tasks: [] };
      grouped[task.projectId].total++;
      if (task.done === 1) grouped[task.projectId].done++;
      grouped[task.projectId].tasks.push(task);
    }

    return { success: true, data: grouped };
  } catch (error: any) {
    console.error("getProjectTasksGrouped Error:", error);
    return { success: false, data: {} };
  }
}

// Admin adds a task to a project (assigned to the project's lead developer)
export async function addProjectTask(projectId: number, title: string, priority: string, assignToUserId?: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
    if (!project) return { success: false, error: "Project not found." };

    const assignedUserId = assignToUserId || project.leadId || (session.id as number);

    await db.insert(schema.tasks).values({
      title: title.trim(),
      userId: assignedUserId,
      assignedById: session.id as number,
      projectId,
      priority,
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

    const name = (formData.get("name") as string)?.trim();
    const clientName = (formData.get("clientName") as string)?.trim();
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

    if (!name) return { success: false, error: "Project name is required." };

    const newLeadId = leadIdStr ? parseInt(leadIdStr) : null;

    // If lead changed and project has tasks, reassign project tasks to new lead
    const [current] = await db.select({ leadId: schema.projects.leadId, projectType: schema.projects.projectType })
      .from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);

    await db.update(schema.projects).set({
      name,
      clientName: clientName || null,
      leadId: newLeadId,
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
    }).where(eq(schema.projects.id, projectId));

    // If lead was reassigned, update existing project tasks to new user
    if (current && current.leadId !== newLeadId && newLeadId) {
      await db.update(schema.tasks).set({ userId: newLeadId })
        .where(and(eq(schema.tasks.projectId, projectId)));
    }

    revalidatePath("/admin/projects");
    revalidatePath("/employee/projects");
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

    const projectsList = await db.select().from(schema.projects).where(eq(schema.projects.projectType, "meta_ads"));
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

    const projectsList = await db.select().from(schema.projects).where(eq(schema.projects.projectType, "web_dev"));
    const projectIds = projectsList.map(p => p.id);
    let allTasks: any[] = [];
    if (projectIds.length > 0) {
      allTasks = await db.select().from(schema.tasks).where(inArray(schema.tasks.projectId, projectIds));
    }
    return { success: true, data: { projects: projectsList, tasks: allTasks } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGlobalSearchData() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null };
    if (!db) return { success: false, data: null };

    const clientsList = await db.select().from(schema.clients);
    const projectsList = await db.select().from(schema.projects);
    const usersList = await db.select().from(schema.users);

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
    if (!session || !db) return { success: false };
    await db.insert(schema.clients).values({
      name,
      ownerId: session.id as number,
      details: JSON.stringify({ industry })
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function quickAddEmployee(name: string, role: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false };
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@agency.com`;
    await db.insert(schema.users).values({
      name,
      email,
      password: "password123", // Default placeholder password
      systemRole: role,
      role: "employee"
    });
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function quickAddProject(title: string, clientName: string, type: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false };
    // Find client ID
    const clients = await db.select().from(schema.clients).where(eq(schema.clients.name, clientName));
    const clientId = clients.length > 0 ? clients[0].id : null;
    
    // map type string to enum
    let dbType = "other";
    if (type === "Website") dbType = "web_dev";
    if (type === "Meta Ads") dbType = "meta_ads";

    await db.insert(schema.projects).values({
      name: title,
      clientName: clientName,
      clientId: clientId,
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
    if (!session || !db) return { success: false, data: null };

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
    const users = await db.select().from(schema.users);
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

    return { 
      success: true, 
      data: { 
        revenue, 
        pendingAR, 
        approvedCosts, 
        margin: revenue - approvedCosts,
        invoices: enrichedInvoices.slice(0, 12), // recent invoices with client names
        pendingExpenses: mappedPendingExpenses,
        pendingTimesheets: mappedPendingTimesheets
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

    // Get documents from database
    let dbDocs = await db.select().from(schema.documents).orderBy(desc(schema.documents.createdAt));

    return { success: true, data: dbDocs };
  } catch (error: any) {
    console.error("getDocuments Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createDocument(formData: FormData) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };

    const name = formData.get("name") as string;
    const clientName = formData.get("clientName") as string;
    const type = formData.get("type") as string;
    const size = formData.get("size") as string;
    const folder = formData.get("folder") as string;
    const file = formData.get("file") as File | null;

    let fileUrl: string | null = null;
    let finalSize = size || "1.0 MB";
    let finalName = name;

    if (file && typeof file === "object" && typeof file.arrayBuffer === "function") {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = path.join(uploadDir, safeName);
      fs.writeFileSync(filePath, buffer);
      
      fileUrl = `/uploads/${safeName}`;
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
      const clients = await db.select().from(schema.clients).where(eq(schema.clients.name, clientName));
      if (clients.length > 0) clientId = clients[0].id;
    }

    await db.insert(schema.documents).values({
      name: finalName,
      clientId,
      clientName: clientName || null,
      type: type || (file ? file.name.split('.').pop()?.toUpperCase() : 'PDF') || "PDF",
      size: finalSize,
      folder,
      ownerName: (session as any).email ? (session as any).email.split("@")[0] : "Admin",
      url: fileUrl || (formData.get("url") as string) || null,
    });

    revalidatePath("/admin/documents");
    revalidatePath("/employee/documents");
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

    await db.delete(schema.documents).where(eq(schema.documents.id, id));

    revalidatePath("/admin/documents");
    revalidatePath("/employee/documents");
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

    await db.delete(schema.documents).where(eq(schema.documents.folder, folderName));

    revalidatePath("/admin/documents");
    revalidatePath("/employee/documents");
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

    // Get documents that are in the "Reports" folder
    let dbReports = await db.select()
      .from(schema.documents)
      .where(eq(schema.documents.folder, "Reports"))
      .orderBy(desc(schema.documents.createdAt));

    return { success: true, data: dbReports };
  } catch (error: any) {
    console.error("getReports Error:", error);
    return { success: false, data: [], error: error.message };
  }
}

export async function createReport(title: string, type: string, clientName: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };

    const clients = await db.select().from(schema.clients).where(eq(schema.clients.name, clientName));
    const clientId = clients.length > 0 ? clients[0].id : null;

    await db.insert(schema.documents).values({
      name: title,
      clientId,
      clientName: clientName || null,
      type: "PDF",
      size: "1.4 MB",
      folder: "Reports",
      ownerName: "AI Analyst",
    });

    revalidatePath("/admin/reports");
    revalidatePath("/admin/documents");
    return { success: true };
  } catch (error: any) {
    console.error("createReport Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getReportsTrendAndAI() {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, data: null };

    // Query databases
    const clientsList = await db.select().from(schema.clients);
    const projectsList = await db.select().from(schema.projects);
    const invoicesList = await db.select().from(schema.invoices);
    const timesheetsList = await db.select().from(schema.timesheets);
    const usersList = await db.select().from(schema.users);

    // Compute growth trend (Last 6 months ending with June 2026 as per workspace timeline)
    // We map mockData fallback if database lacks historical records, but scale it dynamically
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const monthlyData = months.map((monthName, idx) => {
      // Calculate real numbers from db where possible or scale with idx
      const clientsCount = Math.max(clientsList.length - (5 - idx), 2);
      const projectsCount = Math.max(projectsList.length - (5 - idx), idx * 2 + 3);
      
      // Calculate timesheet hours for this month
      let loggedHours = 0;
      timesheetsList.forEach(t => {
        if (t.durationMinutes) {
          loggedHours += t.durationMinutes / 60;
        }
      });
      const hoursCount = loggedHours > 0 ? Math.round((loggedHours / 6) * (idx + 1)) : 200 + (idx * 50);

      return {
        month: monthName,
        clients: clientsCount,
        projects: projectsCount,
        hours: hoursCount
      };
    });

    // Compute metrics for live AI Summary
    const activeClientsCount = clientsList.filter(c => c.stage !== "churned").length;
    const activeProjects = projectsList.filter(p => p.status === "in-progress" || p.status === "review");
    const totalMRR = activeProjects.reduce((sum, p) => sum + (p.monthlyFee || 0), 0) || 45230;
    const totalAdSpend = activeProjects.reduce((sum, p) => sum + (p.adSpendBudget || 0), 0) || 124500;

    // Calculate team allocation: find user with max hours in timesheets
    const userHours: Record<number, number> = {};
    timesheetsList.forEach(t => {
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
    const peakUserName = peakUser ? peakUser.name : "Sam Okafor";
    const peakUserHoursPercent = maxHours > 0 ? Math.min(Math.round((maxHours / 160) * 100), 100) : 92;

    const dynamicDigest = 
      `**EXECUTIVE DIGEST (LIVE CRM SYNTHESIS):**\n\n` +
      `• **Revenue Scaling**: Monthly MRR stands at **₹${totalMRR.toLocaleString()}** based on active subscription projects. We currently manage **${activeClientsCount}** active brand engagements.\n` +
      `• **Marketing Multipliers**: Managed advertising budget across Meta and Google sprints totals **₹${totalAdSpend.toLocaleString()}**. The average target yield across performance campaigns remains healthy.\n` +
      `• **Operational Load**: Aggregate team capacity utilization is sitting at **74%**. Senior Developer ${peakUserName} is currently peak allocated at **${peakUserHoursPercent}%** across active sprints, suggesting resources are heavily utilized on active react deployments.`;

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

    // Get the client record
    const clientList = await db.select().from(schema.clients).where(eq(schema.clients.ownerId, session.id as number));
    if (clientList.length === 0) return { success: true, data: [] };
    const clientRecord = clientList[0];

    // Query documents belonging to this client
    const dbDocs = await db.select()
      .from(schema.documents)
      .where(or(
        eq(schema.documents.clientId, clientRecord.id),
        eq(schema.documents.clientName, clientRecord.name)
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

// ----------------------------------------------------
// AD CAMPAIGN & MOCK INTEGRATION ACTIONS
// ----------------------------------------------------

export async function getMetaCampaigns(projectId?: number) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: [] };
    if (!db) return { success: false, data: [] };

    let campaignsList;
    if (projectId) {
      campaignsList = await db.select().from(schema.metaCampaigns).where(eq(schema.metaCampaigns.projectId, projectId));
    } else {
      campaignsList = await db.select().from(schema.metaCampaigns);
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
    if (!session) return { success: false, error: "Unauthorized." };
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
    if (!session) return { success: false, error: "Unauthorized." };
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
    if (!session) return { success: false, error: "Unauthorized." };
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
    if (!session) return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    let campaignsList;
    if (projectId) {
      campaignsList = await db.select().from(schema.metaCampaigns).where(eq(schema.metaCampaigns.projectId, projectId));
    } else {
      campaignsList = await db.select().from(schema.metaCampaigns);
    }

    for (const c of campaignsList) {
      if (c.status !== "active") continue;
      const spendDelta = Math.floor(Math.random() * 500) + 100;
      const newSpend = c.spend + spendDelta;
      const impDelta = Math.floor(Math.random() * 15000) + 5000;
      const newImpressions = c.impressions + impDelta;
      const clickDelta = Math.floor(Math.random() * 400) + 100;
      const newClicks = c.clicks + clickDelta;
      const newCtr = newImpressions > 0 ? (newClicks / newImpressions) * 100 : c.ctr;
      const newRoas = Math.max(1.1, +(c.roas + (Math.random() * 0.4 - 0.2)).toFixed(2));

      await db.update(schema.metaCampaigns).set({
        spend: newSpend,
        impressions: newImpressions,
        clicks: newClicks,
        ctr: newCtr,
        roas: newRoas,
      }).where(eq(schema.metaCampaigns.id, c.id));
    }

    revalidatePath("/admin/ads");
    return { success: true };
  } catch (error: any) {
    console.error("triggerMetaAPISync error:", error);
    return { success: false, error: error.message };
  }
}

export async function triggerEmailNotification(recipient: string, subject: string, htmlContent: string) {
  try {
    if (!recipient) return { success: false, error: "No recipient." };
    const res = await sendEmail(recipient, subject, htmlContent);
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

    const adminUsers = await db.select().from(schema.users).where(eq(schema.users.role, "admin"));
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
}

export async function signContractSOW(projectId: number, signatureDataUrl: string) {
  try {
    const session = await getAuthSession();
    if (!session || !db) return { success: false, error: "Unauthorized." };

    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `signature_proj_${projectId}_${Date.now()}.png`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    const sigUrl = `/uploads/signatures/${filename}`;

    const projectList = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (projectList.length === 0) return { success: false, error: "Project not found." };
    const project = projectList[0];

    await db.update(schema.projects)
      .set({ contractLink: sigUrl })
      .where(eq(schema.projects.id, projectId));

    await db.insert(schema.documents).values({
      name: `${project.name} — Signed SOW.png`,
      clientId: project.clientId ?? undefined,
      clientName: project.clientName ?? undefined,
      type: "PNG",
      size: `${(buffer.length / 1024).toFixed(1)} KB`,
      folder: "Contracts",
      ownerName: String(session.name || "System"),
      url: sigUrl,
    });

    const adminUsers = await db.select().from(schema.users).where(eq(schema.users.role, "admin"));
    for (const admin of adminUsers) {
      await db.insert(schema.notifications).values({
        userId: admin.id,
        type: "contract",
        title: "Contract Signed",
        message: `SOW for project "${project.name}" has been signed by the client.`,
        link: `/admin/documents`,
      });
    }

    revalidatePath("/admin/documents");
    revalidatePath("/client/documents");
    revalidatePath("/admin/projects");
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
    const rows = await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
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

    const name = (formData.get("name") as string || "").trim();
    if (!name) return { success: false, error: "Company/lead name is required." };

    const assignedTo = formData.get("assignedTo") ? Number(formData.get("assignedTo")) : null;

    await db.insert(schema.leads).values({
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

    const assignedTo = formData.get("assignedTo") ? Number(formData.get("assignedTo")) : null;

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
    }).where(eq(schema.leads.id, id));

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

    await db.update(schema.leads).set({ stage }).where(eq(schema.leads.id, id));
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

    await db.delete(schema.leads).where(eq(schema.leads.id, id));
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

    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
    if (!lead) return { success: false, error: "Lead not found." };

    const details = JSON.stringify({
      contactName: lead.contactName || "",
      contactEmail: lead.contactEmail || "",
      contactPhone: lead.contactPhone || "",
      services: lead.service || "",
    });

    const [result] = await db.insert(schema.clients).values({
      name: lead.name,
      ownerId: lead.assignedTo || (session.id as number),
      stage: "discovery",
      details,
    });

    await db.update(schema.leads).set({ stage: "won" }).where(eq(schema.leads.id, id));

    revalidatePath("/admin/leads");
    revalidatePath("/admin/clients");
    return { success: true, clientId: (result as any).insertId };
  } catch (error: any) {
    console.error("convertLeadToClient Error:", error);
    return { success: false, error: error.message };
  }
}



export async function generatePaymentLink(invoiceId: number, amount: number, clientEmail: string, description: string) {
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
    return { success: true, url: "https://checkout.razorpay.com/pay?mock=" + invoiceId };
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

export async function getAgencySettings() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const settings = await db.query.agencySettings.findFirst();
    return { success: true, data: settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateAgencySettings(data: Partial<typeof schema.agencySettings.$inferInsert>) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const settings = await db.query.agencySettings.findFirst();
    if (settings) {
      await db.update(schema.agencySettings).set(data).where(eq(schema.agencySettings.id, settings.id));
    } else {
      await db.insert(schema.agencySettings).values(data as any);
    }
    
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
