import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating fcm_tokens table...");
  if (!db) {
    console.error("Database connection is null.");
    process.exit(1);
  }
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      device_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
