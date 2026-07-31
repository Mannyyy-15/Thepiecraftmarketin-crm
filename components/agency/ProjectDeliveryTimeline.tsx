import {
  Check,
  Circle,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { WorkflowState } from "./WorkflowState";

export type DeliveryPhaseStatus = "not_started" | "in_progress" | "blocked" | "complete";

export interface DeliveryPhase {
  key: "discovery" | "sitemap" | "design" | "development" | "approval" | "deployment" | "maintenance";
  label: string;
  status: DeliveryPhaseStatus;
  dueDate?: string | null;
  completedItems: number;
  totalItems: number;
}

const statusPresentation: Record<DeliveryPhaseStatus, {
  label: string;
  variant: "neutral" | "info" | "danger" | "success";
  icon: LucideIcon;
}> = {
  not_started: { label: "Not started", variant: "neutral", icon: Circle },
  in_progress: { label: "In progress", variant: "info", icon: Clock3 },
  blocked: { label: "Blocked", variant: "danger", icon: Circle },
  complete: { label: "Complete", variant: "success", icon: Check },
};

export function ProjectDeliveryTimeline({
  phases,
  projectName,
}: {
  phases: DeliveryPhase[];
  projectName: string;
}) {
  if (phases.length === 0) {
    return (
      <WorkflowState
        state="empty"
        title="No delivery workflow yet"
        description="Add a discovery brief to begin the delivery lifecycle for this project."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Delivery lifecycle</CardTitle>
          <CardDescription>{projectName}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1" aria-label={`${projectName} delivery lifecycle`}>
          {phases.map((phase, index) => {
            const presentation = statusPresentation[phase.status];
            const Icon = presentation.icon;
            const progress =
              phase.totalItems > 0
                ? Math.round((phase.completedItems / phase.totalItems) * 100)
                : 0;

            return (
              <li key={phase.key} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
                {index < phases.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[1.34rem] top-10 h-[calc(100%-1.5rem)] w-px bg-slate-200 dark:bg-[#38383f]"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-2 flex h-11 w-11 items-center justify-center rounded-full border",
                    phase.status === "complete"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : phase.status === "blocked"
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                        : "border-slate-200 bg-white text-slate-500 dark:border-[#38383f] dark:bg-[#28282d] dark:text-slate-300",
                  )}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 rounded-xl px-1 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{phase.label}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {phase.totalItems > 0
                          ? `${phase.completedItems} of ${phase.totalItems} items complete`
                          : "No checklist items"}
                        {phase.dueDate ? ` · Due ${phase.dueDate}` : ""}
                      </p>
                    </div>
                    <Badge variant={presentation.variant}>{presentation.label}</Badge>
                  </div>
                  {phase.totalItems > 0 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#303030]">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-[width]"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{progress}% complete</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
