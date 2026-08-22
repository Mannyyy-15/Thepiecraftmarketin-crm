import {
  mysqlTable,
  int,
  varchar,
  mysqlEnum,
  timestamp,
  text,
  double,
  decimal,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

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
  hourlyCostRate: int("hourly_cost_rate").notNull().default(500),
  billableRate: int("billable_rate").notNull().default(1500),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  permissions: text("permissions").notNull().default("[]"),
  lastLoginAt: timestamp("last_login_at"),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationIndex: index("users_organization_idx").on(table.organizationId),
}));

// 2. Clients Table
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  accountId: int("account_id").references(() => accounts.id, { onDelete: "set null" }),
  stage: varchar("stage", { length: 255 }).notNull().default("contract_signed"), // 'contract_signed' | 'discovery' | 'integrations' | 'campaign_live'
  progress: int("progress").notNull().default(0),
  checklist: text("checklist").notNull().default("[]"), // Serialized checklist JSON state
  details: text("details").default("{}"), // JSON contact metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationNameIndex: index("clients_org_name_idx").on(table.organizationId, table.name),
}));

// 3. Projects Table
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  accountId: int("account_id").references(() => accounts.id, { onDelete: "set null" }),
  dealId: int("deal_id").references(() => deals.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 255 }),
  projectType: varchar("project_type", { length: 50 }).notNull().default("other"), // 'meta_ads' | 'web_dev' | 'agency' | 'other'
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
  teamMemberIds: text("team_member_ids").default("[]"), // JSON array of user IDs assigned to this project
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationCreatedIndex: index("projects_org_created_idx").on(table.organizationId, table.createdAt),
  clientCreatedIndex: index("projects_client_created_idx").on(table.clientId, table.createdAt),
  projectTypeIndex: index("projects_project_type_idx").on(table.projectType),
  billingStatusIndex: index("projects_billing_status_idx").on(table.billingModel, table.status),
}));

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
}, (table) => ({
  userDateIndex: index("attendance_user_date_idx").on(table.userId, table.date),
}));

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
}, (table) => ({
  userCreatedIndex: index("tasks_user_created_idx").on(table.userId, table.createdAt),
  projectCreatedIndex: index("tasks_project_created_idx").on(table.projectId, table.createdAt),
}));

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
}, (table) => ({
  createdIndex: index("activity_log_created_idx").on(table.createdAt),
}));

// 10. Invoices Table
export const invoices = mysqlTable("invoices", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  projectId: int("project_id").references(() => projects.id, { onDelete: "set null" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amount: int("amount").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | sent | paid | overdue
  dueDate: varchar("due_date", { length: 255 }),
  paidDate: varchar("paid_date", { length: 255 }),
  gstin: varchar("gstin", { length: 20 }),
  taxRate: int("tax_rate").notNull().default(18),
  taxAmount: int("tax_amount").notNull().default(0),
  totalAmount: int("total_amount").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationCreatedIndex: index("invoices_org_created_idx").on(table.organizationId, table.createdAt),
  clientCreatedIndex: index("invoices_client_created_idx").on(table.clientId, table.createdAt),
  projectCreatedIndex: index("invoices_project_created_idx").on(table.projectId, table.createdAt),
  statusIndex: index("invoices_status_idx").on(table.status),
}));

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
}, (table) => ({
  userCreatedIndex: index("notifications_user_created_idx").on(table.userId, table.createdAt),
  userReadIndex: index("notifications_user_read_idx").on(table.userId, table.read),
}));

