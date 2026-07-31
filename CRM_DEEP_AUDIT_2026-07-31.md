# ThePieCraft CRM — Deep Technical, Product, UI/UX, Android and iOS-Readiness Audit

**Audit date:** 31 July 2026  
**Scope:** Next.js CRM, server actions/API routes, MySQL/Drizzle data model, desktop and mobile UI, Capacitor Android/iOS shells, security, scalability, maintainability, and CRM product usefulness.  
**Method:** Static code review, dependency/security audit, TypeScript and production builds, authenticated rendered-route inspection, responsive viewport checks, console-error checks, and Android Gradle build.

## Remediation status after this audit

The findings below preserve the original baseline. The implementation pass completed immediately afterward closed the most dangerous application-level issues:

- removed the JWT fallback and default admin credentials; added signed-session claim validation, stronger cookies, and live user/role revalidation
- centralized record ownership checks and scoped admin, employee, and client reads/mutations across clients, projects, tasks, documents, campaigns, attendance, finance, messages, and reports
- stopped password-hash serialization, plaintext quick-created passwords, synthetic payments, random ad metrics, fake uptime data, and fabricated website-health scores
- made lead intake, cron reminders, Razorpay payment links, and Razorpay webhooks fail closed with validation, size limits, timing-safe secret checks, invoice/amount verification, and idempotent paid-state updates
- hardened outbound email, database TLS, security headers, Capacitor navigation, Android permissions/network security, and iOS privacy/safe-area configuration
- added the unique invoice-number migration, shared accessible Radix dialog primitive, 44px mobile targets, focus/reduced-motion support, safe-area navigation, and corrected KPI animation
- upgraded Next.js from 14.1.0 to 15.5.21 and added non-interactive lint, typecheck, security-boundary tests, and a combined verification command

Post-remediation verification: lint passes with zero warnings, TypeScript passes, 4 security tests pass, all 42 routes build, authenticated admin desktop/mobile route checks have no document overflow or console errors, role-route guards redirect correctly, and Android unit/debug assembly succeeds.

Still not production-complete: tenant isolation, private object storage, distributed rate limiting, a durable payment-event ledger, MFA/session revocation, full page-local dialog/table accessibility migration, removal of all legacy mock/demo modules, integration/E2E tests with disposable role accounts, signed Android release, and signed iOS/TestFlight validation.

## Executive verdict

The product has a visually strong agency-operations interface and a useful starting feature set, but it is **not safe to release as a production multi-user CRM yet**. The main blockers are authorization gaps, password-hash and secret exposure, unauthenticated or fail-open actions, payment-integrity problems, vulnerable dependencies, unsafe file storage, and the absence of a tenant boundary.

This is currently closer to a **single-agency internal prototype** than a scalable CRM SaaS. The fastest good path is to stop adding surface features for a short hardening cycle, establish a secure domain/service layer and tenant-aware schema, then resume product work.

### Scorecard

| Area | Score | Verdict |
|---|---:|---|
| Visual design — desktop | 7/10 | Polished, coherent, good information density |
| UX — Android/mobile web | 6/10 | Responsive and usable, but touch/accessibility and fixed-navigation issues remain |
| CRM usefulness | 5/10 | Broad modules, but several are shallow, simulated, or missing core CRM workflows |
| Functional reliability | 4/10 | Builds pass, but KPI, status, persistence, webhook, and authorization behavior is unreliable |
| Security and privacy | 2/10 | Multiple release-blocking vulnerabilities |
| Accessibility | 4/10 | Some good labels/safe-area work, but contrast, touch targets, icon labels, focus, and zoom need work |
| Code maintainability | 4/10 | Strict TypeScript passes, but giant files, duplicated pages, `any`, no lint enforcement, and no tests |
| SaaS scalability | 2/10 | No tenant model, weak indexing/pagination, manual migrations, and broad data reads |
| Android readiness | 5/10 | Debug build passes; release hardening and store workflow are missing |
| iOS readiness | 3/10 | Project exists, but entitlements, privacy declarations, APNs, signing, and native security are incomplete |

## What was verified

