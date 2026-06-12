import { KpiCardsSkeleton, TableRowsSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <KpiCardsSkeleton count={4} />
      <Card>
        <div className="p-6">
          <table className="w-full">
            <tbody>
              <TableRowsSkeleton rows={6} cols={6} />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
