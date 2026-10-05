"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { courseSchema } from "@/lib/validation/courses";
import { createCourseForUser, deleteCourseForUser, updateCourseForUser } from "@/lib/services/course-service";

export type CourseActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function createCourseAction(input: unknown): Promise<CourseActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await createCourseForUser(userId, parsed.data);
  revalidatePath("/courses");
  return { ok: true };
}

export async function updateCourseAction(courseId: string, input: unknown): Promise<CourseActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await updateCourseForUser(userId, courseId, parsed.data);
  if (!updated) {
    return { ok: false, error: "Course not found." };
  }

  revalidatePath("/courses");
  return { ok: true };
}

export async function deleteCourseAction(courseId: string): Promise<CourseActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const deleted = await deleteCourseForUser(userId, courseId);
  if (!deleted) {
    return { ok: false, error: "Course not found." };
  }

  revalidatePath("/courses");
  revalidatePath("/schedule");
  return { ok: true };
}
