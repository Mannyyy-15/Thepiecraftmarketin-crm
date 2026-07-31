# ThePieCraft CRM — Agency Product Roadmap

This roadmap is ordered for a digital marketing, performance marketing, and web-development agency. Build the trustworthy operating core before adding more dashboards.

## P0 — production foundation

- Organization/tenant model, memberships, role permissions, and per-tenant unique constraints
- Immutable audit log for logins, permissions, client data, approvals, invoices, payments, exports, and integrations
- Private object storage with malware scanning, signed URLs, retention rules, and client-visible access policies
- Durable job queue for imports, reports, email, webhooks, ad sync, notifications, and retries
- Distributed rate limiting, MFA, session/device management, secret vault, backups, restore drills, and error monitoring
- Disposable staging database with seeded admin, employee, and client accounts plus authorization/E2E test matrices

## P1 — real CRM and client lifecycle

- Separate Accounts, Contacts, Leads, Deals, and Projects instead of overloading one client record
- Configurable deal pipeline, weighted forecast, loss reasons, follow-up SLA, activity timeline, notes, tasks, calls, email, and meetings
- CSV/Sheets import with field mapping, preview, deduplication, merge history, validation, and rollback
- Custom fields, tags, saved views, bulk actions, ownership queues, lead routing, round-robin assignment, and automation rules
- Full attribution capture: UTM source/medium/campaign/content/term plus gclid, gbraid, wbraid, fbclid, landing page, referrer, campaign, ad set, ad, and creative
- Qualification framework, lifecycle stages, service interest, proposal/SOW, won/lost handoff, onboarding checklist, renewal, churn, and referral tracking

## P1 — performance marketing command center

- Google Ads, Meta Marketing API, GA4 Data API, Search Console, and optional LinkedIn/TikTok connectors
- Agency hierarchy for Google MCC, Meta Business Manager, accounts, pixels/datasets, pages, catalogs, and permissions
- Daily immutable metric snapshots with timezone/currency normalization, freshness badges, source-of-truth labels, and reconciliation
- Client/campaign dashboards for spend, leads, qualified leads, sales, revenue, CPL, CPA, CAC, ROAS, MER, LTV, conversion rate, and pacing
- Budget pacing, forecast-to-goal, overspend/underspend alerts, anomaly detection, learning-limited alerts, disapproval alerts, and broken-tracking alerts
- Creative library with concepts, hooks, formats, versions, approvals, usage, performance, fatigue, and winner/loser analysis
- Conversion operations: Google enhanced conversions/Data Manager uploads, Meta Conversions API, event deduplication, consent state, match quality, failure logs, and retry queues
- Lead-quality feedback loop from CRM stages/revenue back to ad platforms

## P1 — web-development delivery

- Structured discovery brief, scope, sitemap, content inventory, design approval, development, QA, UAT, launch, warranty, and maintenance workflow
- Milestones, dependencies, change requests, estimates, acceptance criteria, approvals, comments, files, and decision history
- GitHub/GitLab, Vercel/Netlify/Cloudflare, Figma, Search Console, PageSpeed Insights, uptime, Sentry, DNS, SSL, and domain-expiry integrations
- Staging/production URL registry, deployments, rollback links, release notes, environment ownership, and incident timeline
- Core Web Vitals history, uptime/SLA, SSL/domain expiry, security headers, broken links, form-delivery checks, backups, and maintenance tasks
- Credential references through a password-manager integration; never store raw hosting/client credentials in CRM columns

## P1 — role-specific experience

### Admin

- Agency pipeline, cash flow, revenue forecast, utilization, capacity, delivery risk, client health, renewal risk, gross margin, and profitability by client/service/team
- Permission designer, approval thresholds, automation builder, integration health, audit search, data retention, and support impersonation with explicit consent/audit
- GST-ready invoices, credit notes, partial payments, refunds, taxes/TDS, expenses, vendor bills, recurring retainers, aging, and reconciliation

### Employee

- “My Day” view: priorities, overdue work, approvals needed, meetings, lead follow-ups, time budget, and blockers
- Assigned accounts/leads/projects only; timers, timesheets, expense claims, leave, attendance, checklists, comments, mentions, and proof-of-work
- Campaign launch/checklist workflows, QA templates, creative review, reporting notes, and mobile offline/error recovery
- Capacity and workload signals without exposing unrelated employee compensation or client finance

### Client

- Goal-first dashboard with verified data freshness and plain-language explanations
- Deliverables, milestones, approvals, requests, messages, meeting notes, files, reports, invoices, payment receipts, and change orders
- Campaign goal/budget/pacing visibility with agency-controlled metric visibility and no cross-client leakage
- Approval reminders, feedback deadlines, support SLAs, satisfaction/NPS, renewal scope, and referral flow

## P2 — automation and intelligence

- Event/condition/action workflow builder with test mode, approvals, retry history, and auditability
- Report builder with reusable agency templates, narrative notes, scheduled delivery, source citations, and data freshness
- AI assistance only over permission-scoped data, with human approval, prompt/version history, source references, cost limits, and PII controls
- Suggested next actions, churn risk, budget anomalies, missing follow-ups, creative fatigue, and delivery-risk detection
- Email/WhatsApp/calendar integrations with consent, templates, opt-out handling, conversation ownership, and delivery logs

## Mobile and iOS sequence

1. Stabilize the responsive web app and Android release pipeline.
2. Keep native services behind adapters for biometrics, push, location, files, links, lifecycle, and offline state.
3. Add Android release signing, Play internal testing, crash reporting, and device coverage.
4. Add iOS entitlements, APNs, associated domains, privacy declarations, Keychain-backed session handling, and signed TestFlight CI.
5. Test dynamic type, VoiceOver/TalkBack, reduced motion, keyboard, safe areas, interrupted network, expired sessions, permissions denial, and app resume.

## Product guardrails

- Never display generated/random metrics as live data.
- Every metric must identify source, timezone, currency, last successful sync, and freshness.
- Every mutation must enforce tenant, role, ownership, validation, and audit logging on the server.
- Financial and advertising totals must be reproducible from immutable source records.
- Client views must use explicit allowlists, not “all data except hidden fields.”
- No integration secret, password hash, private file URL, or internal error message may reach a browser response.
