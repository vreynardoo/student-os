import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classSchedules, courses, type ClassSchedule } from "@/lib/db/schema";
import { getCourseForUser } from "@/lib/services/course-service";
import type { CreateScheduleInput, UpdateScheduleInput } from "@/lib/validation/schedule";

export type ScheduleWithCourse = ClassSchedule & { courseName: string };

export async function listSchedulesForUser(userId: string): Promise<ScheduleWithCourse[]> {
  return db
    .select({
      id: classSchedules.id,
      courseId: classSchedules.courseId,
      dayOfWeek: classSchedules.dayOfWeek,
      startTime: classSchedules.startTime,
      endTime: classSchedules.endTime,
      location: classSchedules.location,
      createdAt: classSchedules.createdAt,
      courseName: courses.name,
    })
    .from(classSchedules)
    .innerJoin(courses, eq(classSchedules.courseId, courses.id))
    .where(eq(courses.userId, userId))
    .orderBy(classSchedules.dayOfWeek, classSchedules.startTime);
}

// As in course-service: not-found and not-yours collapse to the same null,
// via an inner join on the owning course rather than trusting a userId column
// on the schedule itself (schedules have none — ownership is transitive).
export async function getScheduleForUser(userId: string, scheduleId: string): Promise<ClassSchedule | null> {
  const [row] = await db
    .select({ schedule: classSchedules })
    .from(classSchedules)
    .innerJoin(courses, eq(classSchedules.courseId, courses.id))
    .where(and(eq(classSchedules.id, scheduleId), eq(courses.userId, userId)))
    .limit(1);
  return row?.schedule ?? null;
}

export type CreateScheduleResult = { ok: true; schedule: ClassSchedule } | { ok: false; error: "COURSE_NOT_FOUND" };

export async function createScheduleForUser(
  userId: string,
  input: CreateScheduleInput,
): Promise<CreateScheduleResult> {
  const course = await getCourseForUser(userId, input.courseId);
  if (!course) {
    return { ok: false, error: "COURSE_NOT_FOUND" };
  }

  const [schedule] = await db
    .insert(classSchedules)
    .values({
      courseId: input.courseId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
    })
    .returning();

  return { ok: true, schedule };
}

export async function updateScheduleForUser(
  userId: string,
  scheduleId: string,
  input: UpdateScheduleInput,
): Promise<ClassSchedule | null> {
  const existing = await getScheduleForUser(userId, scheduleId);
  if (!existing) return null;

  const [schedule] = await db
    .update(classSchedules)
    .set({
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
    })
    .where(eq(classSchedules.id, scheduleId))
    .returning();

  return schedule ?? null;
}

export async function deleteScheduleForUser(userId: string, scheduleId: string): Promise<boolean> {
  const existing = await getScheduleForUser(userId, scheduleId);
  if (!existing) return false;

  const deleted = await db
    .delete(classSchedules)
    .where(eq(classSchedules.id, scheduleId))
    .returning({ id: classSchedules.id });
  return deleted.length > 0;
}
