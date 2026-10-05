import { describe, expect, it } from "vitest";
import { createScheduleSchema, updateScheduleSchema } from "./schedule";

describe("createScheduleSchema", () => {
  const base = { courseId: "course-1", dayOfWeek: 1, startTime: "09:00", endTime: "10:30" };

  it("accepts valid input", () => {
    expect(createScheduleSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an optional location", () => {
    const result = createScheduleSchema.safeParse({ ...base, location: "Room 203" });
    expect(result.success).toBe(true);
  });

  it("rejects when endTime is before startTime", () => {
    const result = createScheduleSchema.safeParse({ ...base, startTime: "10:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects when endTime equals startTime", () => {
    const result = createScheduleSchema.safeParse({ ...base, startTime: "09:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a dayOfWeek outside 1-7", () => {
    expect(createScheduleSchema.safeParse({ ...base, dayOfWeek: 0 }).success).toBe(false);
    expect(createScheduleSchema.safeParse({ ...base, dayOfWeek: 8 }).success).toBe(false);
  });

  it("rejects a malformed time string", () => {
    expect(createScheduleSchema.safeParse({ ...base, startTime: "9:00" }).success).toBe(false);
    expect(createScheduleSchema.safeParse({ ...base, startTime: "25:00" }).success).toBe(false);
    expect(createScheduleSchema.safeParse({ ...base, startTime: "09:60" }).success).toBe(false);
  });

  it("rejects a missing courseId", () => {
    expect(createScheduleSchema.safeParse({ ...base, courseId: "" }).success).toBe(false);
  });
});

describe("updateScheduleSchema", () => {
  it("accepts valid input without a courseId field", () => {
    const result = updateScheduleSchema.safeParse({ dayOfWeek: 3, startTime: "08:00", endTime: "09:00" });
    expect(result.success).toBe(true);
  });

  it("rejects when endTime is not after startTime", () => {
    const result = updateScheduleSchema.safeParse({ dayOfWeek: 3, startTime: "09:00", endTime: "08:00" });
    expect(result.success).toBe(false);
  });
});
