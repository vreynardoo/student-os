"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/db/schema";
import type { TaskWithCourse } from "@/lib/services/task-service";
import type { PriorityResult } from "@/lib/priority-engine/types";
import { deleteTaskAction, updateTaskProgressAction } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDueDate } from "@/lib/utils";
import { TaskDialog } from "./task-dialog";

// Not `RankedTask` itself — that type's `task` field is the engine's minimal
// PriorityInputTask. The UI needs the full DB row (course name, description,
// etc.) alongside the computed priority, so it's paired up at the page level.
export type RankedTaskWithCourse = { task: TaskWithCourse; priority: PriorityResult };

// Exported so other views showing priority results (e.g. the dashboard) use
// the same level-to-badge-color mapping instead of redefining it.
export const LEVEL_BADGE_VARIANT = {
  CRITICAL: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
} as const;

export function TaskRow({ ranked, courses }: { ranked: RankedTaskWithCourse; courses: Course[] }) {
  const router = useRouter();
  const { task, priority } = ranked;

  const [progressInput, setProgressInput] = useState(task.progressPercent.toString());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setIsDeleting(true);
    await deleteTaskAction(task.id);
    setIsDeleting(false);
    router.refresh();
  }

  async function handleSaveProgress() {
    setError(null);
    setIsSavingProgress(true);
    const result = await updateTaskProgressAction(task.id, { progressPercent: progressInput });
    setIsSavingProgress(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleMarkComplete() {
    setError(null);
    setIsCompleting(true);
    const result = await updateTaskProgressAction(task.id, { progressPercent: "100" });
    setIsCompleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const isCompleted = task.status === "COMPLETED";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {task.title}
          <Badge variant="outline">{task.type}</Badge>
          <Badge variant="outline">{task.status}</Badge>
        </CardTitle>
        <CardDescription className="space-y-1">
          <div>
            {task.courseName ? `${task.courseName} · ` : ""}
            Due {formatDueDate(task.dueDate)}
            {task.estimatedHours != null ? ` · ${task.estimatedHours}h estimated` : ""}
          </div>
          <div>{priority.reasons.join(" · ")}</div>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Badge variant={LEVEL_BADGE_VARIANT[priority.level]}>
            {priority.level} ({priority.score})
          </Badge>
          <TaskDialog task={task} courses={courses} triggerLabel="Edit" triggerVariant="outline" />
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${task.progressPercent}%` }} />
        </div>
        <Input
          type="number"
          min="0"
          max="100"
          className="h-8 w-20"
          value={progressInput}
          onChange={(e) => setProgressInput(e.target.value)}
          aria-label="Progress percent"
        />
        <Button variant="outline" size="sm" onClick={handleSaveProgress} disabled={isSavingProgress}>
          {isSavingProgress ? "Saving..." : "Update progress"}
        </Button>
        {!isCompleted && (
          <Button variant="outline" size="sm" onClick={handleMarkComplete} disabled={isCompleting}>
            {isCompleting ? "Completing..." : "Mark complete"}
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
