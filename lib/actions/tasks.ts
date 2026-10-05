"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { taskSchema, updateTaskProgressSchema } from "@/lib/validation/tasks";
import {
  createTaskForUser,
  deleteTaskForUser,
  updateTaskForUser,
  updateTaskProgressForUser,
} from "@/lib/services/task-service";

export type TaskActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function errorMessageFor(error: "COURSE_NOT_FOUND" | "NOT_FOUND"): string {
  return error === "COURSE_NOT_FOUND" ? "That course could not be found." : "Task not found.";
}

export async function createTaskAction(input: unknown): Promise<TaskActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createTaskForUser(userId, parsed.data);
  if (!result.ok) {
    return { ok: false, error: errorMessageFor(result.error) };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskAction(taskId: string, input: unknown): Promise<TaskActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await updateTaskForUser(userId, taskId, parsed.data);
  if (!result.ok) {
    return { ok: false, error: errorMessageFor(result.error) };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

export async function updateTaskProgressAction(taskId: string, input: unknown): Promise<TaskActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = updateTaskProgressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await updateTaskProgressForUser(userId, taskId, parsed.data.progressPercent);
  if (!updated) {
    return { ok: false, error: "Task not found." };
  }

  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<TaskActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const deleted = await deleteTaskForUser(userId, taskId);
  if (!deleted) {
    return { ok: false, error: "Task not found." };
  }

  revalidatePath("/tasks");
  return { ok: true };
}
