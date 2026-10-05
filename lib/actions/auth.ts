"use server";

import { registerSchema } from "@/lib/validation/auth";
import { createUser } from "@/lib/services/user-service";

export type RegisterActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function registerUser(input: unknown): Promise<RegisterActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createUser(parsed.data);
  if (!result.ok) {
    return { ok: false, error: "An account with this email already exists." };
  }

  return { ok: true };
}
