import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800",
        className
      )}
    />
  );
}

/** 4-up KPI card grid skeleton */
export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Table body rows skeleton */
export function TableRowsSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  const widths = ["w-32", "w-24", "w-20", "w-16", "w-28", "w-14"];
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-5 sm:px-6 py-4">
              <Skeleton className={cn("h-4", widths[(i + j) % widths.length])} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Kanban board skeleton — columns × cards */
export function KanbanSkeleton({
  columns = 4,
  cardsPerColumn = 2,
}: {
  columns?: number;
  cardsPerColumn?: number;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: columns }).map((_, ci) => (
        <div
          key={ci}
          className="min-w-[260px] w-64 flex-shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          {Array.from({ length: cardsPerColumn }).map((_, ki) => (
            <div
              key={ki}
              className="rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-4 space-y-3"
            >
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Member card grid skeleton */
export function MemberGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chat sidebar conversation list skeleton */
export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Activity feed skeleton */
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Calendar grid skeleton (7 cols × 5 rows) */
export function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, ri) => (
        <div key={ri} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, ci) => (
            <Skeleton key={ci} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Task list skeleton */
export function TaskListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3"
        >
          <Skeleton className="h-5 w-5 rounded-md shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
