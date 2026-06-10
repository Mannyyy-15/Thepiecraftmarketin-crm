import { KpiCardsSkeleton, TableRowsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <KpiCardsSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-36" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="p-5"><Skeleton className="h-5 w-32 mb-4" /></div>
          <table className="w-full"><tbody><TableRowsSkeleton rows={5} cols={4} /></tbody></table>
        </Card>
      </div>
    </div>
  );
}