- `npx tsc --noEmit` passes.
- `npm run build` produces all 42 routes successfully.
- The build ends with an abnormal edge worker `SIGTERM` message despite exit code 0; investigate in CI.
- `npm run lint` does **not** lint. It opens the interactive ESLint setup wizard and exits without findings.
- `npm audit --omit=dev` reports **17 vulnerabilities: 2 critical, 7 high, 8 moderate**.
- Android `gradlew test assembleDebug` passes after using Android Studio's bundled JDK.
- iOS was not compiled because this audit host is Windows. The macOS CI workflow was inspected.
- Authenticated desktop inspection covered all major admin modules.
- Authenticated phone-width inspection covered dashboard, team, projects, leads, messages, invoices, documents, reports, and settings.
- No browser console warnings/errors appeared during the inspected route walk.
- Pages did not create document-level horizontal overflow at the tested desktop and phone widths.
- Mutating workflows were not executed against live data because there is no isolated test database or seeded end-to-end environment.

## P0 — release blockers

These should be fixed before exposing the CRM to employees or clients.

### 1. Hard-coded fallback JWT secret

`app/actions/auth.ts` and `middleware.ts` fall back to the same secret committed in source. Anyone with the code can forge admin sessions when `JWT_SECRET` is absent or misconfigured.

**Fix**

- Remove the fallback completely and fail startup when `JWT_SECRET` is missing or weak.
- Rotate the production secret.
- Add secret validation at boot.
- Prefer a proven session library with server-side session revocation, rotation, and device/session management.
- The helper is named `encrypt`, but the JWT is signed, not encrypted.

### 2. Password hashes are serialized to browsers

Several actions use unrestricted `select()` on `users` and return the complete row, including `password`:

- `getTeamUsers`
- `getFreshUserProfile`
- `getGlobalSearchData`
- some combined dashboard/project queries also load full user rows unnecessarily

This exposes password hashes to any caller allowed through those weak action guards. Even when the UI does not render the password, it can be present in the server-action response.

**Fix**

- Create explicit public DTOs and select only fields needed by the view.
- Make password/secret fields impossible to include by default.
- Add response-schema tests that fail if `password`, SMTP credentials, or payment secrets are serialized.

### 3. Plaintext default password creation

`quickAddEmployee` can be called by any authenticated user and inserts `"password123"` directly into the password column without hashing.

**Fix**

- Delete this action immediately.
- All invitations should create a one-time, expiring token; users set their own password.
- Enforce password strength, breach checks if appropriate, rotation of reset tokens, and forced session invalidation after password change.

### 4. Broken object-level authorization (BOLA/IDOR)

Many actions check only that a session exists, then accept an arbitrary record ID. Examples include:

- client checklist updates
- project status updates
- all-attendance reads
- reading another user's tasks
- task creation/update/stage/delete
- all-document and all-report reads/creates
- all-finance reads
- campaign reads/creates/deletes/status changes/simulated sync
- global search across clients, projects, and users
- contract signing
- simulated invoice payment

A client or employee can potentially call server actions directly even if the corresponding UI control is hidden.

**Fix**

- Centralize `requireSession`, `requireRole`, `requirePermission`, and record-ownership checks.
- Define a permission matrix for admin, manager, employee, finance, sales, client, and future custom roles.
- Every query and mutation must include `tenantId` plus an ownership/assignment predicate where applicable.
- Add negative authorization integration tests for every server action.

### 5. Payment integrity can be bypassed

- The Razorpay webhook proceeds when the webhook secret is missing.
- When a secret exists but the signature header is missing, verification is also skipped.
- `simulateStripePayment` allows any authenticated caller to mark any invoice paid.
- Payment-link generation is exported without its own authentication boundary.
- Webhook handling does not persist event IDs or prevent replay.

**Fix**

- Reject all webhook requests unless both secret and valid signature exist.
- Use timing-safe signature comparison.
- Validate event type, account, currency, amount, invoice ownership, and payment-link ID.
- Add an idempotent webhook-event table with a unique provider event ID.
- Remove simulated payments from production builds.
- Make invoice payment status derive only from verified provider events or explicit finance-admin reconciliation.

### 6. Fail-open external endpoints

- Lead submission becomes unauthenticated when `LEADS_SUBMIT_TOKEN` is absent.
- Invoice-reminder cron becomes unauthenticated when `CRON_SECRET` is absent.
- `triggerEmailNotification` has no authentication and can become an open SMTP relay.

