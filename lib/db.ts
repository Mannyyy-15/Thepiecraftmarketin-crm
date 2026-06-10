import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

let connectionPool: mysql.Pool | null = null;

if (connectionString) {
  if (process.env.NODE_ENV === "production") {
    connectionPool = mysql.createPool({ uri: connectionString });
  } else {
    if (!(global as any).dbPool) {
      (global as any).dbPool = mysql.createPool({ uri: connectionString });
    }
    connectionPool = (global as any).dbPool;
  }
} else {
  console.warn("⚠️ DATABASE_URL is not set in environment variables! Direct database connections will fail.");
}

export const db = connectionPool ? drizzle(connectionPool, { schema, mode: "default" }) : null;

// Helper to seed master admin if missing and sync all user names
let seedingPromise: Promise<void> | null = null;

export function ensureAdminSeeded() {
  if (!db) return Promise.resolve();
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@thepiecraft.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      
      const existingAdmins = await db.select()
        .from(schema.users)
        .where(eq(schema.users.role, "admin"))
        .limit(1);

      const adminName = adminEmail.split("@")[0];

      if (existingAdmins.length === 0) {
        console.log(`[Database] No admin found. Seeding master admin: ${adminEmail}`);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await db.insert(schema.users).values({
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          systemRole: "Admin",
        });
        console.log(`[Database] Master admin successfully seeded.`);
      } else {
        console.log("[Database] Admin already exists in users table.");
      }
    } catch (error) {
      console.error("[Database] Error checking or seeding admin:", error);
    }
  })();

  return seedingPromise;
}

// Trigger in background silently on load
// if (db) {
//   ensureAdminSeeded();
// }
