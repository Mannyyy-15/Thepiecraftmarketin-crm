import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-[520px]">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Skeleton className="flex-1 rounded-[28px] min-h-[260px]" />
          <Skeleton className="h-14 rounded-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-full rounded-[24px] min-h-[400px]" />
        </div>
      </div>
    </div>
  );
}
