"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createScheduleAction, updateScheduleAction } from "@/lib/actions/schedule";
import { DAYS_OF_WEEK } from "@/lib/validation/schedule";
import type { Course, ClassSchedule } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ScheduleForm({
  schedule,
  courses,
  onSuccess,
}: {
  schedule?: ClassSchedule;
  courses: Course[];
  onSuccess: () => void;
}) {
  const router = useRouter();

  const [courseId, setCourseId] = useState<string | null>(schedule?.courseId ?? null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(schedule?.dayOfWeek ?? null);
  const [startTime, setStartTime] = useState(schedule?.startTime ?? "");
  const [endTime, setEndTime] = useState(schedule?.endTime ?? "");
  const [location, setLocation] = useState(schedule?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const result = schedule
      ? await updateScheduleAction(schedule.id, { dayOfWeek, startTime, endTime, location })
      : await createScheduleAction({ courseId, dayOfWeek, startTime, endTime, location });

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
      {!schedule && (
        <div className="space-y-2">
          <Label htmlFor="courseId">Course</Label>
          <Select value={courseId} onValueChange={(value) => setCourseId(value)}>
            <SelectTrigger id="courseId" className="w-full">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.courseId && <p className="text-sm text-destructive">{fieldErrors.courseId[0]}</p>}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="dayOfWeek">Day</Label>
        <Select value={dayOfWeek} onValueChange={(value) => setDayOfWeek(value)}>
          <SelectTrigger id="dayOfWeek" className="w-full">
            <SelectValue placeholder="Select a day" />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.dayOfWeek && <p className="text-sm text-destructive">{fieldErrors.dayOfWeek[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input
            id="startTime"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          {fieldErrors.startTime && <p className="text-sm text-destructive">{fieldErrors.startTime[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input id="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          {fieldErrors.endTime && <p className="text-sm text-destructive">{fieldErrors.endTime[0]}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Building A, Room 203"
        />
        {fieldErrors.location && <p className="text-sm text-destructive">{fieldErrors.location[0]}</p>}
      </div>
      {error && !Object.keys(fieldErrors).length && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : schedule ? "Save changes" : "Add schedule"}
        </Button>
      </DialogFooter>
    </form>
  );
}
