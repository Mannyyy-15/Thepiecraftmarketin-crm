import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canManageTenant,
  canReadTenant,
  canWriteCrm,
  isAllowedTenantRole,
  isTenantRole,
} from "../lib/tenancy/policy.mjs";

test("tenant policy keeps client access read-only", () => {
  assert.equal(canReadTenant("client"), true);
  assert.equal(canWriteCrm("client"), false);
  assert.equal(canManageTenant("client"), false);
});

test("tenant management is restricted to owners and admins", () => {
  assert.equal(canManageTenant("owner"), true);
  assert.equal(canManageTenant("admin"), true);
  assert.equal(canManageTenant("manager"), false);
  assert.equal(canWriteCrm("manager"), true);
  assert.equal(canWriteCrm("member"), true);
});

test("unknown or global roles never become tenant roles", () => {
  assert.equal(isTenantRole("superadmin"), false);
  assert.equal(isTenantRole("employee"), false);
  assert.equal(isAllowedTenantRole("owner", ["owner"]), true);
  assert.equal(isAllowedTenantRole("owner", ["member"]), false);
});

test("tenant migration has a deterministic, non-destructive legacy backfill", async () => {
  const migration = await readFile(
    new URL("../drizzle/0002_tenant_foundation.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /WHERE NOT EXISTS[\s\S]*thepiecraft/);
  assert.match(migration, /UPDATE `users` SET `organization_id`/);
  assert.match(migration, /INSERT IGNORE INTO `organization_memberships`/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|DATABASE)\b/i);
});
