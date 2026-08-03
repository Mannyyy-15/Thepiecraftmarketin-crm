import { KpiCardsSkeleton, Skeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="w-full space-y-4">
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full w-1/3 animate-[pulse_1s_infinite] rounded-full bg-brand-500" />
      </div>
    </div>
  );
}
