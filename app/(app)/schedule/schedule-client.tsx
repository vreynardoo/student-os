"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/db/schema";
import type { ScheduleWithCourse } from "@/lib/services/schedule-service";
import { deleteScheduleAction } from "@/lib/actions/schedule";
import { DAYS_OF_WEEK } from "@/lib/validation/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleDialog } from "./schedule-dialog";

export function ScheduleClient({ schedules, courses }: { schedules: ScheduleWithCourse[]; courses: Course[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(schedule: ScheduleWithCourse) {
    if (!window.confirm("Remove this class from your schedule?")) {
      return;
    }

    setDeletingId(schedule.id);
    await deleteScheduleAction(schedule.id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a course first, then you can schedule its classes.</p>
      ) : (
        <ScheduleDialog courses={courses} triggerLabel="Add schedule" />
      )}

      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes scheduled yet.</p>
      ) : (
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedules = schedules.filter((s) => s.dayOfWeek === day.value);
            if (daySchedules.length === 0) return null;

            return (
              <div key={day.value} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">{day.label}</h2>
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <Card key={schedule.id}>
                      <CardHeader>
                        <CardTitle>{schedule.courseName}</CardTitle>
                        <CardDescription>
                          {schedule.startTime}–{schedule.endTime}
                          {schedule.location ? ` · ${schedule.location}` : ""}
                        </CardDescription>
                        <CardAction className="flex gap-2">
                          <ScheduleDialog
                            schedule={schedule}
                            courses={courses}
                            triggerLabel="Edit"
                            triggerVariant="outline"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(schedule)}
                            disabled={deletingId === schedule.id}
                          >
                            {deletingId === schedule.id ? "Removing..." : "Remove"}
                          </Button>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
