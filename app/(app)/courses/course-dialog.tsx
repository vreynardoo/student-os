"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/db/schema";
import { CourseForm } from "./course-form";

export function CourseDialog({
  course,
  triggerLabel,
  triggerVariant = "default",
}: {
  course?: Course;
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "Add course"}</DialogTitle>
        </DialogHeader>
        <CourseForm course={course} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
