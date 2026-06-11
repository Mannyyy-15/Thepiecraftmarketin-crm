import { db } from "../lib/db";
import { users, notifications } from "../lib/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Sending test notification to admins...");
  if (!db) {
    console.error("Database connection is null.");
    process.exit(1);
  }
  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  
  for (const admin of admins) {
    await db.insert(notifications).values({
      userId: admin.id,
      type: "message",
      title: "Test Android Notification \uD83D\uDCF2",
      message: "If you see this, native push notifications are working perfectly!",
      link: "/",
      isRead: false,
    });
  }
  console.log("Done!");
  process.exit(0);
}

run().catch(console.error);