**Fix**

- Fail closed whenever a required secret is missing.
- Remove the exported generic email action; expose narrow, permission-checked email use cases.
- Add rate limiting, request-size limits, schema validation, bot protection, idempotency, and audit logs.
- Restrict CORS to known origins for browser-originated forms.

### 7. Uploads are unsafe, public, and unreliable in production

Avatar, document, and signature actions write directly into `public/uploads`:

- no reliable MIME/content validation
- no file-size limit
- no malware scanning
- filenames can collide/overwrite for documents
- uploaded records are publicly guessable
- no tenant authorization on download
- local application filesystem writes are unsuitable for serverless/Vercel persistence

**Fix**

- Use private object storage with tenant-prefixed UUID keys.
- Generate short-lived signed download URLs after authorization.
- Validate magic bytes, MIME, extension, and size.
- Scan uploads and strip unsafe metadata where appropriate.
- Store file metadata, owner, tenant, checksum, and version in the database.

### 8. Critical/high dependency vulnerabilities

The current tree includes vulnerable Next.js 14.1.0 and vulnerable transitive packages, plus high-risk advisories in Nodemailer, Axios/form-data, PostCSS, Undici, Glob/brace-expansion, and Tar.

**Fix**

- Upgrade Next.js at least to a fully patched compatible release, preferably through a planned framework upgrade.
- Apply non-breaking dependency updates first, then test breaking upgrades in a branch.
- Add Dependabot/Renovate, lockfile review, `npm audit`, and software-composition checks to CI.
- Do not run `npm audit fix --force` blindly.

### 9. Capacitor WebView is over-permissive

The native shell sets:

- `cleartext: true`
- `allowNavigation: ["*"]`
- Android `allowMixedContent: true`
- a remotely hosted production URL as the application surface

This weakens transport and navigation isolation. A compromised navigation can expose native plugin capabilities to an untrusted origin.

**Fix**

- HTTPS only; disable cleartext and mixed content.
- Allow only exact production and controlled authentication domains.
- Explicitly gate native bridges by origin.
- Add certificate/network-security configuration as appropriate.
- Decide whether the app will ship bundled web assets or a controlled remote shell and document the security/update model.

### 10. Sensitive integration secrets are stored and returned unsafely

Agency settings contain Razorpay secret and SMTP password as plaintext database fields. `getAgencySettings` returns the entire settings row to the admin browser.

**Fix**

- Store secrets in a managed secret vault/KMS, not normal tenant rows.
- Return only masked status such as “configured”.
- Split public agency profile from integration credentials.
- Encrypt sensitive values at rest with envelope encryption if database storage is unavoidable.
- Add secret rotation and access audit events.

### 11. Service-account key exists in the working tree

`firebase-adminsdk.json` is ignored by Git but present at the project root. This is easy to leak through backups, ZIPs, APK packaging mistakes, screen sharing, or support bundles.

**Fix**

- Remove local JSON credentials and use platform-managed environment secrets/workload identity.
- Rotate the key if it was ever shared or copied outside the secure machine.
- Add secret scanning in pre-commit and CI.

### 12. Tracked debug log contains user/session metadata

`debug_getProjectById.log` is tracked and contains admin email, identity, roles, timestamps, and repeated session payload metadata.

**Fix**

- Remove it from version control and history if the repository was shared.
- Add structured logging with redaction and retention.
- Never log tokens, JWT payloads, passwords, full request bodies, FCM tokens, or integration secrets.

## P1 — high-priority reliability and data fixes

### Establish a real SaaS tenant boundary

There is no `tenant`, `organization`, or `agencyId` foreign key. All current records live in one global namespace.

Before adding a second agency:

- add `tenants`, `memberships`, `roles`, and `permissions`
- add `tenantId` to every business record
- use composite unique keys such as `(tenantId, invoiceNumber)`
- require tenant scope in the data-access layer
- test cross-tenant denial explicitly
- define tenant lifecycle, deletion/export, plan limits, storage quotas, and billing

### Replace manual schema drift with migrations

The Drizzle journal contains only one formal migration and the initial SQL does not include many current tables, including invoices, documents, campaigns, leads, locations, FCM, AI chats, and agency settings. One-off scripts are being used as migrations.

