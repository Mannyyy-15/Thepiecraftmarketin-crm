// Run: node scripts/migrate-agency-settings.js
// Adds business-profile + invoice-default columns to agency_settings.
// Safe to re-run (ignores duplicate-column errors).

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function getDbUrl() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const m = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (m && m[1]) return m[1];
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("DATABASE_URL not found.");
}

const COLUMNS = [
  "ADD COLUMN agency_email VARCHAR(255) NULL",
  "ADD COLUMN agency_phone VARCHAR(50) NULL",
  "ADD COLUMN agency_website VARCHAR(255) NULL",
  "ADD COLUMN agency_address TEXT NULL",
  "ADD COLUMN gst_number VARCHAR(50) NULL",
  "ADD COLUMN invoice_tax_percent INT NULL DEFAULT 0",
  "ADD COLUMN invoice_payment_terms VARCHAR(255) NULL",
  "ADD COLUMN invoice_notes TEXT NULL",
  "ADD COLUMN bank_details TEXT NULL",
];

async function run() {
  const conn = await mysql.createConnection({ uri: getDbUrl(), ssl: { rejectUnauthorized: false } });
  console.log("Connected.");
  // Ensure the table exists first (in case it was never created).
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS agency_settings (
      id INT NOT NULL AUTO_INCREMENT,
      agency_name VARCHAR(255) NOT NULL DEFAULT 'ThePieCraft',
      agency_logo_url TEXT NULL,
      base_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      razorpay_key_id TEXT NULL,
      razorpay_key_secret TEXT NULL,
      smtp_host VARCHAR(255) NULL,
      smtp_port INT NULL DEFAULT 465,
      smtp_user VARCHAR(255) NULL,
      smtp_pass TEXT NULL,
      smtp_from VARCHAR(255) NULL,
      updated_at TIMESTAMP NULL DEFAULT NOW() ON UPDATE NOW(),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  for (const col of COLUMNS) {
    try {
      await conn.execute(`ALTER TABLE agency_settings ${col}`);
      console.log("✓", col);
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") console.log("• already exists:", col);
      else throw e;
    }
  }

  // Ensure a single settings row exists.
  const [rows] = await conn.execute("SELECT COUNT(*) AS cnt FROM agency_settings");
  if (rows[0].cnt === 0) {
    await conn.execute("INSERT INTO agency_settings (agency_name) VALUES ('ThePieCraft Marketing')");
    console.log("✓ seeded default settings row");
  }

  await conn.end();
  console.log("Migration complete.");
}

run().catch(err => { console.error(err); process.exit(1); });
