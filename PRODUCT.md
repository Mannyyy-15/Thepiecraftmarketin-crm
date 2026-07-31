# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Agency administrators who configure the system, manage people and access, oversee sales, delivery, finance, marketing performance, and SaaS operations.
- Employees who plan their day, manage assigned clients and projects, execute campaign and web-development work, track time and attendance, and provide proof of work.
- Clients who review performance, approve deliverables, exchange messages and files, pay invoices, submit requests, and follow project progress without seeing internal agency information.

## Product Purpose

ThePieCraft OS is the private operating system for ThePieCraft Marketing. It brings agency CRM, sales, marketing attribution, campaign operations, web-development delivery, team execution, client collaboration, reporting, documents, and finance into one role-aware workspace. Success means the team can operate from one reliable system while clients receive a clear, controlled view of their work.

## Positioning

Unlike a generic pipeline CRM, the product joins the complete agency lifecycle: acquisition and attribution, campaign and website delivery, employee execution, client approvals, profitability, and account administration. Information is separated by entity and role while remaining connected through the underlying client relationship.

## Operating Context

- Admins create employee and client accounts and can send secure one-time access links by WhatsApp or email. Credentials still exist for later direct sign-in.
- Work spans Accounts, Contacts, Leads, Deals, Projects, campaigns, websites, deliverables, reports, invoices, requests, and change orders.
- Marketing work uses Google Ads, Meta Ads, GA4, Search Console, UTM parameters, click IDs, conversion feedback, pacing, anomaly detection, creative-fatigue signals, and profitability reporting.
- Website work moves through discovery, sitemap, approval, staging, deployment, and maintenance.
- Employees use daily plans, workload views, timers, campaign checklists, attendance, and proof-of-work records.
- The same hosted web application is used on desktop and through an Android Capacitor wrapper. An iOS wrapper may be built later, so responsive web behavior and safe-area support must remain portable.

## Capabilities and Constraints

- The application is for internal agency, employee, and client use. Public app-store distribution is not a current requirement.
- Existing Next.js routes, navigation labels, forms, business logic, and role boundaries must continue to work through the redesign.
- The deployed web application is hosted on Vercel and uses a relational database through Drizzle ORM.
- Authentication, one-time login links, device/session controls, private files, durable webhook processing, distributed rate limiting, tenant isolation, audit logs, imports, deduplication, custom fields, and automation are security-sensitive product areas.
- Admin, client, and employee experiences must be usable on desktop and Android-sized viewports. The design must support touch targets, safe areas, low-motion preferences, and both light and dark themes.
- CRM records must preserve clear separation between Accounts, Contacts, Leads, Deals, and Projects.

## Brand Commitments

- Product name: ThePieCraft OS.
- The existing information architecture, route structure, copy intent, and role terminology are product commitments unless the user explicitly changes them.
- The interface should feel like a credible senior agency operations product: clear, capable, calm, and practical rather than playful or decorative.
- The redesign should use one coherent component system based on shadcn/ui conventions and the project’s existing Radix and Tailwind foundation. Material UI must not be mixed into the same interface.
- The user selected the conventional agency SaaS direction and named ClickUp as the quality bar. Borrow its productivity clarity, compact navigation, and practical density without copying its brand or visual noise.

## Evidence on Hand

- The repository contains working admin, employee, and client route trees, shared navigation shells, CRM entity workspaces, agency workflows, marketing connectors, security views, and native Capacitor projects.
- Existing uploaded documents and avatars are user data, not design assets, and must not be repurposed or fabricated into promotional content.
- No confirmed public testimonials, benchmarks, customer logos, or marketing claims are available. Future UI work must not invent them.

## Product Principles

1. Make the next operational action obvious.
2. Separate roles and entities without fragmenting the client story.
3. Show evidence, ownership, status, and money wherever decisions depend on them.
4. Prefer fast scanning and predictable interaction over decorative novelty.
5. Build shared responsive patterns that remain viable for Android today and iOS later.

## Accessibility & Inclusion

Target WCAG 2.1 AA for contrast, keyboard access, focus visibility, readable forms, and status communication. Support reduced motion, system theme preference, touch-friendly controls, and responsive layouts without horizontal page overflow.