**Fix**

- Generate immutable forward migrations for every schema change.
- Add migration checks to CI and a staging migration rehearsal.
- Back up before production migrations and document rollback/forward-fix procedures.

### Add constraints and indexes

Most status columns are free-form strings, and important lookup/index paths are missing.

Add:

- unique invoice/document number constraints
- unique attendance `(tenantId, userId, date)`
- indexes for all foreign keys and common filters/sorts
- message indexes on sender/receiver/created time
- task indexes on user/project/status/due date
- invoice indexes on client/status/due date
- notification indexes on user/read/created time
- lead indexes on tenant/stage/owner/follow-up
- database checks/enums or canonical status tables

### Normalize inconsistent statuses

The code uses both `in_progress` and `in-progress`, plus multiple attendance variants such as `present`, `checked_in`, `on-leave`, `vacation`, `off`, and `off_duty`. This breaks filters, KPIs, and reporting.

Create one canonical status vocabulary, migrate old values, and share typed constants between database, server, and UI.

### Use transactions for multi-step workflows

There are no database transactions. Lead conversion, invoice plus document creation, leave approval plus attendance updates, payment plus notification updates, and full-data clearing can partially succeed.

Wrap multi-row workflows in transactions and use idempotency keys for externally retried operations.

### Fix invoice numbering and money representation

Invoice numbers are generated from total row count, which races under concurrency and reuses numbers after deletion. Invoice/document creation is not transactional.

- use a locked per-tenant sequence
- add a unique constraint
- store money in minor units (`paise`) or a precise decimal strategy
- store currency per document
- support GST breakdown, TDS, discounts, partial payments, credit notes, refunds, and immutable issued-invoice snapshots

### Remove simulated analytics presented as real

Examples:

- hard-coded KPI changes such as `+20.1%`, `+12.5%`, `+4`, and `+1`
- fixed “74%” utilization in the executive digest
- website inspector Lighthouse/traffic values from `mockData`
- campaign “sync” that changes spend/clicks with `Math.random()`
- project progress fixed at zero in dashboard mapping

Simulated data must be clearly marked demo-only and disabled in production. Trust is a core CRM requirement.

### Fix the KPI count-up bug

`KpiCard` starts counting at the initial value and permanently sets `started.current`. When async data changes from 0 to the real value, the card can remain at 0. This was reproduced on the mobile Team screen: two employee cards were visible while “Active Team Size” and “System Role Types” remained 0.

Reset the animation when the target changes, or do not render/count until loading finishes.

### Scope and paginate data access

Many actions load entire tables into memory and filter in JavaScript. Examples include projects, messages, invoices, users, reports, attendance, and global search.

- paginate all list endpoints
- filter and aggregate in SQL
- use cursor pagination for feeds/messages
- debounce server-side search
- never ship full datasets to create dropdowns
- add query timing and slow-query monitoring

### Reconcile the client ownership model

Comments and code disagree about `clients.ownerId`. Some paths treat it as the employee/account manager; client-portal paths treat it as the client's user ID. Lead conversion assigns it to a staff member, which can break client-portal mapping and data isolation.

Use separate columns/tables:

- `clientOrganizationId`
- `portalUserMemberships`
- `accountManagerId`
- `salesOwnerId`

## Architecture and code-quality audit

### Split monoliths

- `app/actions/crm.ts`: roughly 3,445 lines and 117 exported actions
- `app/admin/team/page.tsx`: roughly 2,185 lines
- `app/admin/projects/page.tsx`: roughly 1,760 lines
- `components/TopNav.tsx`: roughly 834 lines

Split by bounded domain:

- auth/identity
- tenants/memberships/RBAC
- leads/deals
- accounts/contacts
- projects/tasks/time
- attendance/leave
- messaging/notifications
- documents/files
- billing/payments
- reporting
- integrations

Each domain should have schemas, repositories, services/use cases, validators, DTOs, and tests.

### Remove duplicated role pages

Employee and client website-development pages are byte-identical, while the admin copy is nearly identical. This duplicates bugs and makes permissions a UI concern.

Extract shared views and put authorization/data shaping on the server.

### Enforce validation