// 12. Documents Table
export const documents = mysqlTable("documents", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull().default("PDF"), // 'PDF' | 'DOCX' | 'XLSX' | 'CSV' | 'FIG'
  size: varchar("size", { length: 50 }).notNull().default("0 KB"),
  folder: varchar("folder", { length: 255 }).notNull().default("Client Briefs"), // 'Brand Assets' | 'Client Briefs' | 'Contracts' | 'Reports'
  ownerName: varchar("owner_name", { length: 255 }).notNull().default("Admin"),
  url: varchar("url", { length: 500 }),
  approvalStatus: varchar("approval_status", { length: 50 }).notNull().default("approved"), // 'pending_review' | 'approved' | 'changes_requested'
  revisionNotes: text("revision_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationCreatedIndex: index("documents_org_created_idx").on(table.organizationId, table.createdAt),
  clientCreatedIndex: index("documents_client_created_idx").on(table.clientId, table.createdAt),
}));

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
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  accountId: int("account_id").references(() => accounts.id, { onDelete: "set null" }),
  contactId: int("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  convertedDealId: int("converted_deal_id").references(() => deals.id, { onDelete: "set null" }),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  source: varchar("source", { length: 100 }),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  gclid: varchar("gclid", { length: 255 }),
  gbraid: varchar("gbraid", { length: 255 }),
  wbraid: varchar("wbraid", { length: 255 }),
  fbclid: varchar("fbclid", { length: 255 }),
  landingPageUrl: varchar("landing_page_url", { length: 1000 }),
  referrerUrl: varchar("referrer_url", { length: 1000 }),
  attributionData: text("attribution_data"),
  service: varchar("service", { length: 50 }),
  stage: varchar("stage", { length: 50 }).notNull().default("new"),
  estimatedValue: int("estimated_value").notNull().default(0),
  notes: text("notes"),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
  followUpDate: varchar("follow_up_date", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationCreatedIndex: index("leads_org_created_idx").on(table.organizationId, table.createdAt),
}));

// 14. Locations Table (Geofencing)
export const locations = mysqlTable("locations", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: int("radius_meters").notNull().default(100),
  wifiPublicIp: varchar("wifi_public_ip", { length: 45 }).notNull(), // IPv4 or IPv6
  bssid: varchar("bssid", { length: 255 }), // e.g. "00:11:22:33:44:55"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationIndex: index("locations_organization_idx").on(table.organizationId),
}));

// 15. Attendance Logs Table (Punch In / Out audit trail)
export const attendanceLogs = mysqlTable("attendance_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  locationId: int("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
  punchType: mysqlEnum("punch_type", ["IN", "OUT"]).notNull(),
  verifiedIp: varchar("verified_ip", { length: 45 }).notNull(),
  punchedAt: timestamp("punched_at").defaultNow().notNull(),
});

// 16. AI Chats (Studio AI assistant conversations)
export const aiChats = mysqlTable("ai_chats", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull().default("New chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 17. AI Chat Messages
export const aiChatMessages = mysqlTable("ai_chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  chatId: int("chat_id").references(() => aiChats.id, { onDelete: "cascade" }).notNull(),
  role: mysqlEnum("role", ["user", "model"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export type AiChat = typeof aiChats.$inferSelect;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
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

// Agency Settings Table
export const agencySettings = mysqlTable("agency_settings", {
  id: int("id").primaryKey().autoincrement(),
  agencyName: varchar("agency_name", { length: 255 }).notNull().default("Irani Koyla"),
  agencyLogoUrl: text("agency_logo_url"),
  baseCurrency: varchar("base_currency", { length: 10 }).notNull().default("INR"),
  // Business profile (shows on invoices / emails)
  agencyEmail: varchar("agency_email", { length: 255 }),
  agencyPhone: varchar("agency_phone", { length: 50 }),
  agencyWebsite: varchar("agency_website", { length: 255 }),
  agencyAddress: text("agency_address"),
  gstNumber: varchar("gst_number", { length: 50 }),
  // Invoice defaults
  invoiceTaxPercent: int("invoice_tax_percent").default(0),
  invoicePaymentTerms: varchar("invoice_payment_terms", { length: 255 }),
  invoiceNotes: text("invoice_notes"),
  bankDetails: text("bank_details"),
  // Integrations
  razorpayKeyId: text("razorpay_key_id"),
  razorpayKeySecret: text("razorpay_key_secret"),
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: int("smtp_port").default(465),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPass: text("smtp_pass"),
  smtpFrom: varchar("smtp_from", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// Multi-tenant SaaS and normalized CRM domain
// ---------------------------------------------------------------------------

export const organizations = mysqlTable("organizations", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "archived"]).notNull().default("active"),
  plan: varchar("plan", { length: 50 }).notNull().default("internal"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("Asia/Kolkata"),
  baseCurrency: varchar("base_currency", { length: 10 }).notNull().default("INR"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
  statusIndex: index("organizations_status_idx").on(table.status),
}));

export const organizationMemberships = mysqlTable("organization_memberships", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "admin", "manager", "member", "client"]).notNull().default("member"),
  status: mysqlEnum("status", ["invited", "active", "suspended"]).notNull().default("active"),
  invitedById: int("invited_by_id").references(() => users.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  memberUnique: uniqueIndex("organization_memberships_org_user_unique").on(table.organizationId, table.userId),
  userStatusIndex: index("organization_memberships_user_status_idx").on(table.userId, table.status),
}));

export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 100 }),
  status: mysqlEnum("status", ["prospect", "active", "inactive", "archived"]).notNull().default("prospect"),
  ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
  billingEmail: varchar("billing_email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationIndex: index("accounts_organization_idx").on(table.organizationId),
  organizationNameIndex: index("accounts_org_name_idx").on(table.organizationId, table.name),
}));

