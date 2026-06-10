// alter_attendance.js — Safely alters database for the new attendance features
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let databaseUrl = "mysql://u257795766_admin:Thepiecraftmarketing%40123@srv2209.hstgr.io:3306/u257795766_crm";

// Try parsing from .env.local
try {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envLocalContent = fs.readFileSync(envLocalPath, "utf-8");
    const match = envLocalContent.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match && match[1]) {
      databaseUrl = match[1];
    }
  }
} catch (e) {
  console.error("Failed to parse .env.local:", e);
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || 3306,
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: {
      rejectUnauthorized: false
    }
  };
}

async function main() {
  console.log("Connecting to database:", databaseUrl.replace(/:[^:@/]+@/, ":****@"));
  const config = parseUrl(databaseUrl);
  const conn = await mysql.createConnection(config);

  try {
    console.log("Altering attendance table to add punch times...");
    // Add columns if they do not exist
    try {
      await conn.query("ALTER TABLE attendance ADD COLUMN punch_in_time DATETIME DEFAULT NULL");
      console.log("Column punch_in_time added successfully.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("Column punch_in_time already exists.");
      } else {
        throw err;
      }
    }

    try {
      await conn.query("ALTER TABLE attendance ADD COLUMN punch_out_time DATETIME DEFAULT NULL");
      console.log("Column punch_out_time added successfully.");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("Column punch_out_time already exists.");
      } else {
        throw err;
      }
    }

    console.log("Creating leaves table if it doesn't exist...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_type VARCHAR(255) NOT NULL,
        start_date VARCHAR(255) NOT NULL,
        end_date VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(255) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Leaves table created successfully (or already exists).");

  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await conn.end();
    console.log("Database connection closed.");
  }
}

main();
