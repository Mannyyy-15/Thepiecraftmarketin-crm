import fs from "node:fs";
import mysql from "mysql2/promise";

const envFile = process.argv[2];
if (!envFile) throw new Error("Environment file path is required");

const line = fs
  .readFileSync(envFile, "utf8")
  .split(/\r?\n/)
  .find((entry) => entry.startsWith("DATABASE_URL="));

if (!line) throw new Error("DATABASE_URL is missing");

const databaseUrl = line
  .slice("DATABASE_URL=".length)
  .replace(/^"|"$/g, "")
  .replace(/\\n/g, "\n");

const connection = await mysql.createConnection({
  uri: databaseUrl,
  connectTimeout: 15_000,
  ...(process.argv.includes("--production-tls")
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

try {
  const [[database]] = await connection.query(
    "SELECT DATABASE() AS name, VERSION() AS version",
  );
  const [tables] = await connection.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name",
  );
  const names = new Set(tables.map((row) => row.TABLE_NAME ?? row.table_name));
  const [tenantColumns] = await connection.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND (
        (table_name = 'documents' AND column_name = 'organization_id')
        OR (table_name = 'locations' AND column_name = 'organization_id')
      )
  `);

  let roleCounts = [];
  if (names.has("users")) {
    [roleCounts] = await connection.query(
      "SELECT role, COUNT(*) AS count FROM users GROUP BY role",
    );
  }

  let organizationCount = null;
  if (names.has("organizations")) {
    const [[row]] = await connection.query(
      "SELECT COUNT(*) AS count FROM organizations",
    );
    organizationCount = Number(row.count);
  }

  let invoiceDuplicates = [];
  if (names.has("invoices")) {
    [invoiceDuplicates] = await connection.query(`
      SELECT invoice_number, COUNT(*) AS count
      FROM invoices
      GROUP BY invoice_number
      HAVING COUNT(*) > 1
      LIMIT 20
    `);
  }

  let migrationRows = [];
  if (names.has("__drizzle_migrations")) {
    [migrationRows] = await connection.query(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id",
    );
  }

  const [relevantIndexes] = await connection.query(`
    SELECT table_name, index_name, non_unique
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND (
        (table_name = 'invoices' AND index_name = 'invoices_invoice_number_unique')
        OR (table_name = 'documents' AND index_name IN ('documents_org_created_idx', 'documents_client_created_idx'))
        OR (table_name = 'locations' AND index_name = 'locations_organization_idx')
      )
    GROUP BY table_name, index_name, non_unique
    ORDER BY table_name, index_name
  `);

  console.log(
    JSON.stringify(
      {
        database: database.name,
        version: database.version,
        tableCount: tables.length,
        hasDocumentsTenantColumn: tenantColumns.some(
          (row) => (row.TABLE_NAME ?? row.table_name) === "documents",
        ),
        hasLocationsTenantColumn: tenantColumns.some(
          (row) => (row.TABLE_NAME ?? row.table_name) === "locations",
        ),
        roles: roleCounts.map((row) => ({
          role: row.role,
          count: Number(row.count),
        })),
        organizationCount,
        invoiceDuplicateGroups: invoiceDuplicates.length,
        migrationRows: migrationRows.map((row) => ({
          id: Number(row.id),
          createdAt: Number(row.created_at),
        })),
        relevantIndexes: relevantIndexes.map((row) => ({
          table: row.TABLE_NAME ?? row.table_name,
          index: row.INDEX_NAME ?? row.index_name,
          unique: Number(row.NON_UNIQUE ?? row.non_unique) === 0,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  await connection.end();
}
