// Centralized realistic mock data for the CRM redesign.

export type ClientStatus = "active" | "onboarding" | "paused" | "churned";

export interface Client {
  id: string;
  name: string;
  industry: string;
  mrr: number;
  status: ClientStatus;
  health: number; // 0-100
  owner: string;
  since: string;
  logoBg: string;
  initials: string;
}

export const clients: Client[] = [
  { id: "c1", name: "Acme Corp", industry: "E-commerce", mrr: 8400, status: "active", health: 92, owner: "Priya Shah", since: "Mar 2024", logoBg: "from-rose-500 to-orange-500", initials: "AC" },
  { id: "c2", name: "Stark Industries", industry: "Manufacturing", mrr: 14200, status: "active", health: 88, owner: "Mateo Alvarez", since: "Jan 2024", logoBg: "from-amber-500 to-rose-500", initials: "SI" },
  { id: "c3", name: "Wayne Enterprises", industry: "Real Estate", mrr: 22000, status: "active", health: 75, owner: "Priya Shah", since: "Oct 2023", logoBg: "from-slate-700 to-slate-900", initials: "WE" },
  { id: "c4", name: "Globex", industry: "SaaS", mrr: 6200, status: "onboarding", health: 62, owner: "Lena Park", since: "May 2026", logoBg: "from-emerald-500 to-teal-500", initials: "GX" },
  { id: "c5", name: "Initech", industry: "Fintech", mrr: 11500, status: "active", health: 81, owner: "Jordan Wells", since: "Aug 2024", logoBg: "from-indigo-500 to-violet-500", initials: "IT" },
  { id: "c6", name: "Hooli", industry: "Tech", mrr: 18900, status: "active", health: 94, owner: "Mateo Alvarez", since: "Feb 2024", logoBg: "from-sky-500 to-indigo-500", initials: "HL" },
  { id: "c7", name: "Pied Piper", industry: "Tech", mrr: 4200, status: "paused", health: 41, owner: "Lena Park", since: "Jun 2024", logoBg: "from-emerald-500 to-lime-500", initials: "PP" },
  { id: "c8", name: "Cyberdyne Systems", industry: "Defense", mrr: 9800, status: "active", health: 87, owner: "Jordan Wells", since: "Nov 2024", logoBg: "from-rose-600 to-pink-600", initials: "CS" },
  { id: "c9", name: "Soylent Corp", industry: "Food & Bev", mrr: 5400, status: "churned", health: 12, owner: "Priya Shah", since: "Jul 2023", logoBg: "from-lime-500 to-emerald-500", initials: "SO" },
  { id: "c10", name: "Massive Dynamic", industry: "R&D", mrr: 27500, status: "active", health: 96, owner: "Mateo Alvarez", since: "Apr 2023", logoBg: "from-violet-600 to-fuchsia-600", initials: "MD" },
];

export type ProjectStatus = "planning" | "in-progress" | "review" | "completed" | "on-hold";

export interface Project {
  id: string;
  name: string;
  client: string;
  type: "Website" | "Meta Ads" | "Branding" | "SEO" | "Content";
  status: ProjectStatus;
  progress: number;
  deadline: string;
  budget: number;
  team: { name: string }[];
}

