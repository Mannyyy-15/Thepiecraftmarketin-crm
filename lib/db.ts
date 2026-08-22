import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const allowInsecureLocalDatabase =
  process.env.NODE_ENV !== "production" &&
  process.env.DATABASE_SSL_MODE === "disabled";
const databaseCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");

let connectionPool: mysql.Pool | null = null;

// Pool tuned for Hostinger + Vercel serverless. Each warm lambda keeps a small
// pool; reusing a global pool across invocations prevents connection exhaustion
// (Hostinger caps concurrent connections, and a new pool per request blows past it).
const poolOptions: mysql.PoolOptions = {
  uri: connectionString,
  ssl: allowInsecureLocalDatabase
    ? undefined
    : {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
        ...(databaseCa ? { ca: databaseCa } : {}),
      },
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 30_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
};

if (connectionString) {
  // Reuse one global pool in BOTH dev (HMR) and prod (lambda reuse) so we never
  // leak pools. globalThis survives module re-evaluation within a warm instance.
  const g = globalThis as any;
  if (!g.__dbPool) {
    g.__dbPool = mysql.createPool(poolOptions);
  }
  connectionPool = g.__dbPool;
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
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (
        !adminEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) ||
        !adminPassword ||
        adminPassword.length < 16 ||
        adminPassword.length > 128
      ) {
        throw new Error(
          "ADMIN_EMAIL and a strong ADMIN_PASSWORD (16-128 characters) are required to seed an administrator."
        );
      }
      
      const existingAdmins = await db.select()
        .from(schema.users)
        .where(eq(schema.users.role, "admin"))
        .limit(1);

      const adminName = adminEmail.split("@")[0];

      if (existingAdmins.length === 0) {
        console.log(`[Database] No admin found. Seeding master admin: ${adminEmail}`);
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        const [insertedUser] = await db.insert(schema.users).values({
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
          systemRole: "Admin",
        });

        // Ensure primary organization & membership exists
        let [org] = await db.select({ id: schema.organizations.id }).from(schema.organizations).limit(1);
        if (!org) {
          const [newOrg] = await db.insert(schema.organizations).values({
            name: "Irani Koyla Brand HQ",
            slug: "irani-koyla",
          });
          org = { id: newOrg.insertId };
        }

        if (insertedUser?.insertId && org?.id) {
          await db.insert(schema.organizationMemberships).values({
            organizationId: org.id,
            userId: insertedUser.insertId,
            role: "owner",
            status: "active",
          });
        }
        console.log(`[Database] Master admin successfully seeded.`);
      } else {
        console.log("[Database] Admin already exists in users table.");
      }
    } catch (error) {
      console.error("[Database] Error checking or seeding admin:", error);
      seedingPromise = null;
      throw error;
    }
  })();

  return seedingPromise;
}

// Trigger in background silently on load
// if (db) {
//   ensureAdminSeeded();
// }
