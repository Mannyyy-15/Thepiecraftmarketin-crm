import fs from "node:fs";
import mysql from "mysql2/promise";

const [envFile, migrationFile, confirmation] = process.argv.slice(2);
if (!envFile || !migrationFile || confirmation !== "--confirm") {
  throw new Error(
    "Usage: node scripts/apply-sql-migration.mjs <env-file> <migration-file> --confirm",
  );
}

const line = fs
  .readFileSync(envFile, "utf8")
  .split(/\r?\n/)
  .find((entry) => entry.startsWith("DATABASE_URL="));

if (!line) throw new Error("DATABASE_URL is missing");

const databaseUrl = line
  .slice("DATABASE_URL=".length)
  .replace(/^"|"$/g, "")
  .replace(/\\n/g, "\n");

const statements = fs
  .readFileSync(migrationFile, "utf8")
  .split("--> statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

const connection = await mysql.createConnection({
  uri: databaseUrl,
  connectTimeout: 15_000,
});

try {
  for (const [index, statement] of statements.entries()) {
    await connection.query(statement);
    console.log(`Applied statement ${index + 1}/${statements.length}`);
  }
} finally {
  await connection.end();
}