export const projects: Project[] = [
  { id: "p1", name: "Website Redesign", client: "Acme Corp", type: "Website", status: "in-progress", progress: 64, deadline: "Jun 12, 2026", budget: 28000, team: [{ name: "Priya Shah" }, { name: "Lena Park" }, { name: "Mateo Alvarez" }] },
  { id: "p2", name: "Q3 Meta Ads Launch", client: "Stark Industries", type: "Meta Ads", status: "review", progress: 88, deadline: "May 30, 2026", budget: 45000, team: [{ name: "Jordan Wells" }, { name: "Mateo Alvarez" }] },
  { id: "p3", name: "Brand Identity Refresh", client: "Wayne Enterprises", type: "Branding", status: "completed", progress: 100, deadline: "May 15, 2026", budget: 18500, team: [{ name: "Lena Park" }] },
  { id: "p4", name: "Technical SEO Audit", client: "Globex", type: "SEO", status: "planning", progress: 12, deadline: "Jul 04, 2026", budget: 7500, team: [{ name: "Priya Shah" }, { name: "Jordan Wells" }] },
  { id: "p5", name: "Editorial Calendar 2026", client: "Initech", type: "Content", status: "in-progress", progress: 42, deadline: "Aug 20, 2026", budget: 12000, team: [{ name: "Lena Park" }, { name: "Priya Shah" }] },
  { id: "p6", name: "Performance Marketing", client: "Hooli", type: "Meta Ads", status: "in-progress", progress: 71, deadline: "Jun 28, 2026", budget: 62000, team: [{ name: "Mateo Alvarez" }, { name: "Jordan Wells" }, { name: "Lena Park" }] },
  { id: "p7", name: "Headless Commerce Build", client: "Massive Dynamic", type: "Website", status: "in-progress", progress: 33, deadline: "Sep 01, 2026", budget: 84000, team: [{ name: "Priya Shah" }, { name: "Mateo Alvarez" }] },
  { id: "p8", name: "PR Crisis Response", client: "Cyberdyne Systems", type: "Content", status: "on-hold", progress: 25, deadline: "TBD", budget: 9500, team: [{ name: "Jordan Wells" }] },
];

export const revenueData = [
  { month: "Dec", revenue: 32000, spend: 12000 },
  { month: "Jan", revenue: 36500, spend: 14200 },
  { month: "Feb", revenue: 34200, spend: 13100 },
  { month: "Mar", revenue: 41800, spend: 16400 },
  { month: "Apr", revenue: 44500, spend: 18200 },
  { month: "May", revenue: 45230, spend: 19800 },
];

export const channelData = [
  { name: "Meta", value: 42 },
  { name: "Google", value: 28 },
  { name: "Organic", value: 18 },
  { name: "Referral", value: 12 },
];

export const adsCampaigns = [
  { id: "a1", name: "Spring Sale — Lookalike", client: "Acme Corp", platform: "Meta", spend: 8420, impressions: 1240000, clicks: 32400, ctr: 2.6, roas: 4.2, status: "active" as const },
  { id: "a2", name: "Brand Awareness Q2", client: "Stark Industries", platform: "Meta", spend: 14200, impressions: 2410000, clicks: 41200, ctr: 1.7, roas: 2.8, status: "active" as const },
  { id: "a3", name: "Retargeting Cart Abandon", client: "Hooli", platform: "Meta", spend: 6500, impressions: 480000, clicks: 18900, ctr: 3.9, roas: 6.1, status: "active" as const },
  { id: "a4", name: "Search — High Intent", client: "Initech", platform: "Google", spend: 9800, impressions: 320000, clicks: 14200, ctr: 4.4, roas: 5.2, status: "active" as const },
  { id: "a5", name: "Video Pre-roll", client: "Wayne Enterprises", platform: "Meta", spend: 4200, impressions: 890000, clicks: 9200, ctr: 1.0, roas: 1.4, status: "paused" as const },
  { id: "a6", name: "Black Friday Teaser", client: "Massive Dynamic", platform: "Meta", spend: 0, impressions: 0, clicks: 0, ctr: 0, roas: 0, status: "draft" as const },
];

export const team = [
  { id: "u1", name: "Priya Shah", role: "Lead Strategist", email: "priya@piecraft.com", workload: 82, status: "online" as const },
  { id: "u2", name: "Mateo Alvarez", role: "Performance Marketing", email: "mateo@piecraft.com", workload: 74, status: "online" as const },
  { id: "u3", name: "Lena Park", role: "Brand Designer", email: "lena@piecraft.com", workload: 61, status: "away" as const },
  { id: "u4", name: "Jordan Wells", role: "SEO & Analytics", email: "jordan@piecraft.com", workload: 88, status: "online" as const },
  { id: "u5", name: "Sam Okafor", role: "Senior Developer", email: "sam@piecraft.com", workload: 92, status: "online" as const },
  { id: "u6", name: "Yuki Tanaka", role: "Content Lead", email: "yuki@piecraft.com", workload: 56, status: "offline" as const },
  { id: "u7", name: "Aisha Rahman", role: "Account Manager", email: "aisha@piecraft.com", workload: 70, status: "online" as const },
  { id: "u8", name: "Diego Costa", role: "Junior Developer", email: "diego@piecraft.com", workload: 48, status: "away" as const },
];

