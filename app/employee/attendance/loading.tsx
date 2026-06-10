import { CalendarSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card className="border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-44" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <CalendarSkeleton />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
