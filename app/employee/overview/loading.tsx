import { KpiCardsSkeleton, Skeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-5">
      <KpiCardsSkeleton count={4} />
      <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </Card>
      <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-20" />
          <TaskListSkeleton count={4} />
        </div>
      </Card>
    </div>
  );
}
