// Real database integration test — see user-service.integration.test.ts for the pattern.
// Excluded from `npm test`; run explicitly with `npm run test:integration`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, courses, tasks } from "@/lib/db/schema";
import { createUser } from "./user-service";
import { createCourseForUser } from "./course-service";
import {
  createTaskForUser,
  deleteTaskForUser,
  getTaskForUser,
  updateTaskForUser,
  updateTaskProgressForUser,
} from "./task-service";

const suffix = Date.now();
const userAEmail = `studentos-task-test-a+${suffix}@example.com`;
const userBEmail = `studentos-task-test-b+${suffix}@example.com`;

let userAId: string;
let userBId: string;
let courseAId: string;
let courseBId: string;

const baseTaskInput = {
  type: "ASSIGNMENT" as const,
  title: "Finish problem set",
  status: "TODO" as const,
  dueDate: new Date("2026-06-01T00:00:00Z"),
  progressPercent: 0,
  weight: 1,
};

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — this integration test requires a real Neon connection in .env.local.");
  }

  const a = await createUser({ name: "Task Test A", email: userAEmail, password: "verysecure123" });
  const b = await createUser({ name: "Task Test B", email: userBEmail, password: "verysecure123" });
  if (!a.ok || !b.ok) throw new Error("Failed to create integration test users");
  userAId = a.user.id;
  userBId = b.user.id;

  const courseA = await createCourseForUser(userAId, { name: "Course A" });
  const courseB = await createCourseForUser(userBId, { name: "Course B" });
  courseAId = courseA.id;
  courseBId = courseB.id;
});

afterAll(async () => {
  await db.delete(tasks).where(eq(tasks.userId, userAId));
  await db.delete(tasks).where(eq(tasks.userId, userBId));
  await db.delete(courses).where(eq(courses.id, courseAId));
  await db.delete(courses).where(eq(courses.id, courseBId));
  await db.delete(users).where(eq(users.id, userAId));
  await db.delete(users).where(eq(users.id, userBId));
});

describe("task-service against a real database", () => {
  it("creates Task A owned by user A, attached to Course A", async () => {
    const result = await createTaskForUser(userAId, { ...baseTaskInput, courseId: courseAId });
    expect(result.ok).toBe(true);
  });

  it("rejects user B creating a task against Course A (owned by user A)", async () => {
    const result = await createTaskForUser(userBId, { ...baseTaskInput, title: "Hijack attempt", courseId: courseAId });
    expect(result).toEqual({ ok: false, error: "COURSE_NOT_FOUND" });
  });

  it("prevents user B from reading Task A", async () => {
    const [taskA] = await db.select().from(tasks).where(eq(tasks.userId, userAId));
    await expect(getTaskForUser(userBId, taskA.id)).resolves.toBeNull();
  });

  it("prevents user B from updating Task A, leaving it unchanged", async () => {
    const [taskA] = await db.select().from(tasks).where(eq(tasks.userId, userAId));

    const result = await updateTaskForUser(userBId, taskA.id, { ...baseTaskInput, title: "Hijacked title" });
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });

    const stillThere = await getTaskForUser(userAId, taskA.id);
    expect(stillThere?.title).toBe(baseTaskInput.title);
  });

  it("prevents user B from updating Task A's progress", async () => {
    const [taskA] = await db.select().from(tasks).where(eq(tasks.userId, userAId));

    await expect(updateTaskProgressForUser(userBId, taskA.id, 100)).resolves.toBeNull();

    const stillThere = await getTaskForUser(userAId, taskA.id);
    expect(stillThere?.progressPercent).toBe(0);
  });

  it("prevents user B from deleting Task A", async () => {
    const [taskA] = await db.select().from(tasks).where(eq(tasks.userId, userAId));

    await expect(deleteTaskForUser(userBId, taskA.id)).resolves.toBe(false);

    const stillThere = await getTaskForUser(userAId, taskA.id);
    expect(stillThere).not.toBeNull();
  });

  it("allows user A to update and delete their own task", async () => {
    const [taskA] = await db.select().from(tasks).where(eq(tasks.userId, userAId));

    const updated = await updateTaskForUser(userAId, taskA.id, { ...baseTaskInput, progressPercent: 100 });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.task.status).toBe("COMPLETED");
    }

    await expect(deleteTaskForUser(userAId, taskA.id)).resolves.toBe(true);
  });
});
