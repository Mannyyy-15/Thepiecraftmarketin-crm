// Run: node scripts/migrate-punch-tables.js
// Creates locations and attendance_logs tables in production DB.
// Safe to re-run (uses IF NOT EXISTS).

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
  throw new Error("DATABASE_URL not found in .env.local or environment.");
}

async function run() {
  const conn = await mysql.createConnection({ uri: getDbUrl(), ssl: { rejectUnauthorized: false } });
  console.log("Connected to database.");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS locations (
      id            INT           NOT NULL AUTO_INCREMENT,
      name          VARCHAR(255)  NOT NULL,
      address       VARCHAR(500)  DEFAULT NULL,
      latitude      DECIMAL(10,8) NOT NULL,
      longitude     DECIMAL(11,8) NOT NULL,
      radius_meters INT           NOT NULL DEFAULT 100,
      wifi_public_ip VARCHAR(45)  NOT NULL COMMENT 'Public static IP of the office router',
      created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ locations table ready");

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id           INT          NOT NULL AUTO_INCREMENT,
      user_id      INT          NOT NULL,
      location_id  INT          NOT NULL,
      punch_type   ENUM('IN','OUT') NOT NULL,
      verified_ip  VARCHAR(45)  NOT NULL,
      punched_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id),
      CONSTRAINT fk_al_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
      CONSTRAINT fk_al_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      INDEX idx_al_user_date (user_id, punched_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log("✓ attendance_logs table ready");

  // Seed a default office location if none exist (update the values for your real office)
  const [rows] = await conn.execute("SELECT COUNT(*) AS cnt FROM locations");
  if (rows[0].cnt === 0) {
    await conn.execute(`
      INSERT INTO locations (name, address, latitude, longitude, radius_meters, wifi_public_ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      "ThePieCraft HQ",
      "Mumbai, India",
      "19.07609000",   // ← Replace with your real office lat
      "72.87740000",   // ← Replace with your real office lng
      150,             // ← Radius in meters (150m is a good starting point)
      "0.0.0.0",       // ← IMPORTANT: Replace with your real office public static IP
    ]);
    console.log("✓ Default office location seeded — update wifi_public_ip before going live!");
  }

  await conn.end();
  console.log("Migration complete.");
}

run().catch(err => { console.error(err); process.exit(1); });
