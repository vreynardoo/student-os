"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Course, ClassSchedule } from "@/lib/db/schema";
import { ScheduleForm } from "./schedule-form";

export function ScheduleDialog({
  schedule,
  courses,
  triggerLabel,
  triggerVariant = "default",
}: {
  schedule?: ClassSchedule;
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
          <DialogTitle>{schedule ? "Edit schedule" : "Add schedule"}</DialogTitle>
        </DialogHeader>
        <ScheduleForm schedule={schedule} courses={courses} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