Zod is installed but unused. Inputs accept arbitrary strings, statuses, IDs, JSON blobs, URLs, dates, money, email, HTML, and files.

Add strict schemas for every action and API route, including maximum lengths and business rules. Return field-level errors using a consistent result type.

### Replace `any`

`any` is widespread in pages and the core action file, weakening the value of strict TypeScript. Generate DTO types from schemas, validate JSON columns, and use discriminated unions for statuses and action results.

### Configure real linting and CI

Current lint script is interactive and therefore ineffective.

CI should run:

1. `npm ci`
2. formatting check
3. ESLint with zero-warning policy on security-critical rules
4. TypeScript
5. unit tests
6. integration tests with disposable MySQL
7. authorization/security tests
8. production build
9. dependency and secret scans
10. Android build/tests
11. iOS build/tests on macOS

### Add test coverage

There is no application test suite. The only repository files named as tests are notification helpers and default native template tests.

Minimum first suite:

- all roles versus all server actions
- cross-tenant/cross-record denial
- login, logout, reset, invitation, session expiry/revocation
- lead conversion
- task ownership
- leave approval transaction
- invoice sequence and totals
- webhook signature/replay/amount mismatch
- file validation/access
- client portal isolation
- status normalization
- key responsive workflows with Playwright

## Security hardening beyond the P0 items

- Add login and sensitive-action rate limits.
- Add MFA/passkeys for admins and finance users.
- Add session revocation, device list, last-used time, and security-event emails.
- Re-check current database role/account status on sensitive actions; JWT role claims can remain valid after role changes.
- Align JWT expiry (24 hours) and cookie expiry (30 days); currently they disagree.
- Add re-authentication for password reset, integration changes, user deletion, payments, and “clear all data”.
- Prevent an admin from deleting the last admin or accidentally deleting themselves.
- Add CSP, HSTS, Permissions-Policy, and a strict frame policy.
- The login screen claims “AES-256 Encrypted Connection”; the app implements signed HS256 JWTs and depends on TLS for transport. Replace this unsupported claim with accurate language.
- Set request and server-action body limits.
- Escape all HTML email fields and validate outbound URLs.
- Disable Nodemailer's file/URL access.
- Protect office locations: `getLocations` currently lacks authentication.
- Do not trust forwarding headers unless requests come through a known proxy.
- Unify attendance verification: one punch path checks public IP but not BSSID, while another checks BSSID/GPS but does not compare the stored public IP.
- Use append-only audit events for security, finance, role, data export, and destructive operations.
- Add backup/restore drills, retention schedules, and incident response.

## UI/UX and accessibility audit

### Strengths

- Cohesive dark visual system and consistent cards/navigation.
- Desktop information density is good for an operations dashboard.
- Phone layouts reflow without document-level horizontal overflow.
- Mobile bottom navigation makes core areas reachable.
- Safe-area CSS variables and reduced-motion handling exist.
- Most primary form controls have visible labels.
- Loading skeletons and reusable UI primitives exist in several modules.

### High-impact UX issues

1. **Analytics credibility:** Static positive deltas appear beside zero values; charts repeat month labels; mock values look live.
2. **Touch targets:** Multiple visible controls across every tested phone module are below 44×44 px, including top-bar icons, text links, tab controls, and compact row actions.
3. **Contrast:** Common secondary colors fail WCAG AA:
   - `#5a5a68` on `#1f1f1f` is about **2.43:1**
   - `#8888a0` on white is about **3.46:1**
4. **Icon accessibility:** Rendered checks found unnamed visible icon buttons on login, website operations, invoices, documents, and Studio AI.
5. **Ambiguous repeated actions:** “Remove Employee” buttons do not include the employee name in their accessible label.
6. **Heading structure:** Several major pages do not expose a clear visible/semantic `h1`.
7. **Mobile fixed navigation:** The bottom bar overlays the content viewport; verify adequate dynamic bottom padding on all long lists, keyboard-open states, and iPhone safe areas.
8. **Form ergonomics:** Dense admin forms need step grouping, persistent validation, save-state indicators, and protection against accidental dismissal.
9. **Empty states:** Some modules show an empty table/chart without explaining the next useful action.
10. **Destructive actions:** The danger zone needs typed confirmation, recent re-authentication, backup/export prompt, and server-side safeguards.
11. **Mobile zoom:** `user-scalable=no` in the Capacitor placeholder prevents user zoom and should be removed for accessibility.
12. **Responsive testing:** Add 320, 360, 390, 430, tablet portrait/landscape, desktop 1280/1440/1920, keyboard-open, large-text, and screen-reader test matrices.