export const contacts = mysqlTable("contacts", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  accountId: int("account_id").references(() => accounts.id, { onDelete: "set null" }),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  jobTitle: varchar("job_title", { length: 120 }),
  lifecycleStage: varchar("lifecycle_stage", { length: 50 }).notNull().default("lead"),
  ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
  consentStatus: varchar("consent_status", { length: 50 }).notNull().default("unknown"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationIndex: index("contacts_organization_idx").on(table.organizationId),
  organizationEmailIndex: index("contacts_org_email_idx").on(table.organizationId, table.email),
}));

export const accountContacts = mysqlTable("account_contacts", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  accountId: int("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  contactId: int("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  relationship: varchar("relationship", { length: 50 }).notNull().default("stakeholder"),
  isPrimary: int("is_primary").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  relationUnique: uniqueIndex("account_contacts_account_contact_unique").on(table.accountId, table.contactId),
  organizationIndex: index("account_contacts_organization_idx").on(table.organizationId),
}));

export const dealStages = mysqlTable("deal_stages", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  position: int("position").notNull().default(0),
  probability: int("probability").notNull().default(0),
  kind: mysqlEnum("kind", ["open", "won", "lost"]).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationNameUnique: uniqueIndex("deal_stages_org_name_unique").on(table.organizationId, table.name),
  organizationPositionIndex: index("deal_stages_org_position_idx").on(table.organizationId, table.position),
}));

export const deals = mysqlTable("deals", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  accountId: int("account_id").references(() => accounts.id, { onDelete: "set null" }),
  primaryContactId: int("primary_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  stageId: int("stage_id").references(() => dealStages.id, { onDelete: "set null" }),
  ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["open", "won", "lost"]).notNull().default("open"),
  amount: int("amount").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("INR"),
  expectedCloseDate: varchar("expected_close_date", { length: 10 }),
  closedAt: timestamp("closed_at"),
  lostReason: varchar("lost_reason", { length: 255 }),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  gclid: varchar("gclid", { length: 255 }),
  gbraid: varchar("gbraid", { length: 255 }),
  wbraid: varchar("wbraid", { length: 255 }),
  fbclid: varchar("fbclid", { length: 255 }),
  attributionData: text("attribution_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationStatusIndex: index("deals_org_status_idx").on(table.organizationId, table.status),
  organizationStageIndex: index("deals_org_stage_idx").on(table.organizationId, table.stageId),
}));

