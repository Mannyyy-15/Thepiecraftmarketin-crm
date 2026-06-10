# Agency OS: Premium SaaS Dashboard Plan

## 1. Full App Structure
The application follows a modular, feature-based architecture in Next.js (App Router).
- **`/app`**: Contains all pages, layouts, and API routes.
- **`/components`**: Reusable UI components (buttons, cards, tables).
- **`/modules`**: Feature-specific components (e.g., `/modules/clients`, `/modules/projects`).
- **`/lib`**: Utility functions, Supabase client, helpers.
- **`/hooks`**: Custom React hooks.
- **`/types`**: TypeScript type definitions.
- **`/styles`**: Global CSS and Tailwind directives.

## 2. Page Structure
- `/` (Landing Page - Optional, redirects to login)
- `/login` (Authentication)
- `/dashboard` (Main Overview)
- `/clients` (Client List)
  - `/clients/[id]` (Client Details)
- `/projects` (Projects Kanban/List)
  - `/projects/[id]` (Project Details)
- `/ads` (Meta Ads Overview)
- `/website-dev` (Web Dev Tracker)
- `/reports` (Reporting)
- `/finance` (Invoices & Billing)
- `/settings` (Agency/User Settings)
- `/portal` (Client-Facing Portal Overview)

## 3. Sidebar Navigation Items
- **Overview** (Dashboard icon)
- **Clients** (Users icon)
- **Projects** (Folder icon)
- **Meta Ads** (Bar Chart icon)
- **Website Dev** (Code icon)
- **Team** (User group icon)
- **Reports** (Document chart icon)
- **Finance** (Dollar sign icon)
- **Documents** (File icon)
- **Settings** (Cog icon)

## 4. Dashboard Layout
A standard SaaS layout tailored for high-end feel:
- **Sidebar**: Fixed on the left, collapsible, dark or light blurred glassmorphism.
- **Top Header**: Breadcrumbs, Global Search (CMD+K), Notification Bell, User Avatar dropdown.
- **Main Content Area**:
  - **KPI Cards Section**: Top row featuring critical metrics (Revenue, Active Projects, Ad Spend, ROAS) with mini trendline sparklines.
  - **Charts Section**: Middle area with a wide chart for Revenue/Ad Spend trends.
  - **Recent Activity / Tables Section**: Bottom area split between "Recent Projects" and "Pending Tasks/Invoices".

## 5. Database Schema (Supabase / PostgreSQL)

### `users`
- `id` (uuid, PK)
- `email` (string)
- `role` (enum: ADMIN, TEAM, CLIENT)
- `name` (string)
- `avatar_url` (string)

### `clients`
- `id` (uuid, PK)
- `company_name` (string)
- `contact_person` (string)
- `email` (string)
- `phone` (string)
- `service_package` (string)
- `status` (enum: ACTIVE, PAUSED, CHURNED)
- `created_at` (timestamp)

### `projects`
- `id` (uuid, PK)
- `client_id` (uuid, FK)
- `name` (string)
- `category` (string)
- `status` (enum: NOT_STARTED, IN_PROGRESS, WAITING, COMPLETED)
- `priority` (enum: LOW, MEDIUM, HIGH)
- `deadline` (date)
- `assigned_to` (uuid, FK - users)

### `meta_ads_metrics` (Aggregated cache)
- `id` (uuid, PK)
- `client_id` (uuid, FK)
- `campaign_name` (string)
- `spend` (numeric)
- `leads` (integer)
- `roas` (numeric)
- `date` (date)

### `invoices`
- `id` (uuid, PK)
- `client_id` (uuid, FK)
- `amount` (numeric)
- `status` (enum: PENDING, PAID, OVERDUE)
- `due_date` (date)

## 6. Dummy Sample Data
(Included in the frontend constants to render the UI before backend integration)

## 7. Component List
- **Layout**: `Sidebar`, `TopNav`, `PageWrapper`, `Section`
- **Dashboards**: `KpiCard`, `TrendChart`, `ActivityFeed`, `ProjectTable`
- **Forms**: `Input`, `Select`, `DatePicker`, `Toggle`, `FormWrapper`
- **Feedback**: `Toast`, `Modal`, `EmptyState`, `LoadingSpinner`, `Skeleton`
- **Data Display**: `DataTable`, `Badge/Pill`, `Avatar`, `ProgressBar`

## 8. Reusable UI Components
- **Button**: Variants (primary, secondary, outline, ghost, danger)
- **Card**: Standardized padded container with optional headers/footers
- **Badge**: Status indicators (green for paid/active, yellow for pending, etc.)
- **Chart**: Wrappers around Recharts for consistency

## 9. User Roles and Permissions
- **Admin (Agency Owner)**: Full access to all modules, financial data, team assignments, and settings.
- **Team Member**: Access to assigned projects, website tasks, and relevant clients. Cannot view overall agency financials.
- **Client**: Access ONLY to the `/portal` route, restricted via RLS (Row Level Security). Can view their own project progress, reports, and invoices.

## 10. MVP Roadmap
- **Phase 1 (Week 1-2)**: Scaffold UI, setup Next.js, Tailwind, and dummy data. Build Dashboard, Clients, and Projects UI.
- **Phase 2 (Week 3)**: Integrate Supabase Auth and Database. Replace dummy data with real CRUD for Clients and Projects.
- **Phase 3 (Week 4)**: Build basic Meta Ads UI (manual entry or dummy data) and Website Dev tracker.
- **Phase 4 (Week 5)**: Implement Client Portal role-based routing and basic Finance (Invoice logging).
- **Phase 5 (Week 6)**: Polish UI, add animations (Framer Motion), dark mode refinements, and prepare for API integrations.

## 11. API / Integration Structure
- **Meta Ads**: Use Facebook Marketing API. Run a nightly cron job (via Vercel Cron or Supabase Edge Functions) to fetch account insights, campaign performance, and store aggregated metrics in the `meta_ads_metrics` table to keep dashboard queries fast.
- **Google Analytics / Search Console**: Use Google APIs via service accounts. Fetch weekly traffic and impression data and cache it similarly.
- **Billing**: Stripe API integration. Webhooks to update `invoices` table when a payment succeeds.
