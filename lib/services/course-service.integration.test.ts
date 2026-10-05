// Real database integration test — see user-service.integration.test.ts for the pattern.
// Excluded from `npm test`; run explicitly with `npm run test:integration`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, courses } from "@/lib/db/schema";
import { createUser } from "./user-service";
import {
  createCourseForUser,
  deleteCourseForUser,
  getCourseForUser,
  listCoursesForUser,
  updateCourseForUser,
} from "./course-service";

const suffix = Date.now();
const userAEmail = `studentos-course-test-a+${suffix}@example.com`;
const userBEmail = `studentos-course-test-b+${suffix}@example.com`;

let userAId: string;
let userBId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — this integration test requires a real Neon connection in .env.local.");
  }

  const a = await createUser({ name: "Course Test A", email: userAEmail, password: "verysecure123" });
  const b = await createUser({ name: "Course Test B", email: userBEmail, password: "verysecure123" });
  if (!a.ok || !b.ok) throw new Error("Failed to create integration test users");
  userAId = a.user.id;
  userBId = b.user.id;
});

afterAll(async () => {
  await db.delete(courses).where(eq(courses.userId, userAId));
  await db.delete(courses).where(eq(courses.userId, userBId));
  await db.delete(users).where(eq(users.id, userAId));
  await db.delete(users).where(eq(users.id, userBId));
});

describe("course-service against a real database", () => {
  it("creates a course owned by the authenticated user", async () => {
    const course = await createCourseForUser(userAId, { name: "Deep Learning", code: "CS501" });
    expect(course.userId).toBe(userAId);
  });

  it("lists only the authenticated user's courses", async () => {
    const list = await listCoursesForUser(userAId);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.userId === userAId)).toBe(true);
  });

  it("prevents another real user from reading this course", async () => {
    const [course] = await listCoursesForUser(userAId);
    await expect(getCourseForUser(userBId, course.id)).resolves.toBeNull();
  });

  it("allows the owner to update their own course", async () => {
    const [course] = await listCoursesForUser(userAId);
    const updated = await updateCourseForUser(userAId, course.id, { name: "Deep Learning II" });
    expect(updated?.name).toBe("Deep Learning II");
  });

  it("prevents another real user from updating this course", async () => {
    const [course] = await listCoursesForUser(userAId);
    const result = await updateCourseForUser(userBId, course.id, { name: "Hijacked" });
    expect(result).toBeNull();

    const stillThere = await getCourseForUser(userAId, course.id);
    expect(stillThere?.name).toBe("Deep Learning II");
  });

  it("prevents another real user from deleting this course", async () => {
    const [course] = await listCoursesForUser(userAId);
    const deleted = await deleteCourseForUser(userBId, course.id);
    expect(deleted).toBe(false);

    const stillThere = await getCourseForUser(userAId, course.id);
    expect(stillThere).not.toBeNull();
  });

  it("allows the owner to delete their own course", async () => {
    const [course] = await listCoursesForUser(userAId);
    await expect(deleteCourseForUser(userAId, course.id)).resolves.toBe(true);
  });
});