export const attributionTouchpoints = mysqlTable("attribution_touchpoints", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  leadId: int("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  dealId: int("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  contactId: int("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  touchType: mysqlEnum("touch_type", ["first", "middle", "last", "conversion"]).notNull().default("middle"),
  occurredAt: timestamp("occurred_at").notNull(),
  source: varchar("source", { length: 255 }),
  medium: varchar("medium", { length: 255 }),
  campaign: varchar("campaign", { length: 255 }),
  content: varchar("content", { length: 255 }),
  term: varchar("term", { length: 255 }),
  clickIdType: varchar("click_id_type", { length: 20 }),
  clickId: varchar("click_id", { length: 255 }),
  landingPageUrl: varchar("landing_page_url", { length: 1000 }),
  referrerUrl: varchar("referrer_url", { length: 1000 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  leadOccurredIndex: index("attribution_touchpoints_lead_occurred_idx").on(table.leadId, table.occurredAt),
  dealOccurredIndex: index("attribution_touchpoints_deal_occurred_idx").on(table.dealId, table.occurredAt),
}));

export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: mysqlEnum("entity_type", ["account", "contact", "lead", "deal", "project"]).notNull(),
  key: varchar("field_key", { length: 100 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  fieldType: mysqlEnum("field_type", ["text", "number", "date", "boolean", "select", "multi_select", "url"]).notNull(),
  options: text("options"),
  isRequired: int("is_required").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fieldKeyUnique: uniqueIndex("custom_field_definitions_org_entity_key_unique").on(table.organizationId, table.entityType, table.key),
}));

export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  definitionId: int("definition_id").notNull().references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
  entityType: mysqlEnum("entity_type", ["account", "contact", "lead", "deal", "project"]).notNull(),
  entityId: int("entity_id").notNull(),
  value: text("value"),
  updatedById: int("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  entityValueUnique: uniqueIndex("custom_field_values_definition_entity_unique").on(table.definitionId, table.entityType, table.entityId),
  entityIndex: index("custom_field_values_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
}));

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  actorUserId: int("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  requestId: varchar("request_id", { length: 100 }),
  ipHash: varchar("ip_hash", { length: 128 }),
  userAgent: varchar("user_agent", { length: 500 }),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationCreatedIndex: index("audit_events_org_created_idx").on(table.organizationId, table.createdAt),
  entityIndex: index("audit_events_entity_idx").on(table.organizationId, table.entityType, table.entityId),
}));

export const automationDefinitions = mysqlTable("automation_definitions", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  triggerType: varchar("trigger_type", { length: 100 }).notNull(),
  triggerConfig: text("trigger_config").notNull(),
  actionConfig: text("action_config").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused"]).notNull().default("draft"),
  createdById: int("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  organizationStatusIndex: index("automation_definitions_org_status_idx").on(table.organizationId, table.status),
}));

export const automationRuns = mysqlTable("automation_runs", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  automationId: int("automation_id").notNull().references(() => automationDefinitions.id, { onDelete: "cascade" }),
  eventKey: varchar("event_key", { length: 255 }),
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed", "cancelled"]).notNull().default("queued"),
  inputData: text("input_data"),
  outputData: text("output_data"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventKeyUnique: uniqueIndex("automation_runs_automation_event_unique").on(table.automationId, table.eventKey),
  organizationStatusIndex: index("automation_runs_org_status_idx").on(table.organizationId, table.status),
}));

export const userSessions = mysqlTable("user_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  userAgent: varchar("user_agent", { length: 500 }),
  ipHash: varchar("ip_hash", { length: 128 }),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  revokeReason: varchar("revoke_reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdUnique: uniqueIndex("user_sessions_session_id_unique").on(table.sessionId),
  userActiveIndex: index("user_sessions_user_revoked_idx").on(table.userId, table.revokedAt),
}));

export const loginLinks = mysqlTable("login_links", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  purpose: mysqlEnum("purpose", ["onboarding", "direct_login"]).notNull().default("direct_login"),
  createdById: int("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashUnique: uniqueIndex("login_links_token_hash_unique").on(table.tokenHash),
  userActiveIndex: index("login_links_user_active_idx").on(table.organizationId, table.userId, table.usedAt, table.revokedAt),
  expiryIndex: index("login_links_expiry_idx").on(table.expiresAt),
}));

