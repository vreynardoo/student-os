import { describe, expect, it } from "vitest";
import { taskSchema, updateTaskProgressSchema } from "./tasks";

const validInput = {
  type: "ASSIGNMENT",
  title: "Finish problem set",
  dueDate: "2026-06-01T10:00:00.000Z",
};

describe("taskSchema", () => {
  it("accepts a minimal valid task and applies defaults", () => {
    const result = taskSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("TODO");
      expect(result.data.progressPercent).toBe(0);
      expect(result.data.weight).toBe(1);
    }
  });

  it("accepts a fully specified task", () => {
    const result = taskSchema.safeParse({
      ...validInput,
      courseId: "course-1",
      description: "Chapters 1-3",
      status: "IN_PROGRESS",
      estimatedHours: 3.5,
      progressPercent: 40,
      weight: 1.2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    expect(taskSchema.safeParse({ type: validInput.type, dueDate: validInput.dueDate }).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(taskSchema.safeParse({ ...validInput, title: "" }).success).toBe(false);
  });

  it("rejects an invalid type", () => {
    expect(taskSchema.safeParse({ ...validInput, type: "HOMEWORK" }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(taskSchema.safeParse({ ...validInput, status: "DONE" }).success).toBe(false);
  });

  it("rejects progress below 0 or above 100", () => {
    expect(taskSchema.safeParse({ ...validInput, progressPercent: -1 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validInput, progressPercent: 101 }).success).toBe(false);
  });

  it("rejects a non-integer progress value", () => {
    expect(taskSchema.safeParse({ ...validInput, progressPercent: 50.5 }).success).toBe(false);
  });

  it("rejects estimatedHours that is zero or negative", () => {
    expect(taskSchema.safeParse({ ...validInput, estimatedHours: 0 }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validInput, estimatedHours: -2 }).success).toBe(false);
  });

  it("rejects a negative weight", () => {
    expect(taskSchema.safeParse({ ...validInput, weight: -0.5 }).success).toBe(false);
  });

  it("rejects an invalid due date", () => {
    expect(taskSchema.safeParse({ ...validInput, dueDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects a missing due date", () => {
    expect(taskSchema.safeParse({ type: validInput.type, title: validInput.title }).success).toBe(false);
  });
});

describe("updateTaskProgressSchema", () => {
  it("accepts a valid progress value", () => {
    expect(updateTaskProgressSchema.safeParse({ progressPercent: 75 }).success).toBe(true);
  });

  it("rejects an out-of-range progress value", () => {
    expect(updateTaskProgressSchema.safeParse({ progressPercent: 150 }).success).toBe(false);
  });
});
