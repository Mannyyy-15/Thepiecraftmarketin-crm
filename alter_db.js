// alter_db.js — Safely alters users table to add system_role column
const mysql = require("mysql2/promise");

const DB_URL = "mysql://u257795766_admin:Thepiecraftmarketing%40123@srv2209.hstgr.io:3306/u257795766_crm";

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
  console.log("Connecting to database...");
  const config = parseUrl(DB_URL);
  const conn = await mysql.createConnection(config);

  try {
    console.log("Adding column system_role to users table if it doesn't exist...");
    // We can run an ALTER TABLE query. We use ADD COLUMN IF NOT EXISTS or handle error if it already exists
    try {
      await conn.query("ALTER TABLE users ADD COLUMN system_role VARCHAR(255) NOT NULL DEFAULT 'Web Developer'");
      console.log("Column system_role successfully added to users table!");
    } catch (err) {
      if (err.code === "ER_DUP_FIELDNAME") {
        console.log("Column system_role already exists in users table.");
      } else {
        throw err;
      }
    }

    // Double check users table structure
    const [columns] = await conn.query("SHOW COLUMNS FROM users");
    console.log("Current users table columns:", columns.map(c => `${c.Field} (${c.Type})`));
  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await conn.end();
  }
}

main();