export const mfaFactors = mysqlTable("mfa_factors", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["totp", "webauthn", "recovery"]).notNull(),
  label: varchar("label", { length: 100 }),
  secretEncrypted: text("secret_encrypted"),
  credentialDataEncrypted: text("credential_data_encrypted"),
  verifiedAt: timestamp("verified_at"),
  lastUsedAt: timestamp("last_used_at"),
  disabledAt: timestamp("disabled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userTypeIndex: index("mfa_factors_user_type_idx").on(table.userId, table.type),
}));

export const connectorAccounts = mysqlTable("connector_accounts", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["google_ads", "meta_ads", "ga4", "search_console"]).notNull(),
  externalAccountId: varchar("external_account_id", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  scopes: text("scopes"),
  status: mysqlEnum("status", ["connected", "reauth_required", "disabled", "error"]).notNull().default("connected"),
  syncCursor: text("sync_cursor"),
  lastSyncedAt: timestamp("last_synced_at"),
  lastError: text("last_error"),
  createdById: int("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  externalAccountUnique: uniqueIndex("connector_accounts_org_provider_external_unique").on(table.organizationId, table.provider, table.externalAccountId),
  organizationStatusIndex: index("connector_accounts_org_status_idx").on(table.organizationId, table.status),
}));

export const webhookEventLedger = mysqlTable("webhook_event_ledger", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 128 }).notNull(),
  signatureVerified: int("signature_verified").notNull().default(0),
  status: mysqlEnum("status", ["received", "processing", "processed", "failed", "ignored"]).notNull().default("received"),
  attemptCount: int("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (table) => ({
  providerEventUnique: uniqueIndex("webhook_event_ledger_provider_event_unique").on(table.provider, table.externalEventId),
  statusReceivedIndex: index("webhook_event_ledger_status_received_idx").on(table.status, table.receivedAt),
}));

export const storageObjects = mysqlTable("storage_objects", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  objectKey: varchar("object_key", { length: 700 }).notNull(),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 255 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
  scanStatus: mysqlEnum("scan_status", ["pending", "clean", "infected", "failed"]).notNull().default("pending"),
  visibility: mysqlEnum("visibility", ["private", "organization", "client"]).notNull().default("private"),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: int("entity_id"),
  uploadedById: int("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  objectKeyUnique: uniqueIndex("storage_objects_object_key_unique").on(table.objectKey),
  entityIndex: index("storage_objects_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
}));

export const importJobs = mysqlTable("import_jobs", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: mysqlEnum("entity_type", ["account", "contact", "lead", "deal", "project"]).notNull(),
  sourceObjectId: int("source_object_id").references(() => storageObjects.id, { onDelete: "set null" }),
  status: mysqlEnum("status", ["uploaded", "mapping", "validating", "ready", "processing", "completed", "failed", "cancelled"]).notNull().default("uploaded"),
  mapping: text("mapping"),
  dedupeStrategy: varchar("dedupe_strategy", { length: 50 }).notNull().default("skip"),
  totalRows: int("total_rows").notNull().default(0),
  validRows: int("valid_rows").notNull().default(0),
  errorRows: int("error_rows").notNull().default(0),
  processedRows: int("processed_rows").notNull().default(0),
  createdById: int("created_by_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  organizationStatusIndex: index("import_jobs_org_status_idx").on(table.organizationId, table.status),
}));

export const importRows = mysqlTable("import_rows", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  importJobId: int("import_job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }),
  rowNumber: int("row_number").notNull(),
  rawData: text("raw_data").notNull(),
  normalizedData: text("normalized_data"),
  fingerprint: varchar("fingerprint", { length: 128 }),
  status: mysqlEnum("status", ["pending", "valid", "invalid", "duplicate", "imported", "failed"]).notNull().default("pending"),
  errors: text("errors"),
  targetEntityId: int("target_entity_id"),
  processedAt: timestamp("processed_at"),
}, (table) => ({
  rowUnique: uniqueIndex("import_rows_job_row_unique").on(table.importJobId, table.rowNumber),
  fingerprintIndex: index("import_rows_org_fingerprint_idx").on(table.organizationId, table.fingerprint),
}));

export type Organization = typeof organizations.$inferSelect;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type DealStage = typeof dealStages.$inferSelect;
export type AttributionTouchpoint = typeof attributionTouchpoints.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type ConnectorAccount = typeof connectorAccounts.$inferSelect;
export type StorageObject = typeof storageObjects.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;

