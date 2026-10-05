"use client";

import { useMemo, useState } from "react";
import { TASK_TYPES, TASK_STATUSES, type Course } from "@/lib/db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDialog } from "./task-dialog";
import { TaskRow, type RankedTaskWithCourse } from "./task-row";

const ALL = "ALL";

export function TasksClient({
  rankedTasks,
  courses,
}: {
  rankedTasks: RankedTaskWithCourse[];
  courses: Course[];
}) {
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [courseFilter, setCourseFilter] = useState(ALL);

  const filtered = useMemo(() => {
    return rankedTasks.filter((ranked) => {
      if (statusFilter !== ALL && ranked.task.status !== statusFilter) return false;
      if (typeFilter !== ALL && ranked.task.type !== typeFilter) return false;
      if (courseFilter !== ALL && ranked.task.courseId !== courseFilter) return false;
      return true;
    });
  }, [rankedTasks, statusFilter, typeFilter, courseFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TaskDialog courses={courses} triggerLabel="Add task" />

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? ALL)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {TASK_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? ALL)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {TASK_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {courses.length > 0 && (
          <Select value={courseFilter} onValueChange={(value) => setCourseFilter(value ?? ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rankedTasks.length === 0 ? "You don't have any tasks yet." : "No tasks match these filters."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ranked) => (
            <TaskRow key={ranked.task.id} ranked={ranked} courses={courses} />
          ))}
        </div>
      )}
    </div>
  );
}
