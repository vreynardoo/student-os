"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/db/schema";
import { deleteCourseAction } from "@/lib/actions/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseDialog } from "./course-dialog";

export function CoursesClient({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(course: Course) {
    if (!window.confirm(`Delete "${course.name}"? This also deletes its class schedule.`)) {
      return;
    }

    setDeletingId(course.id);
    await deleteCourseAction(course.id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <CourseDialog triggerLabel="Add course" />

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t added any courses yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {course.color && (
                    <span
                      aria-hidden
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                  )}
                  {course.name}
                </CardTitle>
                {(course.code || course.term) && (
                  <CardDescription>{[course.code, course.term].filter(Boolean).join(" · ")}</CardDescription>
                )}
              </CardHeader>
              <CardContent />
              <CardFooter className="gap-2">
                <CourseDialog course={course} triggerLabel="Edit" triggerVariant="outline" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(course)}
                  disabled={deletingId === course.id}
                >
                  {deletingId === course.id ? "Deleting..." : "Delete"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
