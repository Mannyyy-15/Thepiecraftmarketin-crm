# Agency workflow persistence contract

The TypeScript contracts in this directory are active, validated foundations. The
CRM must not claim that workflow records were saved until the tables below exist
and an `AgencyWorkflowRepository` implementation is connected.

## Non-negotiable access rules

- Resolve the current user from the signed session, then resolve an **active**
  `organization_memberships` row on the server.
- Never derive `organizationId` from a JWT claim or accept it without checking
  membership.
- Every workflow `SELECT`, `UPDATE`, and `DELETE` predicate includes
  `organization_id`. An ID lookup followed by a later tenant check is unsafe.
- Employee project mutations require an active project assignment.
- Client reads and decisions require the project/account to belong to the
  client membership.
- Use transactions for approval/version changes, timer start/stop, change-order
  acceptance, and deployment status transitions.
- Store file references as private object IDs. Never store public upload paths.

## Required tables

Every table includes `id INT PRIMARY KEY AUTO_INCREMENT`,
`organization_id INT NOT NULL`, `created_at`, and `updated_at`, with a foreign
key to `organizations(id)` and an index beginning with `organization_id`.

| Table | Required workflow fields |
| --- | --- |
| `project_assignments` | `project_id`, `user_id`, `assignment_role`, `active` |
| `discovery_briefs` | `project_id`, `title`, `business_goals_json`, `audiences_json`, `competitors_json`, `success_metrics_json`, `constraints`, `due_date`, `version`, `status` |
| `sitemap_nodes` | `project_id`, `parent_id`, `label`, `path`, `purpose`, `sort_order`, `version` |
| `approval_requests` | `project_id`, `subject_type`, `subject_id`, `subject_version`, `status`, `requested_by_id`, `requested_at`, `decided_by_id`, `decided_at`, `comment` |
| `deliverables` | `project_id`, `title`, `description`, `type`, `status`, `due_date`, `assignee_id`, `storage_object_id`, `external_url`, `version` |
| `project_environments` | `project_id`, `name`, `base_url`, `provider`, `external_environment_id` |
| `deployments` | `project_id`, `environment_id`, `external_deployment_id`, `commit_sha`, `status`, `initiated_by_id`, `deployed_at`, `failure_summary` |
| `maintenance_checks` | `project_id`, `environment_id`, `check_type`, `status`, `observed_at`, `next_due_at`, `summary`, `evidence_json` |
| `client_requests` | `project_id`, `title`, `description`, `priority`, `status`, `requested_by_id`, `desired_date`, `assigned_to_id` |
| `change_orders` | `project_id`, `request_id`, `title`, `scope`, `reason`, `currency`, `amount_minor`, `effort_minutes`, `schedule_impact_days`, `status`, `expires_at` |
| `time_entries` | `project_id`, `employee_id`, `task_id`, `description`, `started_at`, `ended_at`, `duration_minutes`, `billable`, `status`, `proof_object_id` |
| `checklist_templates` | `name`, `channel`, `version`, `active` |
| `checklist_template_items` | `template_id`, `item_key`, `label`, `required`, `evidence_required`, `sort_order` |
| `project_checklists` | `project_id`, `template_id`, `template_version`, `status`, `due_at`, `assigned_to_id` |
| `project_checklist_items` | `checklist_id`, `item_key`, `completed_at`, `completed_by_id`, `evidence_object_id`, `note` |
| `proof_of_work` | `project_id`, `employee_id`, `task_id`, `time_entry_id`, `storage_object_id`, `note`, `captured_at`, `review_status` |

## Critical unique/index constraints

- `project_assignments (organization_id, project_id, user_id)` unique
- `sitemap_nodes (organization_id, project_id, version, path)` unique
- `approval_requests (organization_id, subject_type, subject_id, subject_version)`
- `project_environments (organization_id, project_id, name)` unique
- `deployments (organization_id, provider, external_deployment_id)` unique
- `checklist_template_items (organization_id, template_id, item_key)` unique
- `project_checklist_items (organization_id, checklist_id, item_key)` unique
- At most one open time entry per employee. Enforce with a transaction/advisory
  lock if the selected MySQL version cannot express a filtered unique index.

## Activation sequence

1. Apply the tables and constraints in a reviewed migration.
2. Implement `AgencyWorkflowRepository` with organization-scoped queries.
3. Add private object storage, malware scanning, and signed-download checks.
4. Connect deployment/monitoring providers through encrypted organization
   credentials.
5. Add audit events for every state transition.
6. Seed checklist **templates only** through an explicit admin action.
7. Run disposable admin, employee, and client E2E scenarios before enabling the
   navigation item in production.

Use migration number `0004` or later; `0003_secure_login_links.sql` is reserved
for the passwordless onboarding flow.
