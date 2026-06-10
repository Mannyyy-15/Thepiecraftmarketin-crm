import { KanbanSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <KanbanSkeleton columns={4} cardsPerColumn={3} />
    </div>
  );
}
