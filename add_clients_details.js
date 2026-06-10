const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const envPath = path.resolve(__dirname, './.env.local');
  if (!fs.existsSync(envPath)) {
    console.error("Env file not found at " + envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  let dbUrl = '';
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.substring('DATABASE_URL='.length).replace(/['"]/g, '');
    }
  });

  if (!dbUrl) {
    console.error("No DATABASE_URL set in env.local");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const conn = await mysql.createConnection(dbUrl);
  try {
    console.log("Adding details column to clients table...");
    await conn.query("ALTER TABLE clients ADD COLUMN details TEXT;");
    console.log("Column successfully added!");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'details' already exists.");
    } else {
      console.error("Error altering table:", err);
    }
  } finally {
    await conn.end();
  }
}

run();
