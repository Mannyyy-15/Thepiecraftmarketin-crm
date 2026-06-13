"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  FolderKanban,
  MessageSquare,
  Search,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import { getProjects } from "@/app/actions/crm";
import { getClientProjectStatusVariant, getProjectStatusLabel } from "@/lib/statusHelpers";

const getProgressByStatus = (status: string) => {
  if (status === "planning") return 15;
  if (status === "in_progress" || status === "in-progress") return 55;
  if (status === "in_review" || status === "review") return 85;
  if (status === "completed") return 100;
  return 30;
};

type Filter = "all" | "active" | "review" | "completed";

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getProjects();
      if (res.success) setProjects(res.data ?? []);
      setLoading(false);
    })();
  }, []);

  const counts = {
    all: projects.length,
    active: projects.filter((p) => p.status === "in_progress" || p.status === "in-progress").length,
    review: projects.filter((p) => p.status === "review" || p.status === "in_review").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const filtered = projects
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "active") return p.status === "in_progress" || p.status === "in-progress";
      if (filter === "review") return p.status === "review" || p.status === "in_review";
      if (filter === "completed") return p.status === "completed";
      return true;
    })
    .filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Engagements"
        title="My Projects"
        description="Track the status and progress of every active service."
        actions={
          <Button variant="portal" size="md" onClick={() => window.location.href = "/client/messages"}>
            <MessageSquare className="h-4 w-4" />
            Request new project
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-portal-500/40 focus:border-portal-500"
          />
        </div>
        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 overflow-x-auto">
          {(["all", "active", "review", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors",
                filter === f
                  ? "bg-portal-50 dark:bg-portal-500/10 text-portal-700 dark:text-portal-300"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : f === "review" ? "In Review" : "Completed"}
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] tabular-nums">
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 border-2 border-slate-200 border-t-portal-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="h-5 w-5" />}
            title={projects.length === 0 ? "No projects yet" : "No matching projects"}
            description={
              projects.length === 0
                ? "Your account team will assign engagements here as work kicks off."
                : "Try adjusting the filter or search query."
            }
            action={
              projects.length === 0 ? (
                <Button variant="portal" size="sm" onClick={() => window.location.href = "/client/messages"}>
                  <MessageSquare className="h-3.5 w-3.5" /> Talk to your team
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => {
            const progress = typeof p.progress === "number" && p.progress > 0
              ? p.progress
              : getProgressByStatus(p.status);

            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                        <Badge dot variant={getClientProjectStatusVariant(p.status)}>
                          {getProjectStatusLabel(p.status)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Due {p.deadline || "TBD"}
                        </span>
                        {p.budget > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5" /> Budget ₹{(p.budget ?? 0).toLocaleString()}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> Started {p.startDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{progress}%</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">Complete</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Progress
                      value={progress}
                      size="sm"
                      barClassName="bg-gradient-to-r from-portal-500 to-portal-600"
                    />
                  </div>

                  {p.description && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{p.description}</p>
                  )}

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {p.projectType ? (
                        <span className="capitalize">{p.projectType.replace(/_/g, " ")}</span>
                      ) : "General"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-portal-700 dark:text-portal-300"
                      onClick={() => window.location.href = "/client/messages"}
                    >
                      Ask about this <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
