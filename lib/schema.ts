import { mysqlTable, int, varchar, mysqlEnum, timestamp, text, double, decimal } from "drizzle-orm/mysql-core";

// 1. Users Table
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "employee", "client"]).notNull().default("employee"),
  systemRole: varchar("system_role", { length: 255 }).notNull().default("Web Developer"),
  workingDays: varchar("working_days", { length: 255 }).notNull().default("1,2,3,4,5"),
  shiftStartTime: varchar("shift_start_time", { length: 255 }).notNull().default("09:00 AM"),
  shiftEndTime: varchar("shift_end_time", { length: 255 }).notNull().default("05:00 PM"),
  activeShiftProfile: varchar("active_shift_profile", { length: 255 }).notNull().default("Standard Core Hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Clients Table
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
  stage: varchar("stage", { length: 255 }).notNull().default("contract_signed"), // 'contract_signed' | 'discovery' | 'integrations' | 'campaign_live'
  progress: int("progress").notNull().default(0),
  checklist: text("checklist").notNull().default("[]"), // Serialized checklist JSON state
  details: text("details").default("{}"), // JSON contact metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Projects Table
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }),
  projectType: varchar("project_type", { length: 50 }).notNull().default("other"), // 'meta_ads' | 'web_dev' | 'other'
  budget: int("budget").notNull().default(0), // total budget (web dev) or monthly fee (meta ads)
  monthlyFee: int("monthly_fee").default(0),
  adSpendBudget: int("ad_spend_budget").default(0),
  startDate: varchar("start_date", { length: 255 }),
  deadline: varchar("deadline", { length: 255 }).notNull().default(""),
  status: varchar("status", { length: 255 }).notNull().default("planning"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // 'low' | 'medium' | 'high'
  billingModel: varchar("billing_model", { length: 50 }).default("fixed_fee"),
  serviceDetails: text("service_details").default("{}"), // JSON — type-specific fields
  billingCycleStart: varchar("billing_cycle_start", { length: 255 }),      // 'YYYY-MM-DD' — first invoice date
  contractDuration: int("contract_duration").default(0),                    // months committed
  clientContactName: varchar("client_contact_name", { length: 255 }),       // who employees reach out to
  clientContactPhone: varchar("client_contact_phone", { length: 50 }),      // WhatsApp / phone
  accessGranted: int("access_granted").notNull().default(0),                // 1 = agency has platform access
  contractLink: varchar("contract_link", { length: 500 }),                  // signed SOW / contract URL
  githubRepo: varchar("github_repo", { length: 255 }),                      // e.g. 'facebook/react' or full URL
  leadId: int("lead_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Timesheets Table
export const timesheets = mysqlTable("timesheets", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  durationMinutes: int("duration_minutes").notNull(),
  date: varchar("date", { length: 255 }).notNull(), // 'YYYY-MM-DD'
  status: varchar("status", { length: 255 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Expenses Table
export const expenses = mysqlTable("expenses", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category", { length: 255 }).notNull(), // 'software' | 'travel' | 'marketing' | 'other'
  amount: int("amount").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Attendance Table
export const attendance = mysqlTable("attendance", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: varchar("date", { length: 255 }).notNull(), // 'YYYY-MM-DD'
  punchInTime: timestamp("punch_in_time"),
  punchOutTime: timestamp("punch_out_time"),
  status: varchar("status", { length: 255 }).notNull(), // 'present' | 'absent' | 'half-day' | 'on-leave'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6b. Leaves Table
export const leaves = mysqlTable("leaves", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  leaveType: varchar("leave_type", { length: 255 }).notNull(), // 'vacation' | 'sick' | 'other'
  startDate: varchar("start_date", { length: 255 }).notNull(),
  endDate: varchar("end_date", { length: 255 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 255 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Tasks Table
export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedById: int("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }),
  priority: varchar("priority", { length: 255 }).notNull().default("medium"), // 'high' | 'medium' | 'low'
  status: varchar("status", { length: 255 }).notNull().default("todo"), // 'todo' | 'in-progress' | 'in-review' | 'done'
  description: text("description"),
  done: int("done").notNull().default(0), // 0 = active/pending, 1 = completed
  dueDate: varchar("due_date", { length: 255 }), // 'YYYY-MM-DD'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Messages Table
export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  senderId: int("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: int("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  read: int("read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Activity Log Table
export const activityLog = mysqlTable("activity_log", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  description: text("description").notNull(),
  targetType: varchar("target_type", { length: 255 }),
  targetId: int("target_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 10. Invoices Table
export const invoices = mysqlTable("invoices", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  projectId: int("project_id").references(() => projects.id, { onDelete: "set null" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  amount: int("amount").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | sent | paid | overdue
  dueDate: varchar("due_date", { length: 255 }),
  paidDate: varchar("paid_date", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Notifications Table
export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 255 }),
  read: int("read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Documents Table
export const documents = mysqlTable("documents", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull().default("PDF"), // 'PDF' | 'DOCX' | 'XLSX' | 'CSV' | 'FIG'
  size: varchar("size", { length: 50 }).notNull().default("0 KB"),
  folder: varchar("folder", { length: 255 }).notNull().default("Client Briefs"), // 'Brand Assets' | 'Client Briefs' | 'Contracts' | 'Reports'
  ownerName: varchar("owner_name", { length: 255 }).notNull().default("Admin"),
  url: varchar("url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Meta Campaigns Table
export const metaCampaigns = mysqlTable("meta_campaigns", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull().default("Meta Ads"),
  spend: int("spend").notNull().default(0),
  impressions: int("impressions").notNull().default(0),
  clicks: int("clicks").notNull().default(0),
  ctr: double("ctr").notNull().default(0),
  roas: double("roas").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leads Table
export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  source: varchar("source", { length: 100 }),
  service: varchar("service", { length: 50 }),
  stage: varchar("stage", { length: 50 }).notNull().default("new"),
  estimatedValue: int("estimated_value").notNull().default(0),
  notes: text("notes"),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
  followUpDate: varchar("follow_up_date", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Locations Table (Geofencing)
export const locations = mysqlTable("locations", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: int("radius_meters").notNull().default(100),
  wifiPublicIp: varchar("wifi_public_ip", { length: 45 }).notNull(), // IPv4 or IPv6
  bssid: varchar("bssid", { length: 255 }), // e.g. "00:11:22:33:44:55"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 15. Attendance Logs Table (Punch In / Out audit trail)
export const attendanceLogs = mysqlTable("attendance_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  locationId: int("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
  punchType: mysqlEnum("punch_type", ["IN", "OUT"]).notNull(),
  verifiedIp: varchar("verified_ip", { length: 45 }).notNull(),
  punchedAt: timestamp("punched_at").defaultNow().notNull(),
});

// Types Export
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "admin" | "employee" | "client";

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Timesheet = typeof timesheets.$inferSelect;
export type NewTimesheet = typeof timesheets.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type MetaCampaign = typeof metaCampaigns.$inferSelect;
export type NewMetaCampaign = typeof metaCampaigns.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;

// 14. FCM Tokens Table
export const fcmTokens = mysqlTable("fcm_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  deviceType: varchar("device_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FcmToken = typeof fcmTokens.$inferSelect;
export type NewFcmToken = typeof fcmTokens.$inferInsert;