### Recommended navigation model

- Keep desktop sidebar, but let users collapse it.
- Give phone users five primary destinations based on role; put the rest in a searchable “More” sheet.
- Preserve per-role information architecture instead of showing the same operational surface to every role.
- Add breadcrumbs and a command/search palette with permission-filtered results.
- Make global search server-side, scoped, paginated, and grouped by Accounts, Contacts, Deals, Projects, and Files.

## CRM product audit — what is missing for usefulness

### Sales CRM foundation

- separate Accounts/Companies from Contacts
- multiple contacts, roles, preferences, and consent per account
- Deals/Opportunities separate from raw leads
- expected close date, probability, next step, source, owner, value, loss reason
- activity timeline: calls, meetings, notes, emails, tasks, files, field changes
- duplicate detection and merge
- CSV import/export with mapping and validation
- tags, custom fields, saved filters/views
- lead routing, SLAs, sequences, reminders, and automation rules
- pipeline forecast, conversion, velocity, aging, source ROI
- Google/Microsoft email and calendar integration

### Client success and delivery

- client health score and renewal/churn risk
- onboarding templates and approval gates
- tasks with dependencies, subtasks, comments, watchers, attachments, and recurring schedules
- milestones, retainers, scope changes, approvals, and change requests
- time timers, billable rates, capacity/resource planning
- client approval and feedback workflow
- versioned deliverables and document access history
- support requests/tickets and SLA tracking

### Finance

- quote → proposal → contract → invoice → payment lifecycle
- recurring invoices and subscription schedules
- partial payments, refunds, credit notes, taxes/GST/TDS
- payment reconciliation and immutable ledgers
- aging reports and automated reminders with delivery logs
- revenue recognition, profitability by client/project/service
- per-tenant currency, locale, financial year, and invoice sequence

### Administration/SaaS

- tenant provisioning and onboarding
- subscription plans, metering, quotas, trials, billing, suspension
- granular RBAC and custom roles
- SSO/SAML/OIDC, MFA, SCIM for larger customers
- audit-log viewer and data-export/delete workflows
- API keys, OAuth connections, webhook subscriptions and delivery logs
- feature flags and tenant configuration
- localization, timezone, locale, and accessibility preferences

## Performance and scalability

- Admin reports ships roughly **385 kB first-load JS**; several dashboards are roughly **250–261 kB**.
- Dynamically load PDF/chart/AI/report tooling only when needed.
- Do not ship `html2canvas`, jsPDF, and large chart code on initial report/dashboard load.
- Move aggregation to SQL/materialized summary tables or background jobs.
- Add caching with tenant-aware keys and explicit invalidation.
- Use job queues for email, push, AI, report generation, imports, webhooks, and third-party syncs.
- Reuse mail transports instead of creating one per email.
- Add tracing, structured logs, error tracking, uptime checks, database metrics, and alerting.
- Define SLOs for login, list pages, mutations, webhooks, job delay, and notification delivery.

## Android audit

### Verified

- Gradle unit task and debug APK assembly pass.
- Location, Wi-Fi, biometric, and push/local notification code exists.
- Android 13 notification permission is declared.

### Required before Play Store release

- Set release signing through secure CI secrets.
- Increment/version from CI; current version is fixed at code 1/name 1.0.
- Enable R8/minification and maintain tested ProGuard rules.
- Disable `allowBackup` for sensitive CRM data or define secure backup rules.
- Remove unneeded permissions (camera/media/storage/foreground service/exact alarm) unless a real feature requires each one.
- Add network security configuration and disable cleartext/mixed content.
- Produce an AAB, not checked-in APK files.
- Add Play Integrity where risk warrants it.
- Complete data-safety and privacy disclosures for location, biometrics, contacts/files, notification token, and analytics.
- Add device/emulator tests for biometric cancellation, location denial, offline mode, slow network, token expiry, app resume, deep links, and notification taps.
- Do not log FCM registration tokens.

