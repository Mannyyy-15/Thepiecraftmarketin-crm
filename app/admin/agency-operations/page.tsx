import {
  CheckSquare2,
  ClipboardCheck,
  FileCheck2,
  GitPullRequestArrow,
  Globe2,
  ListTree,
  ShieldCheck,
  Timer,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkflowState } from "@/components/agency/WorkflowState";

const capabilities = [
  {
    title: "Discovery & sitemap",
    description: "Structured goals, audiences, success measures and versioned sitemap nodes.",
    icon: ListTree,
  },
  {
    title: "Client approvals",
    description: "Version-bound approvals and mandatory feedback when changes are requested.",
    icon: FileCheck2,
  },
  {
    title: "Deliverables",
    description: "Assigned deliverables linked to private managed files or approved external URLs.",
    icon: ClipboardCheck,
  },
  {
    title: "Deployments",
    description: "Development, preview, staging and production environments tied to commit SHAs.",
    icon: GitPullRequestArrow,
  },
  {
    title: "Maintenance",
    description: "Uptime, SSL, domain, performance, backup and dependency health evidence.",
    icon: Wrench,
  },
  {
    title: "Requests & change orders",
    description: "Client requests with priced scope, effort, schedule impact and approval expiry.",
    icon: CheckSquare2,
  },
  {
    title: "My Day & workload",
    description: "Assigned work, capacity, timers, checklists and proof-of-work without mock activity.",
    icon: Timer,
  },
  {
    title: "Tenant-safe access",
    description: "Every operation requires active organization membership and project access.",
    icon: ShieldCheck,
  },
] as const;

export default function AgencyOperationsPage() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Operations"
        title="Agency delivery"
        description="Website delivery, client decisions and employee execution in one tenant-scoped workflow."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <Badge variant="warning">Setup required</Badge>
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Delivery workspace</CardTitle>
              <CardDescription>Live project stages will appear after workflow storage is provisioned.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <WorkflowState state="not_configured" title="Agency workflow database migration required" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Activation requirements</CardTitle>
              <CardDescription>Required before live client or employee use.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                "Apply tenant-scoped workflow tables and indexes",
                "Connect private file storage and malware scanning",
                "Configure deployment and monitoring providers",
                "Create checklist templates and approval policy",
                "Run admin, employee and client E2E acceptance tests",
              ].map((item, index) => (
                <li key={item} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 dark:border-[#38383f] dark:text-slate-300">
                    {index + 1}
                  </span>
                  <span className="pt-1">{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lifecycle contract</CardTitle>
            <CardDescription>The required controlled progression for website projects.</CardDescription>
          </div>
          <Globe2 aria-hidden="true" className="h-5 w-5 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            {["Discovery", "Sitemap", "Design", "Development", "Client approval", "Staging", "Production", "Maintenance"].map((stage, index, stages) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-[#38383f] dark:bg-[#28282d]">{stage}</span>
                {index < stages.length - 1 && <span aria-hidden="true" className="text-slate-400">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