// ── IRANI KOYLA OS FRANCHISE TABLES ──────────────────────────────────────────

export const franchiseOutlets = mysqlTable("franchise_outlets", {
  id: varchar("id", { length: 100 }).primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 255 }).notNull(),
  address: text("address").notNull(),
  status: mysqlEnum("status", ["active", "onboarding", "suspended"]).notNull().default("active"),
  dailyTargetSales: int("daily_target_sales").notNull().default(50000),
  dailyTargetWraps: int("daily_target_wraps").notNull().default(300),
  spitEfficiency: double("spit_efficiency").notNull().default(92.0),
  activeSpits: int("active_spits").notNull().default(2),
  totalSpits: int("total_spits").notNull().default(2),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 255 }).notNull(),
  ownerPhone: varchar("owner_phone", { length: 50 }).notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  loginEmail: varchar("login_email", { length: 255 }).notNull(),
  loginPassword: varchar("login_password", { length: 255 }).notNull(),
  magicLoginToken: varchar("magic_login_token", { length: 255 }),
  franchiseFeeAmount: int("franchise_fee_amount").notNull().default(1500000),
  franchiseFeeStatus: mysqlEnum("franchise_fee_status", ["paid", "partial", "pending"]).notNull().default("paid"),
  securityDepositAmount: int("security_deposit_amount").notNull().default(500000),
  royaltyRatePercent: double("royalty_rate_percent").notNull().default(6.5),
  marketingFeePercent: double("marketing_fee_percent").notNull().default(2.0),
  territoryRadiusKm: double("territory_radius_km").notNull().default(3.0),
  managerName: varchar("manager_name", { length: 255 }),
  managerPhone: varchar("manager_phone", { length: 50 }),
  fssaiNumber: varchar("fssai_number", { length: 100 }),
  gstin: varchar("gstin", { length: 100 }),
  openedAt: varchar("opened_at", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveOrdersDb = mysqlTable("live_orders", {
  id: varchar("id", { length: 100 }).primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  outletId: varchar("outlet_id", { length: 100 }).notNull().references(() => franchiseOutlets.id, { onDelete: "cascade" }),
  customerName: varchar("customer_name", { length: 255 }),
  channel: mysqlEnum("channel", ["Walk-in Counter", "Zomato", "Swiggy"]).notNull().default("Walk-in Counter"),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull().default("Cash"),
  itemsJson: text("items_json").notNull(),
  totalAmount: int("total_amount").notNull(),
  status: mysqlEnum("status", ["Completed", "Delivered"]).notNull().default("Completed"),
  time: varchar("time", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const centralShipmentsDb = mysqlTable("central_shipments", {
  id: varchar("id", { length: 100 }).primaryKey(),
  shipmentNumber: varchar("shipment_number", { length: 50 }).notNull().unique(),
  outletId: varchar("outlet_id", { length: 100 }).notNull().references(() => franchiseOutlets.id, { onDelete: "cascade" }),
  chickenConesCount: int("chicken_cones_count").notNull().default(0),
  muttonConesCount: int("mutton_cones_count").notNull().default(0),
  totalMeatWeightKg: double("total_meat_weight_kg").notNull().default(0),
  vanVehicleNumber: varchar("van_vehicle_number", { length: 100 }),
  driverName: varchar("driver_name", { length: 255 }),
  driverPhone: varchar("driver_phone", { length: 50 }),
  temperatureCelsius: double("temperature_celsius").notNull().default(2.8),
  securitySealNumber: varchar("security_seal_number", { length: 100 }),
  status: mysqlEnum("status", ["in_transit", "delivered", "preparing"]).notNull().default("in_transit"),
  dispatchedAt: varchar("dispatched_at", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FranchiseOutletDb = typeof franchiseOutlets.$inferSelect;
export type LiveOrderDb = typeof liveOrdersDb.$inferSelect;
export type CentralShipmentDb = typeof centralShipmentsDb.$inferSelect;

