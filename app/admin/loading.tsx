import { KpiCardsSkeleton, ActivityFeedSkeleton, Skeleton, TableRowsSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      <KpiCardsSkeleton count={4} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="p-5"><Skeleton className="h-5 w-28 mb-4" /></div>
          <table className="w-full"><tbody><TableRowsSkeleton rows={5} cols={5} /></tbody></table>
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800/60 rounded-2xl">
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <ActivityFeedSkeleton count={5} />
          </div>
        </Card>
      </div>
    </div>
  );
}
