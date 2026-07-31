import type { ReactNode } from "react";
import { AlertCircle, ClipboardList, Loader2, Settings2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type WorkflowStateProps =
  | { state: "loading"; title?: string }
  | { state: "empty"; title: string; description: string; action?: ReactNode }
  | { state: "not_configured"; title?: string; action?: ReactNode }
  | { state: "error"; title?: string; description?: string; action?: ReactNode };

export function WorkflowState(props: WorkflowStateProps) {
  if (props.state === "loading") {
    return (
      <Card aria-busy="true" aria-label={props.title ?? "Loading workflow"}>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="sr-only">
            <Loader2 aria-hidden="true" />
            Loading workflow
          </div>
        </CardContent>
      </Card>
    );
  }

  if (props.state === "not_configured") {
    return (
      <EmptyState
        icon={<Settings2 aria-hidden="true" className="h-5 w-5" />}
        title={props.title ?? "Workflow setup required"}
        description="This workflow is not connected to tenant-scoped storage yet. No placeholder records are being shown."
        action={props.action}
      />
    );
  }

  if (props.state === "error") {
    return (
      <EmptyState
        icon={<AlertCircle aria-hidden="true" className="h-5 w-5" />}
        title={props.title ?? "Workflow could not be loaded"}
        description={props.description ?? "Try again. If the problem continues, contact an administrator."}
        action={props.action}
      />
    );
  }

  return (
    <EmptyState
      icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
      title={props.title}
      description={props.description}
      action={props.action}
    />
  );
}