export const invoices = [
  { id: "INV-2026-0142", client: "Acme Corp", amount: 8400, status: "paid" as const, issued: "May 01, 2026", due: "May 15, 2026" },
  { id: "INV-2026-0143", client: "Stark Industries", amount: 14200, status: "paid" as const, issued: "May 01, 2026", due: "May 15, 2026" },
  { id: "INV-2026-0144", client: "Wayne Enterprises", amount: 22000, status: "pending" as const, issued: "May 12, 2026", due: "May 26, 2026" },
  { id: "INV-2026-0145", client: "Initech", amount: 11500, status: "pending" as const, issued: "May 14, 2026", due: "May 28, 2026" },
  { id: "INV-2026-0146", client: "Hooli", amount: 18900, status: "overdue" as const, issued: "Apr 22, 2026", due: "May 06, 2026" },
  { id: "INV-2026-0147", client: "Massive Dynamic", amount: 27500, status: "draft" as const, issued: "—", due: "—" },
];

export const documents = [
  { id: "d1", name: "Acme — Brand Guidelines v3.pdf", client: "Acme Corp", type: "PDF", size: "4.2 MB", updated: "May 18, 2026", owner: "Lena Park" },
  { id: "d2", name: "Stark Q3 Campaign Brief.docx", client: "Stark Industries", type: "DOCX", size: "1.1 MB", updated: "May 17, 2026", owner: "Priya Shah" },
  { id: "d3", name: "Wayne — Site Architecture.fig", client: "Wayne Enterprises", type: "FIG", size: "12.4 MB", updated: "May 14, 2026", owner: "Priya Shah" },
  { id: "d4", name: "Hooli ROAS Report May.xlsx", client: "Hooli", type: "XLSX", size: "820 KB", updated: "May 20, 2026", owner: "Jordan Wells" },
  { id: "d5", name: "Globex Onboarding.pdf", client: "Globex", type: "PDF", size: "2.6 MB", updated: "May 19, 2026", owner: "Aisha Rahman" },
  { id: "d6", name: "Editorial Calendar 2026.csv", client: "Initech", type: "CSV", size: "48 KB", updated: "May 16, 2026", owner: "Yuki Tanaka" },
];

export const websiteTasks = [
  { id: "w1", title: "Update Acme homepage hero", repo: "acme-marketing", priority: "high" as const, status: "in-review" as const, assignee: "Sam Okafor" },
  { id: "w2", title: "Fix SSL renewal on Stark checkout", repo: "stark-storefront", priority: "critical" as const, status: "blocked" as const, assignee: "Sam Okafor" },
  { id: "w3", title: "Add blog index pagination — Wayne", repo: "wayne-cms", priority: "medium" as const, status: "in-progress" as const, assignee: "Diego Costa" },
  { id: "w4", title: "Lighthouse audit + remediation", repo: "hooli-www", priority: "low" as const, status: "todo" as const, assignee: "Diego Costa" },
  { id: "w5", title: "Headless migration spike", repo: "massive-headless", priority: "high" as const, status: "in-progress" as const, assignee: "Sam Okafor" },
];

export const activityFeed = [
  { id: "f1", who: "Priya Shah", action: "approved", target: "Q3 Meta Ads — Stark Industries", time: "12m ago" },
  { id: "f2", who: "Mateo Alvarez", action: "launched campaign", target: "Spring Sale — Acme Corp", time: "1h ago" },
  { id: "f3", who: "Lena Park", action: "uploaded", target: "Wayne — Site Architecture.fig", time: "3h ago" },
  { id: "f4", who: "Jordan Wells", action: "completed audit for", target: "Hooli", time: "5h ago" },
  { id: "f5", who: "Aisha Rahman", action: "onboarded", target: "Globex", time: "Yesterday" },
];