## iOS readiness plan

The iOS directory is a useful start, but it is not App Store ready.

### Current gaps

- no entitlements file was found
- no APNs/push notification capability configuration
- no background modes for remote notifications
- no `PrivacyInfo.xcprivacy`
- no camera/photo usage descriptions despite the wider product having upload/capture intentions
- remote WebView security is overly broad
- obsolete `armv7` required-device capability should be reviewed/removed
- signing, provisioning, TestFlight, App Store Connect, archive/export, and release versioning are absent
- CI produces an unsigned IPA-like artifact, not a distributable signed archive

### Build iOS-ready now without shipping yet

1. Keep business logic and API contracts platform-neutral.
2. Centralize native services behind adapters: notifications, biometrics, location, files, links, status bar, and app lifecycle.
3. Enforce safe-area, dynamic type, keyboard, dark mode, reduced motion, and orientation behavior.
4. Add APNs entitlements and Firebase iOS configuration in secure CI.
5. Add required Info.plist purpose strings only for features actually used.
6. Add privacy manifests and an inventory of collected/shared data and third-party SDK behavior.
7. Add universal links and validated deep-link routing.
8. Add offline/error/session-expiry states that survive app suspension.
9. Test on current and minimum supported iPhones/iPads.
10. Create a signed TestFlight pipeline before public release.

## Recommended execution roadmap

### Phase 0 — security freeze (3–7 working days)

- Remove hard-coded JWT and plaintext password paths.
- Stop password/secret serialization.
- Fail closed on webhooks, cron, and lead endpoints.
- Remove generic unauthenticated email and simulated payment actions.
- Patch critical/high dependencies.
- Lock Capacitor navigation/transport.
- Disable unsafe uploads until private object storage is ready.
- Add emergency authorization tests for every action.

**Exit criterion:** no known critical/high data-access or payment-integrity vulnerability.

### Phase 1 — stable foundation (2–4 weeks)

- Tenant and membership schema.
- Central permission service and scoped repositories.
- Formal migrations, constraints, indexes, and canonical statuses.
- Private file storage.
- Transactions/idempotency.
- Real CI, lint, tests, staging, observability, backups.
- Break up the server-action and page monoliths.

**Exit criterion:** safe multi-role internal production pilot for one tenant, with a schema capable of multi-tenancy.

### Phase 2 — trustworthy CRM (4–8 weeks)

- Accounts, contacts, deals, activity timeline, imports, dedupe.
- Real reporting and forecast metrics; remove mocks.
- Project approvals/dependencies/comments.
- Complete finance lifecycle.
- Email/calendar integrations and automation foundation.

**Exit criterion:** teams can run sales, delivery, client success, and billing without shadow spreadsheets.

### Phase 3 — Android hardening and iOS/TestFlight (3–6 weeks)

- Release-grade native security and permissions.
- AAB/Play Store pipeline.
- APNs/entitlements/privacy manifest.
- Signed TestFlight pipeline.
- Native device test matrix and accessibility pass.

### Phase 4 — SaaS commercialization

- Subscription billing, plan enforcement, tenant onboarding, support/admin console, usage metering, data lifecycle, SSO, audit exports, and operational SLOs.

## Definition of done for the next production candidate

- All P0 findings closed and regression-tested.
- No password hash or integration secret appears in any browser/network response.
- Every action has authenticated tenant/permission/ownership enforcement.
- All public endpoints fail closed and are rate-limited.
- Payment webhooks are signed, replay-safe, amount-verified, and idempotent.
- No critical/high dependency advisory remains without a documented accepted risk.
- Formal migrations reproduce a fresh environment.
- Unit, integration, authorization, and E2E tests run in CI.
- Lint is non-interactive and enforced.
- Uploaded files are private and durable.
- Core KPIs use real, reconciled data.
- Mobile controls meet touch and contrast requirements.
- Android release build is signed/tested; iOS TestFlight build is signed/tested before iOS launch.

## Bottom line

Do not discard the product: the design foundation and breadth are promising. But do not scale the current implementation by adding more pages on top of the present action/schema model. The highest-leverage move is a short security and architecture reset, preserving the UI while replacing the data-access, permission, migration, storage, and integration foundations underneath it.
