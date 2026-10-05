import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/lib/validation/auth";

export type CreateUserResult =
  | { ok: true; user: Pick<User, "id" | "email" | "name"> }
  | { ok: false; error: "EMAIL_TAKEN" };

const POSTGRES_UNIQUE_VIOLATION = "23505";

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function createUser(input: RegisterInput): Promise<CreateUserResult> {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    return { ok: true, user };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === POSTGRES_UNIQUE_VIOLATION
  );
}
