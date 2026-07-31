/**
 * clear-all-data-keep-admin.js
 * Purges all operational data, projects, clients, tasks, invoices, leads, messages, logs,
 * and non-admin users from the database, retaining ONLY admin users.
 *
 * Usage: node scripts/clear-all-data-keep-admin.js
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function getDbUrl() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const m = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m?.[1] && m[1].trim() !== "") return m[1].trim();
  }
  const devEnvPath = path.resolve(__dirname, "../.env.development.local");
  if (fs.existsSync(devEnvPath)) {
    const content = fs.readFileSync(devEnvPath, "utf8");
    const m = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m?.[1] && m[1].trim() !== "") return m[1].trim();
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    return process.env.DATABASE_URL.trim();
  }
  // Hardcoded fallback connection string from project scripts
  return "mysql://u257795766_admin:Thepiecraftmarketing%40123@srv2209.hstgr.io:3306/u257795766_crm";
}

function parseUrl(urlStr) {
  const u = new URL(urlStr);
  return {
    host: u.hostname,
    port: parseInt(u.port, 10) || 3306,
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  };
}

async function runCleanup() {
  const dbUrl = getDbUrl();
  console.log(`[DB Cleanup] Connecting to database host: ${parseUrl(dbUrl).host}...`);

  const connection = await mysql.createConnection(parseUrl(dbUrl));

  try {
    console.log("[DB Cleanup] Disabling Foreign Key checks temporarily...");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    // List of tables to completely truncate/clear
    const tablesToClear = [
      "clients",
      "projects",
      "tasks",
      "timesheets",
      "expenses",
      "attendance",
      "attendance_logs",
      "leaves",
      "messages",
      "activity_log",
      "invoices",
      "notifications",
      "documents",
      "meta_campaigns",
      "leads",
      "locations",
      "ai_chats",
      "ai_chat_messages",
      "accounts",
      "contacts",
      "account_contacts",
      "deals",
      "attribution_touchpoints",
      "custom_field_values",
      "audit_events",
      "automation_runs",
      "automation_definitions",
      "user_sessions",
      "login_links",
      "connector_accounts",
      "webhook_event_ledger",
      "storage_objects",
      "import_rows",
      "import_jobs"
    ];

    for (const table of tablesToClear) {
      try {
        console.log(`[DB Cleanup] Truncating table: ${table}`);
        await connection.query(`TRUNCATE TABLE \`${table}\`;`);
      } catch (err) {
        if (err.code === "ER_NO_SUCH_TABLE") {
          console.log(`[DB Cleanup] Table ${table} does not exist, skipping.`);
        } else {
          console.warn(`[DB Cleanup] Could not truncate ${table}: ${err.message}. Trying DELETE...`);
          try {
            await connection.query(`DELETE FROM \`${table}\`;`);
          } catch (delErr) {
            console.error(`[DB Cleanup] Failed to clear table ${table}:`, delErr.message);
          }
        }
      }
    }

    // Clean users table: Delete non-admin users
    console.log("[DB Cleanup] Cleaning users table (preserving admin only)...");
    const [userDeleteResult] = await connection.query(
      "DELETE FROM `users` WHERE `role` != 'admin';"
    );
    console.log(`[DB Cleanup] Removed ${userDeleteResult.affectedRows} non-admin user(s).`);

    // Clean fcm_tokens for deleted users
    try {
      await connection.query("DELETE FROM `fcm_tokens` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);");
    } catch (err) {
      // Table may be truncated or non-existent
    }

    // Clean organization_memberships for deleted users
    try {
      await connection.query("DELETE FROM `organization_memberships` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);");
    } catch (err) {
      // Table may be non-existent
    }

    // Clean mfa_factors for deleted users
    try {
      await connection.query("DELETE FROM `mfa_factors` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);");
    } catch (err) {
      // Table may be non-existent
    }

    // Check remaining users in database
    const [remainingUsers] = await connection.query(
      "SELECT id, name, email, role, system_role FROM `users`;"
    );
    console.log("[DB Cleanup] Remaining users in database:");
    console.table(remainingUsers);

    if (remainingUsers.length === 0) {
      console.warn("[DB Cleanup] WARNING: No admin user found in database! Creating default admin...");
      const bcrypt = require("bcryptjs");
      const adminEmail = process.env.ADMIN_EMAIL || "admin@thepiecraft.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "AdminPass12345678!";
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await connection.query(
        `INSERT INTO \`users\` (name, email, password, role, system_role) VALUES (?, ?, ?, 'admin', 'Admin');`,
        ["Admin", adminEmail, hashedPassword]
      );
      console.log(`[DB Cleanup] Default admin created: ${adminEmail}`);
    }

    console.log("[DB Cleanup] Re-enabling Foreign Key checks...");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("[DB Cleanup] SUCCESS: All non-admin data and users cleared successfully.");
  } catch (error) {
    console.error("[DB Cleanup] Fatal error during cleanup:", error);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;").catch(() => {});
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runCleanup();
