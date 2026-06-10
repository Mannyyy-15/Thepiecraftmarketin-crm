import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error("DATABASE_URL not found.");
  process.exit(1);
}

const conn = await mysql.createConnection({ uri: databaseUrl });

const columns = [
  // Phase 1 — original operational fields
  ["client_name", "VARCHAR(255)"],
  ["project_type", "VARCHAR(50) NOT NULL DEFAULT 'other'"],
  ["monthly_fee", "INT DEFAULT 0"],
  ["ad_spend_budget", "INT DEFAULT 0"],
  ["start_date", "VARCHAR(255)"],
  ["priority", "VARCHAR(20) NOT NULL DEFAULT 'medium'"],
  ["billing_model", "VARCHAR(50) DEFAULT 'fixed_fee'"],
  ["service_details", "TEXT DEFAULT '{}'"],
  // Phase 2 — CRM operational fields
  ["billing_cycle_start", "VARCHAR(255)"],
  ["contract_duration", "INT DEFAULT 0"],
  ["client_contact_name", "VARCHAR(255)"],
  ["client_contact_phone", "VARCHAR(50)"],
  ["access_granted", "INT NOT NULL DEFAULT 0"],
  ["contract_link", "VARCHAR(500)"],
];

for (const [col, def] of columns) {
  try {
    await conn.execute(`ALTER TABLE projects ADD COLUMN \`${col}\` ${def}`);
    console.log(`✓ Added: ${col}`);
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log(`  Already exists: ${col}`);
    } else {
      console.error(`✗ Failed ${col}:`, err.message);
    }
  }
}

// Create invoices table if it doesn't exist
try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`invoices\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`client_id\` INT,
      \`project_id\` INT,
      \`invoice_number\` VARCHAR(50) NOT NULL,
      \`amount\` INT NOT NULL DEFAULT 0,
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'draft',
      \`due_date\` VARCHAR(255),
      \`paid_date\` VARCHAR(255),
      \`notes\` TEXT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE SET NULL
    )
  `);
  console.log("✓ invoices table ready");
} catch (err) {
  console.error("✗ invoices table:", err.message);
}

await conn.end();
console.log("Done.");
