"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, and, or, inArray, desc, gte } from "drizzle-orm";
import { decrypt } from "./auth";
import { revalidatePath } from "next/cache";

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
      results = await db.select().from(schema.projects).where(eq(schema.projects.leadId, session.id as number));
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
      await createNotification(ts[0].userId, "timesheet_" + status, `Timesheet ${status === "approved" ? "Approved" : "Rejected"}`, `Your timesheet entry for "${ts[0].description}" was ${status}`, "/employee/finance");
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
    await notifyAdmins("expense_claim", "Expense Claim", `${session.email} claimed $${amountStr} for "${description}"`, "/admin/finance");
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
      await createNotification(expense[0].userId, "expense_" + status, `Expense ${status === "approved" ? "Approved" : "Rejected"}`, `Your expense claim of $${expense[0].amount} for "${expense[0].description}" was ${status}`, "/employee/finance");
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

// Punch In for the day
export async function punchIn() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

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

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await notifyAdmins("punch_in", "Punch In", `${session.email} punched in`, "/admin/team");
    await logActivity(session.id as number, "punch_in", `${session.email} punched in`);
    return { success: true };
  } catch (error: any) {
    console.error("punchIn Error:", error);
    return { success: false, error: error.message };
  }
}

// Punch Out for the day
export async function punchOut() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

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

    revalidatePath("/employee");
    revalidatePath("/admin/team");
    await notifyAdmins("punch_out", "Punch Out", `${session.email} punched out`, "/admin/team");
    await logActivity(session.id as number, "punch_out", `${session.email} punched out`);
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
    await notifyAdmins("leave_request", "Leave Request", `${session.email} requested ${leaveType} leave (${startDate} - ${endDate})`, "/admin/team");
    await logActivity(session.id as number, "leave_requested", `${session.email} requested ${leaveType} leave`);
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
    await createNotification(leave[0].userId, "leave_approved", "Leave Approved", `Your ${leave[0].leaveType} leave (${leave[0].startDate} - ${leave[0].endDate}) has been approved`, "/employee/attendance");
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
      await createNotification(leave[0].userId, "leave_rejected", "Leave Rejected", `Your ${leave[0].leaveType} leave (${leave[0].startDate} - ${leave[0].endDate}) has been rejected`, "/employee/attendance");
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

// Overview page: replaces 4-5 separate server action calls
export async function getOverviewPageData() {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, data: null };
    if (!db) return { success: false, data: null };

    const userId = session.id as number;

    // Limit attendance to last 90 days — covers week / month / prev-month chart views
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().split("T")[0];

    const [userRows, projects, timesheets, attendance, tasks] = await Promise.all([
      db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1),
      db.select().from(schema.projects).where(eq(schema.projects.leadId, userId)),
      db.select().from(schema.timesheets).where(eq(schema.timesheets.userId, userId)),
      db.select().from(schema.attendance).where(
        and(eq(schema.attendance.userId, userId), gte(schema.attendance.date, sinceStr))
      ),
      db.select().from(schema.tasks).where(eq(schema.tasks.userId, userId)),
    ]);

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
export async function toggleTaskStatus(taskId: number, done: boolean) {
  try {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    await db.update(schema.tasks)
      .set({ done: done ? 1 : 0 })
      .where(eq(schema.tasks.id, taskId));

    revalidatePath("/admin/team");
    revalidatePath("/employee");
    return { success: true };
  } catch (error: any) {
    console.error("toggleTaskStatus Error:", error);
    return { success: false, error: error.message };
  }
}

// Delete a task
export async function deleteTask(taskId: number) {
  try {
    const session = await getAuthSession();
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

    await createNotification(receiverId, "new_message", `New message from ${session.email}`, message.trim().substring(0, 100), "/messages");

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

    const enriched = results.map(task => ({
      ...task,
      assignedBy: assigners.find(a => a.id === task.assignedById) || null,
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

// Get a single project enriched with tasks, lead user, client, and invoices
export async function getProjectById(projectId: number) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, data: null };
    if (!db) return { success: false, data: null };

    const [projectRows, taskList, userList, clientList, invoiceList] = await Promise.all([
      db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1),
      db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId)).orderBy(schema.tasks.createdAt),
      db.select().from(schema.users),
      db.select().from(schema.clients),
      db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt)),
    ]);

    if (!projectRows.length) return { success: false, data: null };
    const project = projectRows[0];
    const lead = userList.find(u => u.id === project.leadId) || null;
    const client = clientList.find(c => c.id === project.clientId || c.name === project.clientName) || null;
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
export async function addProjectTask(projectId: number, title: string, priority: string) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "admin") return { success: false, error: "Unauthorized." };
    if (!db) return { success: false, error: "Database not connected." };

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
    if (!project) return { success: false, error: "Project not found." };

    const assignedUserId = project.leadId || (session.id as number);

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
