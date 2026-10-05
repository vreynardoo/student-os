"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createScheduleSchema, updateScheduleSchema } from "@/lib/validation/schedule";
import {
  createScheduleForUser,
  deleteScheduleForUser,
  updateScheduleForUser,
} from "@/lib/services/schedule-service";

export type ScheduleActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function createScheduleAction(input: unknown): Promise<ScheduleActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = createScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createScheduleForUser(userId, parsed.data);
  if (!result.ok) {
    return { ok: false, error: "That course could not be found." };
  }

  revalidatePath("/schedule");
  return { ok: true };
}

export async function updateScheduleAction(scheduleId: string, input: unknown): Promise<ScheduleActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const updated = await updateScheduleForUser(userId, scheduleId, parsed.data);
  if (!updated) {
    return { ok: false, error: "Schedule not found." };
  }

  revalidatePath("/schedule");
  return { ok: true };
}

export async function deleteScheduleAction(scheduleId: string): Promise<ScheduleActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const deleted = await deleteScheduleForUser(userId, scheduleId);
  if (!deleted) {
    return { ok: false, error: "Schedule not found." };
  }

  revalidatePath("/schedule");
  return { ok: true };
}
