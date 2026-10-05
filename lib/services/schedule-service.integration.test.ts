// Real database integration test — see user-service.integration.test.ts for the pattern.
// Excluded from `npm test`; run explicitly with `npm run test:integration`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, courses, classSchedules } from "@/lib/db/schema";
import { createUser } from "./user-service";
import { createCourseForUser } from "./course-service";
import {
  createScheduleForUser,
  deleteScheduleForUser,
  getScheduleForUser,
  listSchedulesForUser,
  updateScheduleForUser,
} from "./schedule-service";

const suffix = Date.now();
const userAEmail = `studentos-schedule-test-a+${suffix}@example.com`;
const userBEmail = `studentos-schedule-test-b+${suffix}@example.com`;

let userAId: string;
let userBId: string;
let courseAId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — this integration test requires a real Neon connection in .env.local.");
  }

  const a = await createUser({ name: "Schedule Test A", email: userAEmail, password: "verysecure123" });
  const b = await createUser({ name: "Schedule Test B", email: userBEmail, password: "verysecure123" });
  if (!a.ok || !b.ok) throw new Error("Failed to create integration test users");
  userAId = a.user.id;
  userBId = b.user.id;

  const course = await createCourseForUser(userAId, { name: "Deep Learning" });
  courseAId = course.id;
});

afterAll(async () => {
  await db.delete(classSchedules).where(eq(classSchedules.courseId, courseAId));
  await db.delete(courses).where(eq(courses.id, courseAId));
  await db.delete(users).where(eq(users.id, userAId));
  await db.delete(users).where(eq(users.id, userBId));
});

describe("schedule-service against a real database", () => {
  it("creates a schedule for a course owned by the authenticated user", async () => {
    const result = await createScheduleForUser(userAId, {
      courseId: courseAId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects creating a schedule for a course owned by another real user", async () => {
    const result = await createScheduleForUser(userBId, {
      courseId: courseAId,
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(result).toEqual({ ok: false, error: "COURSE_NOT_FOUND" });
  });

  it("lists the schedule joined with its course name for the owner", async () => {
    const list = await listSchedulesForUser(userAId);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].courseName).toBe("Deep Learning");
  });

  it("hides the schedule from another real user", async () => {
    const list = await listSchedulesForUser(userBId);
    expect(list).toEqual([]);
  });

  it("prevents another real user from reading, updating, or deleting the schedule", async () => {
    const [schedule] = await listSchedulesForUser(userAId);

    await expect(getScheduleForUser(userBId, schedule.id)).resolves.toBeNull();
    await expect(
      updateScheduleForUser(userBId, schedule.id, { dayOfWeek: 3, startTime: "08:00", endTime: "09:00" }),
    ).resolves.toBeNull();
    await expect(deleteScheduleForUser(userBId, schedule.id)).resolves.toBe(false);

    const stillThere = await getScheduleForUser(userAId, schedule.id);
    expect(stillThere).not.toBeNull();
  });

  it("allows the owner to update and delete their own schedule", async () => {
    const [schedule] = await listSchedulesForUser(userAId);

    const updated = await updateScheduleForUser(userAId, schedule.id, {
      dayOfWeek: 1,
      startTime: "11:00",
      endTime: "12:00",
    });
    expect(updated?.startTime).toBe("11:00");

    await expect(deleteScheduleForUser(userAId, schedule.id)).resolves.toBe(true);
  });
});
