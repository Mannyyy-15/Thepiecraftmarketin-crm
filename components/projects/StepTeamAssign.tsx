"use client";
import { Users2, CalendarDays } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { INPUT, LABEL, SELECT } from "./formStyles";
import type { AddProjectFormState } from "./useAddProjectForm";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="h-6 w-6 rounded-xl bg-slate-100 dark:bg-[#303030] flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-slate-500" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-[#303030]" />
    </div>
  );
}

interface TeamUser { id: number; name: string; role?: string }

export function StepTeamAssign({
  form, f, teamUsers,
}: {
  form: AddProjectFormState;
  f: (patch: Partial<AddProjectFormState>) => void;
  teamUsers: TeamUser[];
}) {
  const toggleMember = (id: number) => {
    f({
      teamMemberIds: form.teamMemberIds.includes(id)
        ? form.teamMemberIds.filter(m => m !== id)
        : [...form.teamMemberIds, id],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={CalendarDays} label="Timeline" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Start Date</label>
            <input type="date" value={form.startDate} onChange={e => f({ startDate: e.target.value })} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => f({ deadline: e.target.value })} className={INPUT} />
          </div>
        </div>
        <div className="mt-4">
          <label className={LABEL}>Priority</label>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "medium", "high"] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => f({ priority: p })}
                className={cn(
                  "h-11 rounded-2xl border text-sm font-bold capitalize cursor-pointer transition-all",
                  form.priority === p
                    ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400"
                    : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader icon={Users2} label="Team" />
        <div>
          <label className={LABEL}>Project Lead</label>
          <select value={form.leadId} onChange={e => f({ leadId: e.target.value })} className={SELECT}>
            <option value="">No lead assigned</option>
            {teamUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <label className={LABEL}>Team Members</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {teamUsers.map(u => {
              const active = form.teamMemberIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleMember(u.id)}
                  className={cn(
                    "h-11 px-3 rounded-2xl border text-xs font-semibold truncate cursor-pointer transition-all",
                    active
                      ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400"
                      : "border-slate-200 dark:border-[#303030] text-slate-600 dark:text-slate-300"
                  )}
                  title={u.name}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
          {teamUsers.length === 0 && (
            <p className="text-[11px] text-slate-400 mt-1">No teammates available to assign yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
