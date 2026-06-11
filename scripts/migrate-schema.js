/**
 * migrate-schema.js
 * Run once to bring the Hostinger DB fully in sync with lib/schema.ts.
 * Safe to run multiple times — uses IF NOT EXISTS / ER_DUP_FIELDNAME guards.
 *
 * Usage:  node scripts/migrate-schema.js
 */

const fs   = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// ── Resolve DATABASE_URL ──────────────────────────────────────────────────────
function getDbUrl() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const m = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m?.[1]) return m[1];
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL not found in .env.local or environment. Refusing to run without credentials.");
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    host:     u.hostname,
    port:     parseInt(u.port) || 3306,
    user:     u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl:      { rejectUnauthorized: false },
  };
}

// ── Safe column add ───────────────────────────────────────────────────────────
async function addColumn(conn, table, column, definition) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
    console.log(`  ✓  ${table}.${column} added`);
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log(`  –  ${table}.${column} already exists`);
    } else {
      throw err;
    }
  }
}

// ── Safe table create ─────────────────────────────────────────────────────────
async function createTable(conn, name, sql) {
  await conn.query(sql);
  console.log(`  ✓  ${name} table ensured`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const url = getDbUrl();
  console.log("Connecting to:", url.replace(/:[^:@/]+@/, ":****@"));
  const conn = await mysql.createConnection(parseUrl(url));

  try {

    // ── 1. users — add active_shift_profile if missing ──────────────────────
    console.log("\n[users]");
    await addColumn(conn, "users", "active_shift_profile",
      "VARCHAR(255) NOT NULL DEFAULT 'Standard Core Hours'");

    // ── 2. clients — add columns added after initial migration ───────────────
    console.log("\n[clients]");
    await addColumn(conn, "clients", "details",
      "TEXT DEFAULT '{}'");

    // ── 3. projects — add columns added after initial migration ──────────────
    console.log("\n[projects]");
    await addColumn(conn, "projects", "billing_cycle_start",
      "VARCHAR(255) DEFAULT NULL");
    await addColumn(conn, "projects", "contract_duration",
      "INT DEFAULT 0");
    await addColumn(conn, "projects", "client_contact_name",
      "VARCHAR(255) DEFAULT NULL");
    await addColumn(conn, "projects", "client_contact_phone",
      "VARCHAR(50) DEFAULT NULL");
    await addColumn(conn, "projects", "access_granted",
      "INT NOT NULL DEFAULT 0");
    await addColumn(conn, "projects", "contract_link",
      "VARCHAR(500) DEFAULT NULL");

    // ── 4. invoices — create if not yet present ──────────────────────────────
    console.log("\n[invoices]");
    await createTable(conn, "invoices", `
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\`             INT AUTO_INCREMENT NOT NULL,
        \`client_id\`      INT DEFAULT NULL,
        \`project_id\`     INT DEFAULT NULL,
        \`invoice_number\` VARCHAR(50)  NOT NULL,
        \`amount\`         INT          NOT NULL DEFAULT 0,
        \`status\`         VARCHAR(20)  NOT NULL DEFAULT 'draft',
        \`due_date\`       VARCHAR(255) DEFAULT NULL,
        \`paid_date\`      VARCHAR(255) DEFAULT NULL,
        \`notes\`          TEXT         DEFAULT NULL,
        \`created_at\`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`invoices_id\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`invoices_client_id_fk\`
          FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`invoices_project_id_fk\`
          FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE SET NULL
      )
    `);

    // ── 5. timesheets — create if not yet present ────────────────────────────
    console.log("\n[timesheets]");
    await createTable(conn, "timesheets", `
      CREATE TABLE IF NOT EXISTS \`timesheets\` (
        \`id\`               INT AUTO_INCREMENT NOT NULL,
        \`user_id\`          INT NOT NULL,
        \`project_id\`       INT DEFAULT NULL,
        \`description\`      VARCHAR(255) NOT NULL DEFAULT '',
        \`duration_minutes\` INT NOT NULL DEFAULT 0,
        \`date\`             VARCHAR(255) NOT NULL,
        \`status\`           VARCHAR(255) NOT NULL DEFAULT 'pending',
        \`created_at\`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`timesheets_id\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`timesheets_user_id_fk\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`timesheets_project_id_fk\`
          FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      )
    `);

    // ── 6. tasks — create if not yet present ─────────────────────────────────
    console.log("\n[tasks]");
    await createTable(conn, "tasks", `
      CREATE TABLE IF NOT EXISTS \`tasks\` (
        \`id\`          INT AUTO_INCREMENT NOT NULL,
        \`user_id\`     INT NOT NULL,
        \`project_id\`  INT DEFAULT NULL,
        \`title\`       VARCHAR(255) NOT NULL,
        \`priority\`    VARCHAR(20) NOT NULL DEFAULT 'medium',
        \`done\`        INT NOT NULL DEFAULT 0,
        \`due_date\`    VARCHAR(255) DEFAULT NULL,
        \`created_at\`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`tasks_id\` PRIMARY KEY (\`id\`),
        CONSTRAINT \`tasks_user_id_fk\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`tasks_project_id_fk\`
          FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE SET NULL
      )
    `);

    // ── 7. leaves — ensure reason column is TEXT (not NOT NULL) ─────────────
    // (earlier versions created it as NOT NULL TEXT which blocks inserts)
    console.log("\n[leaves]");
    try {
      await conn.query(`ALTER TABLE \`leaves\` MODIFY COLUMN \`reason\` TEXT DEFAULT NULL`);
      console.log("  ✓  leaves.reason made nullable");
    } catch (err) {
      console.log("  –  leaves.reason already correct");
    }

    // ── 8. leads — create if not yet present ─────────────────────────────────
    console.log("\n[leads]");
    await createTable(conn, "leads", `
      CREATE TABLE IF NOT EXISTS \`leads\` (
        \`id\`               INT AUTO_INCREMENT NOT NULL,
        \`name\`             VARCHAR(255) NOT NULL,
        \`contact_name\`     VARCHAR(255) DEFAULT NULL,
        \`contact_phone\`    VARCHAR(50)  DEFAULT NULL,
        \`contact_email\`    VARCHAR(255) DEFAULT NULL,
        \`source\`           VARCHAR(100) DEFAULT NULL,
        \`service\`          VARCHAR(50)  DEFAULT NULL,
        \`stage\`            VARCHAR(50)  NOT NULL DEFAULT 'new',
        \`estimated_value\`  INT          NOT NULL DEFAULT 0,
        \`notes\`            TEXT         DEFAULT NULL,
        \`assigned_to\`      INT          DEFAULT NULL,
        \`follow_up_date\`   VARCHAR(255) DEFAULT NULL,
        \`created_at\`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`leads_pk\` PRIMARY KEY (\`id\`)
      )
    `);

    console.log("\n✅  Migration complete — all tables and columns are up to date.");

  } catch (err) {
    console.error("\n❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
