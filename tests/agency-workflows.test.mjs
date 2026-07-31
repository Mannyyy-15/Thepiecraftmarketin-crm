import test from "node:test";
import assert from "node:assert/strict";
import {
  agencyRoleFromMembership,
  approvalInputSchema,
  timeEntryInputSchema,
} from "../lib/agency/domain.ts";
import { authorizeAgencyCommand } from "../lib/agency/policy.ts";

const actor = {
  userId: 7,
  organizationId: 12,
  role: "employee",
  clientAccountId: null,
};

test("membership roles map to the least-privileged agency role", () => {
  assert.equal(agencyRoleFromMembership("owner"), "admin");
  assert.equal(agencyRoleFromMembership("manager"), "employee");
  assert.equal(agencyRoleFromMembership("member"), "employee");
  assert.equal(agencyRoleFromMembership("client"), "client");
});

test("cross-organization commands are denied before persistence", () => {
  const decision = authorizeAgencyCommand({
    actor,
    projectAccessible: true,
    projectAssigned: true,
    command: {
      kind: "request.create",
      input: {
        organizationId: 99,
        projectId: 31,
        title: "Update contact form",
        description: "Please add the new qualification field.",
        priority: "normal",
        requestedById: 7,
      },
    },
  });

  assert.deepEqual(decision, { allowed: false, reason: "cross_organization" });
});

test("employees cannot submit time for another employee", () => {
  const decision = authorizeAgencyCommand({
    actor,
    projectAccessible: true,
    projectAssigned: true,
    command: {
      kind: "time_entry.create",
      input: {
        organizationId: 12,
        projectId: 31,
        employeeId: 8,
        description: "Landing page QA",
        startedAt: "2026-07-31T09:00:00+05:30",
        endedAt: "2026-07-31T10:00:00+05:30",
        billable: true,
      },
    },
  });

  assert.deepEqual(decision, { allowed: false, reason: "identity_mismatch" });
});

test("change requests require a comment", () => {
  const parsed = approvalInputSchema.safeParse({
    organizationId: 12,
    projectId: 31,
    subjectType: "design",
    subjectId: 40,
    decision: "changes_requested",
    version: 2,
  });

  assert.equal(parsed.success, false);
});

test("time entries reject reversed time ranges", () => {
  const parsed = timeEntryInputSchema.safeParse({
    organizationId: 12,
    projectId: 31,
    employeeId: 7,
    description: "QA",
    startedAt: "2026-07-31T10:00:00+05:30",
    endedAt: "2026-07-31T09:00:00+05:30",
  });

  assert.equal(parsed.success, false);
});
