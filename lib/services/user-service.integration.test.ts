// Real database integration test — hits the live Neon DB configured in .env.local.
// Deliberately excluded from the default `npm test` run (see vitest.config.ts),
// which must stay fast and offline. Run explicitly with `npm run test:integration`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createUser, getUserByEmail } from "./user-service";
import { verifyCredentials } from "@/lib/auth/verify-credentials";

const testEmail = `studentos-integration-test+${Date.now()}@example.com`;
const testPassword = "verysecure123";

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — this integration test requires a real Neon connection in .env.local.");
  }
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, testEmail));
});

describe("user-service against a real database", () => {
  it("creates a real row and defaults timezone to Asia/Jakarta", async () => {
    const result = await createUser({ name: "Integration Test", email: testEmail, password: testPassword });

    expect(result.ok).toBe(true);

    const stored = await getUserByEmail(testEmail);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe("Integration Test");
    expect(stored?.timezone).toBe("Asia/Jakarta");
    expect(stored?.passwordHash).not.toBe(testPassword);
  });

  it("rejects a second registration with the same email via the real unique constraint", async () => {
    const result = await createUser({ name: "Duplicate", email: testEmail, password: testPassword });
    expect(result).toEqual({ ok: false, error: "EMAIL_TAKEN" });
  });

  it("logs in with correct credentials against the real row", async () => {
    const user = await verifyCredentials({ email: testEmail, password: testPassword });
    expect(user).toMatchObject({ email: testEmail, name: "Integration Test" });
  });

  it("rejects login with an incorrect password against the real row", async () => {
    const user = await verifyCredentials({ email: testEmail, password: "wrong-password" });
    expect(user).toBeNull();
  });
});
