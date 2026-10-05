"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/db/schema";
import type { TaskWithCourse } from "@/lib/services/task-service";
import { TaskForm } from "./task-form";

export function TaskDialog({
  task,
  courses,
  triggerLabel,
  triggerVariant = "default",
}: {
  task?: TaskWithCourse;
  courses: Course[];
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle>
        </DialogHeader>
        <TaskForm task={task} courses={courses} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
