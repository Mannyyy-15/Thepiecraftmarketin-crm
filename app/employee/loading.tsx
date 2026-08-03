import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-[520px] w-full rounded-[28px]" />
    </div>
  );
}
