"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle2, Circle, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { updateTaskStage } from "@/app/actions/crm";
import { useToast } from "@/providers/ToastProvider";

export interface KanbanTask {
  id: number;
  title: string;
  status: string; // 'todo' | 'in-progress' | 'in-review' | 'done'
  priority: string; // 'low' | 'medium' | 'high'
  dueDate: string | null;
  assignedTo?: string | null;
}

const COLUMNS = [
  { id: "todo", label: "To Do", icon: Circle, color: "text-slate-400" },
  { id: "in-progress", label: "In Progress", icon: Clock, color: "text-brand-500" },
  { id: "in-review", label: "Review", icon: MessageSquare, color: "text-amber-500" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-500" }
];

export function KanbanBoard({ initialTasks }: { initialTasks: KanbanTask[] }) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    // For Firefox support
    e.dataTransfer.setData("text/plain", taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColId(null);

    if (draggedTaskId === null) return;

    const taskToMove = tasks.find(t => t.id === draggedTaskId);
    if (!taskToMove || taskToMove.status === targetColId) return;

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: targetColId } : t));

    // Persist to DB
    try {
      const res = await updateTaskStage(draggedTaskId, targetColId);
      if (!res.success) {
        throw new Error(res.error || "Failed to update task");
      }
    } catch (err: any) {
      toast("Failed to move task: " + err.message, "error");
      // Revert optimistic update
      setTasks(initialTasks);
    }

    setDraggedTaskId(null);
  };

  const getPriorityVariant = (p: string) => {
    if (p === "high") return "danger";
    if (p === "medium") return "warning";
    return "neutral";
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(t => t.status === col.id);
        const isDraggingOver = dragOverColId === col.id;

        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-80 flex flex-col gap-3 rounded-2xl p-3 sm:p-4 border transition-colors duration-200 snap-center ${
              isDraggingOver 
                ? "bg-slate-100/50 dark:bg-slate-800/30 border-brand-500/50" 
                : "bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800"
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <col.icon className={`h-4 w-4 ${col.color}`} />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{col.label}</h3>
              </div>
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-400">
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="flex flex-col gap-3 min-h-[150px]">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`group relative bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${
                    draggedTaskId === task.id ? "opacity-50 scale-95" : "opacity-100"
                  } ${
                    col.id === "done" ? "border-emerald-500/20 opacity-80" : "border-slate-200 dark:border-slate-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={getPriorityVariant(task.priority)} className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5">
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <p className={`text-sm font-bold leading-snug mb-3 ${col.id === "done" ? "line-through text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>
                    {task.title}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={task.assignedTo} size="xs" />
                        <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">{task.assignedTo}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-[10px] font-medium">Unassigned</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                        {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
