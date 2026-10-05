import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, courses, type Task, type TaskStatus } from "@/lib/db/schema";
import { getCourseForUser } from "@/lib/services/course-service";
import type { TaskFiltersInput, TaskInput } from "@/lib/validation/tasks";

export type TaskWithCourse = Task & { courseName: string | null };

// Setting progress to 100 always means the task is done; marking a task
// COMPLETED always means progress reads 100 — enforced here so it holds
// regardless of entry point, backed by a DB CHECK as a second line of defense.
function normalizeStatusAndProgress(
  status: TaskStatus,
  progressPercent: number,
): { status: TaskStatus; progressPercent: number } {
  if (progressPercent === 100) return { status: "COMPLETED", progressPercent: 100 };
  if (status === "COMPLETED") return { status: "COMPLETED", progressPercent: 100 };
  return { status, progressPercent };
}

export async function listTasksForUser(userId: string, filters: TaskFiltersInput = {}): Promise<TaskWithCourse[]> {
  const conditions = [eq(tasks.userId, userId)];
  if (filters.status) conditions.push(eq(tasks.status, filters.status));
  if (filters.type) conditions.push(eq(tasks.type, filters.type));
  if (filters.courseId) conditions.push(eq(tasks.courseId, filters.courseId));

  return db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      courseId: tasks.courseId,
      type: tasks.type,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      progressPercent: tasks.progressPercent,
      weight: tasks.weight,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      courseName: courses.name,
    })
    .from(tasks)
    // left join: courseId is nullable (PERSONAL tasks have no course)
    .leftJoin(courses, eq(tasks.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(tasks.dueDate);
}

// Not-found and not-yours collapse to the same null — see course-service.ts.
export async function getTaskForUser(userId: string, taskId: string): Promise<Task | null> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return task ?? null;
}

export type CreateTaskResult = { ok: true; task: Task } | { ok: false; error: "COURSE_NOT_FOUND" };

export async function createTaskForUser(userId: string, input: TaskInput): Promise<CreateTaskResult> {
  if (input.courseId) {
    const course = await getCourseForUser(userId, input.courseId);
    if (!course) return { ok: false, error: "COURSE_NOT_FOUND" };
  }

  const { status, progressPercent } = normalizeStatusAndProgress(input.status, input.progressPercent);

  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      courseId: input.courseId ?? null,
      type: input.type,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      weight: input.weight,
      status,
      progressPercent,
    })
    .returning();

  return { ok: true, task };
}

export type UpdateTaskResult = { ok: true; task: Task } | { ok: false; error: "NOT_FOUND" | "COURSE_NOT_FOUND" };

export async function updateTaskForUser(userId: string, taskId: string, input: TaskInput): Promise<UpdateTaskResult> {
  if (input.courseId) {
    const course = await getCourseForUser(userId, input.courseId);
    if (!course) return { ok: false, error: "COURSE_NOT_FOUND" };
  }

  const { status, progressPercent } = normalizeStatusAndProgress(input.status, input.progressPercent);

  const [task] = await db
    .update(tasks)
    .set({
      courseId: input.courseId ?? null,
      type: input.type,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      weight: input.weight,
      status,
      progressPercent,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!task) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, task };
}

// Dedicated quick-update path for the "update progress" / "mark as completed"
// UI actions, so bumping progress doesn't require resubmitting the whole task.
export async function updateTaskProgressForUser(
  userId: string,
  taskId: string,
  progressPercent: number,
): Promise<Task | null> {
  const existing = await getTaskForUser(userId, taskId);
  if (!existing) return null;

  const status: TaskStatus =
    progressPercent === 100
      ? "COMPLETED"
      : existing.status === "COMPLETED"
        ? "IN_PROGRESS"
        : (existing.status as TaskStatus);

  const [task] = await db
    .update(tasks)
    .set({ progressPercent, status, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return task ?? null;
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}
