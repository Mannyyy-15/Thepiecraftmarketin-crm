import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
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
}

if (!databaseUrl) {
  console.warn("⚠️ DATABASE_URL is not set in environment variables or .env.local! Drizzle operations may fail.");
}

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl || "",
  },
});
