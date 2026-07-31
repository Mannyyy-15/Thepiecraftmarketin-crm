# CRM implementation and rollout

Date: 31 July 2026

## Delivered

- Tenant organizations, memberships and tenant-scoped authorization
- Separate Accounts, Contacts, Leads, Deals, Deal Stages and Projects relations
- UTM, gclid, gbraid, wbraid and fbclid capture plus attribution touchpoints
- Google Ads v25, GA4, Search Console, Meta Insights and Meta CAPI clients
- Offline conversion, lead-quality, pacing, anomaly, fatigue and profit services
- Encrypted connector-account storage and an admin connector screen
- Agency workflow validation and authorization contracts for discovery, sitemap,
  approvals, deliverables, deployments, maintenance, requests, change orders,
  time, checklists, proof-of-work and My Day
- Audit-event, automation, custom-field, imports and deduplication data contracts
- Durable Razorpay webhook replay ledger with payload conflict detection
- Redis REST distributed rate limiting, with production fail-closed behavior
- Private S3-compatible file storage, mandatory production malware scanning and
  tenant-authorized signed downloads
- Encrypted TOTP MFA, one-time recovery codes, durable device sessions and
  session revocation
- Android network hardening and a tested debug build
- iOS privacy manifest, restricted transport settings and CI build workflow

## Database status

The configured database was checked and updated:

- Invoice duplicate groups: 0
- Missing invoice numbers: 0
- `0001_unique_invoice_number.sql`: applied
- `0002_tenant_foundation.sql`: applied
- Organizations created: 1
- Active memberships backfilled: 3
- Existing users, clients, projects, leads and invoices without an organization: 0

Both migrations remain in `drizzle/` for other environments. Do not reapply
`0002` manually to an environment where its tables already exist.

## Required production configuration

Copy the new variables from `.env.example` into the deployment secret manager.
Generate independent random values; never reuse the JWT secret.

1. Configure `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and
   `RATE_LIMIT_KEY_SALT`.
2. Configure the S3-compatible object store and a private bucket. Block public
   bucket access.
3. Configure `FILE_SCANNER_URL` and `FILE_SCANNER_TOKEN`. Production uploads
   deliberately fail closed without a scanner.
4. Configure `MFA_ENCRYPTION_KEY`, `MFA_RECOVERY_PEPPER` and
   `SESSION_METADATA_PEPPER`.
5. Configure `INTEGRATION_ENCRYPTION_KEY`, Google OAuth credentials, the Google
   Ads developer token, and Meta application credentials.
6. Configure `LEADS_ORGANIZATION_SLUG` for every public lead endpoint.
7. Configure the existing payment, cron, mail and origin secrets.
8. Set `CAP_SERVER_URL` to the production HTTPS CRM URL before mobile release.

## Connector activation

1. In Google Cloud, enable Google Ads API, Analytics Data API and Search Console
   API; create an OAuth web application with the production callback URL.
2. Obtain Google Ads developer-token approval and grant the connecting Google
   user access to the required Ads, GA4 and Search Console properties.
3. In Meta for Developers, configure Business Login, Marketing API and the
   Conversions API data source; grant the least-required scopes.
4. Enter each account/property in **Admin → Integrations**. Credentials are
   encrypted before database storage and are never returned to the client.
5. Schedule tenant-scoped sync jobs and monitor `last_error`, token expiry,
   provider quota and webhook replay records.
6. Use stable order/event IDs for offline conversions and Meta CAPI so retries
   remain idempotent.

## Agency workflow activation still required

The workflow domain, authorization, readiness UI and exact persistence contract
are implemented, but the workflow tables and live repository are intentionally
not pretending to be active. Build migration `0003` from
`lib/agency/README.md`, then implement its tenant-scoped repository before
enabling client or employee mutations.

Required rollout:

1. Add the documented workflow tables and indexes.
2. Connect deliverables and proof records only to `storage_objects`.
3. Connect deployment and monitoring provider credentials.
4. Seed checklist templates through an explicit administrator action.
5. Run the disposable three-role acceptance suite.
6. Change the Agency Operations readiness state only after repository health
   checks pass.

## Verification completed

- ESLint: passed
- TypeScript: passed
- Node tests: 19/19 passed
- Next production build: passed, 50 routes
- Authenticated admin desktop checks: passed
- Admin mobile checks at 390 × 844: passed, no horizontal overflow
- Disposable employee authorization E2E: passed and account removed
- Disposable client authorization E2E: passed and account removed
- Browser console errors on tested new routes: 0
- Android Gradle tests and debug APK build: passed
- Production npm audit: 0 critical, 2 high, 0 moderate

The two remaining production advisories are one Next.js record and its bundled
Sharp record. Forcing an incompatible Sharp override produced an invalid
dependency tree and was not retained. Track the next compatible Next release.

## Recommended next product layer

1. Retainer and project profitability by client, service and employee capacity
2. Forecasting from weighted pipeline, renewal probability and delivery load
3. Proposal/SOW templates with e-signature and change-order billing
4. Unified client health score using communication, delivery, payment and
   performance signals
5. SLA queues for client requests, approval aging and escalation
6. Creative asset library with fatigue history, winning-angle taxonomy and
   reuse rights
7. Experiment registry joining hypotheses, creatives, landing pages and final
   revenue
8. SEO content planning, keyword/page mapping and Search Console opportunity
   alerts
9. Website care plans covering uptime, SSL, domain, backups, Core Web Vitals and
   dependency maintenance
10. Resource planning with utilization targets, leave, skill matching and
    contractor capacity
11. Recurring invoice schedules, collections workflows and tax/accounting
    exports
12. Client-facing roadmap, approvals inbox and weekly executive summary
