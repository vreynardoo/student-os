"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { TASK_TYPES, TASK_STATUSES, type Course } from "@/lib/db/schema";
import type { TaskWithCourse } from "@/lib/services/task-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NO_COURSE = "none";

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskForm({
  task,
  courses,
  onSuccess,
}: {
  task?: TaskWithCourse;
  courses: Course[];
  onSuccess: () => void;
}) {
  const router = useRouter();

  const [courseId, setCourseId] = useState(task?.courseId ?? NO_COURSE);
  const [type, setType] = useState(task?.type ?? "ASSIGNMENT");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "TODO");
  const [dueDate, setDueDate] = useState(task ? toDateTimeLocalValue(new Date(task.dueDate)) : "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() ?? "");
  const [progressPercent, setProgressPercent] = useState(task?.progressPercent?.toString() ?? "0");
  const [weight, setWeight] = useState(task?.weight?.toString() ?? "1");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!dueDate) {
      setFieldErrors({ dueDate: ["Due date is required"] });
      return;
    }

    setIsSubmitting(true);

    const input = {
      courseId: courseId === NO_COURSE ? undefined : courseId,
      type,
      title,
      description,
      status,
      // new Date(dueDate) parses the datetime-local value in the browser's own
      // timezone; .toISOString() then carries that absolute instant to the
      // server unambiguously, regardless of the server's timezone.
      dueDate: new Date(dueDate).toISOString(),
      estimatedHours: estimatedHours || undefined,
      progressPercent,
      weight,
    };

    const result = task ? await updateTaskAction(task.id, input) : await createTaskAction(input);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    router.refresh();
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        {fieldErrors.title && <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value ?? "ASSIGNMENT")}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value ?? "TODO")}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseId">Course (optional)</Label>
        <Select value={courseId} onValueChange={(value) => setCourseId(value ?? NO_COURSE)}>
          <SelectTrigger id="courseId" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_COURSE}>No course</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.courseId && <p className="text-sm text-destructive">{fieldErrors.courseId[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        {fieldErrors.description && <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due date</Label>
        <Input
          id="dueDate"
          type="datetime-local"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {fieldErrors.dueDate && <p className="text-sm text-destructive">{fieldErrors.dueDate[0]}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedHours">Est. hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="e.g. 3"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
          {fieldErrors.estimatedHours && <p className="text-sm text-destructive">{fieldErrors.estimatedHours[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="progressPercent">Progress %</Label>
          <Input
            id="progressPercent"
            type="number"
            min="0"
            max="100"
            value={progressPercent}
            onChange={(e) => setProgressPercent(e.target.value)}
          />
          {fieldErrors.progressPercent && (
            <p className="text-sm text-destructive">{fieldErrors.progressPercent[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          {fieldErrors.weight && <p className="text-sm text-destructive">{fieldErrors.weight[0]}</p>}
        </div>
      </div>

      {error && !Object.keys(fieldErrors).length && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : task ? "Save changes" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}
