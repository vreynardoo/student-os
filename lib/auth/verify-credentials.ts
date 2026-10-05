import { loginSchema } from "@/lib/validation/auth";
import { getUserByEmail } from "@/lib/services/user-service";
import { verifyPassword } from "@/lib/auth/password";

export type AuthenticatedUser = { id: string; email: string; name: string };

export async function verifyCredentials(raw: unknown): Promise<AuthenticatedUser | null> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;

  const user = await getUserByEmail(parsed.data.email);
  if (!user) return null;

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
