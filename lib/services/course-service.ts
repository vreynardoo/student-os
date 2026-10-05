import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses, type Course } from "@/lib/db/schema";
import type { CourseInput } from "@/lib/validation/courses";

export async function listCoursesForUser(userId: string): Promise<Course[]> {
  return db.select().from(courses).where(eq(courses.userId, userId)).orderBy(courses.createdAt);
}

// Returns null both when the course doesn't exist and when it belongs to someone
// else — callers (and the UI) can't distinguish "not found" from "not yours",
// which avoids leaking which course ids exist to users who don't own them.
export async function getCourseForUser(userId: string, courseId: string): Promise<Course | null> {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .limit(1);
  return course ?? null;
}

export async function createCourseForUser(userId: string, input: CourseInput): Promise<Course> {
  const [course] = await db
    .insert(courses)
    .values({ userId, ...input })
    .returning();
  return course;
}

export async function updateCourseForUser(
  userId: string,
  courseId: string,
  input: CourseInput,
): Promise<Course | null> {
  const [course] = await db
    .update(courses)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .returning();
  return course ?? null;
}

export async function deleteCourseForUser(userId: string, courseId: string): Promise<boolean> {
  const deleted = await db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .returning({ id: courses.id });
  return deleted.length > 0;
}
