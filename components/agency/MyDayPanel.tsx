import { CalendarCheck2, Clock3, Gauge, ListTodo } from "lucide-react";
import type { MyDay } from "@/lib/agency/domain";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { WorkflowState } from "./WorkflowState";

const priorityVariant = {
  low: "neutral",
  medium: "warning",
  high: "danger",
} as const;

export function MyDayPanel({ day }: { day: MyDay }) {
  const utilization = Math.round((day.scheduledMinutes / day.capacityMinutes) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Assigned" value={String(day.work.length)} icon={ListTodo} />
        <Summary label="Scheduled" value={formatMinutes(day.scheduledMinutes)} icon={Clock3} />
        <Summary label="Capacity" value={`${utilization}%`} icon={Gauge} />
        <Summary label="Due checks" value={String(day.dueChecklistItems)} icon={CalendarCheck2} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>My Day</CardTitle>
            <CardDescription>{day.date}</CardDescription>
          </div>
          {day.activeTimer && <Badge variant="success" dot pulse>Timer running</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {day.work.length === 0 ? (
            <WorkflowState
              state="empty"
              title="Nothing scheduled today"
              description="Assigned work with today’s due date will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-[#303030]">
              {day.work.map((item) => (
                <li key={item.taskId} className="flex min-h-14 items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {formatMinutes(item.loggedMinutes)}
                      {item.estimatedMinutes !== null ? ` of ${formatMinutes(item.estimatedMinutes)}` : " logged"}
                    </p>
                  </div>
                  <Badge variant={priorityVariant[item.priority]}>{item.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[#28282d] dark:text-slate-300">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
          <p className="truncate text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}
