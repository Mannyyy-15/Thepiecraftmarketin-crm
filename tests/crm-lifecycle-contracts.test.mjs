import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const crmSource = await readFile(
  new URL("../app/actions/crm.ts", import.meta.url),
  "utf8"
);
const clientAdminSource = await readFile(
  new URL("../app/admin/clients/page.tsx", import.meta.url),
  "utf8"
);

function blockStartingAt(source, start) {
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, "Expected a function body");
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail("Expected a balanced function body");
}

function action(name) {
  const marker = `export async function ${name}`;
  const start = crmSource.indexOf(marker);
  assert.notEqual(start, -1, `Missing server action ${name}`);
  return blockStartingAt(crmSource, start);
}

function expandedRevalidationSource(actionName) {
  const body = action(actionName);
  const helpers = Array.from(
    body.matchAll(/\b(revalidate(?!Path\b)[A-Za-z0-9_]+)\s*\(/g),
    (match) => match[1]
  );
  const helperBodies = helpers.map((name) => {
    const start = crmSource.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
    return start === -1 ? "" : blockStartingAt(crmSource, start);
  });
  return [body, ...helperBodies].join("\n");
}

function assertRevalidates(actionName, paths) {
  const source = expandedRevalidationSource(actionName);
  for (const path of paths) {
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      source,
      new RegExp(`["']${escaped}["']`),
      `${actionName} must invalidate ${path}`
    );
  }
}

test("client onboarding links clients.ownerId to the active client portal identity", () => {
  assert.match(clientAdminSource, /createClientAccount\(cfd\)/);

  const atomicSource = action("createClientAccount");
  assert.match(atomicSource, /db\.transaction/);
  assert.match(atomicSource, /role:\s*"client"/);
  assert.match(atomicSource, /ownerId:\s*userId/);
  assert.match(atomicSource, /organizationId:\s*context\.organizationId/);

  const source = action("onboardClient");
  assert.match(
    source,
    /isActiveOrganizationUser\(\s*context\.organizationId,\s*ownerId,\s*\["client"\]\s*\)/s,
    "onboardClient must accept the client portal identity, not an employee account manager"
  );
  assert.match(source, /organizationId:\s*context\.organizationId/);
  assert.match(source, /ownerId:\s*ownerId/);
});

test("invoice writes and admin reads are scoped to the active organization", () => {
  for (const name of ["createInvoice", "createInvoiceFull"]) {
    const source = action(name);
    assert.match(source, /getAdminOrganizationContext\(session\)/);
    assert.match(source, /organizationId:\s*context\.organizationId/);
    assert.match(source, /schema\.clients\.organizationId/);
  }

  const invoiceRead = action("getInvoices");
  assert.match(invoiceRead, /getAdminOrganizationContext\(session\)/);
  assert.match(invoiceRead, /eq\(schema\.invoices\.organizationId,\s*context\.organizationId\)/);

  const clientRead = action("getClientsEnriched");
  assert.match(clientRead, /getAdminOrganizationContext\(session\)/);
  assert.match(clientRead, /eq\(schema\.clients\.organizationId,\s*context\.organizationId\)/);
  assert.match(clientRead, /eq\(schema\.projects\.organizationId,\s*context\.organizationId\)/);
  assert.match(clientRead, /eq\(schema\.invoices\.organizationId,\s*context\.organizationId\)/);
});

test("client document reads use the linked client id without a name-based fallback", () => {
  const source = action("getClientDocuments");
  assert.match(source, /getOwnedClientId\(session\)/);
  assert.match(source, /eq\(schema\.documents\.clientId,\s*clientId\)/);
  assert.doesNotMatch(source, /schema\.documents\.clientName/);
});

test("project, task, invoice, and document mutations invalidate every affected portal", () => {
  assertRevalidates("updateProjectStatus", [
    "/admin",
    "/admin/projects",
    "/employee/projects",
    "/client/projects",
  ]);
  assertRevalidates("toggleTaskStatus", [
    "/admin",
    "/admin/projects",
    "/employee/tasks",
    "/employee/projects",
    "/client",
  ]);
  assertRevalidates("updateInvoiceStatus", [
    "/admin",
    "/admin/invoices",
    "/client",
    "/client/invoices",
  ]);
  assertRevalidates("createDocument", [
    "/admin/documents",
    "/employee/documents",
    "/client/documents",
  ]);
});
