import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

function firstCallArg(mockFn: Mock): { status: string; progressPercent: number } {
  const calls = mockFn.mock.calls as unknown as Array<[{ status: string; progressPercent: number }]>;
  return calls[0][0];
}

const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy }));
const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ where: mockWhere, leftJoin: mockLeftJoin }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDeleteReturning = vi.fn();
const mockDeleteWhere = vi.fn(() => ({ returning: mockDeleteReturning }));
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete },
}));

const mockGetCourseForUser = vi.fn();
vi.mock("@/lib/services/course-service", () => ({
  getCourseForUser: mockGetCourseForUser,
}));

const {
  listTasksForUser,
  getTaskForUser,
  createTaskForUser,
  updateTaskForUser,
  updateTaskProgressForUser,
  deleteTaskForUser,
} = await import("./task-service");

const sampleTask = {
  id: "task-1",
  userId: "user-1",
  courseId: null,
  type: "PERSONAL",
  title: "Read chapter 4",
  description: null,
  status: "TODO",
  dueDate: new Date("2026-06-01T00:00:00Z"),
  estimatedHours: 2,
  progressPercent: 0,
  weight: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseInput = {
  type: "PERSONAL" as const,
  title: "Read chapter 4",
  status: "TODO" as const,
  dueDate: new Date("2026-06-01T00:00:00Z"),
  progressPercent: 0,
  weight: 1,
};

describe("task-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listTasksForUser returns the user's tasks joined with course name", async () => {
    mockOrderBy.mockResolvedValueOnce([{ ...sampleTask, courseName: null }]);
    await expect(listTasksForUser("user-1")).resolves.toEqual([{ ...sampleTask, courseName: null }]);
  });

  it("getTaskForUser returns the task when owned", async () => {
    mockLimit.mockResolvedValueOnce([sampleTask]);
    await expect(getTaskForUser("user-1", "task-1")).resolves.toEqual(sampleTask);
  });

  it("getTaskForUser returns null when not found or not owned", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(getTaskForUser("user-1", "someone-elses-task")).resolves.toBeNull();
  });

  it("createTaskForUser creates a task with no course", async () => {
    mockInsertReturning.mockResolvedValueOnce([sampleTask]);
    const result = await createTaskForUser("user-1", baseInput);
    expect(result).toEqual({ ok: true, task: sampleTask });
    expect(mockGetCourseForUser).not.toHaveBeenCalled();
  });

  it("createTaskForUser verifies the course belongs to this user before inserting", async () => {
    mockGetCourseForUser.mockResolvedValueOnce({ id: "course-1", userId: "user-1" });
    mockInsertReturning.mockResolvedValueOnce([{ ...sampleTask, courseId: "course-1" }]);

    const result = await createTaskForUser("user-1", { ...baseInput, courseId: "course-1" });

    expect(result.ok).toBe(true);
    expect(mockGetCourseForUser).toHaveBeenCalledWith("user-1", "course-1");
  });

  it("rejects creating a task against a course that isn't owned by this user", async () => {
    mockGetCourseForUser.mockResolvedValueOnce(null);

    const result = await createTaskForUser("user-1", { ...baseInput, courseId: "someone-elses-course" });

    expect(result).toEqual({ ok: false, error: "COURSE_NOT_FOUND" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("createTaskForUser normalizes progress=100 input to COMPLETED", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ ...sampleTask, status: "COMPLETED", progressPercent: 100 }]);
    await createTaskForUser("user-1", { ...baseInput, progressPercent: 100 });

    const insertedValues = firstCallArg(mockInsertValues);
    expect(insertedValues.status).toBe("COMPLETED");
    expect(insertedValues.progressPercent).toBe(100);
  });

  it("createTaskForUser normalizes status=COMPLETED input to progress=100", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ ...sampleTask, status: "COMPLETED", progressPercent: 100 }]);
    await createTaskForUser("user-1", { ...baseInput, status: "COMPLETED", progressPercent: 40 });

    const insertedValues = firstCallArg(mockInsertValues);
    expect(insertedValues.status).toBe("COMPLETED");
    expect(insertedValues.progressPercent).toBe(100);
  });

  it("updateTaskForUser updates when owned", async () => {
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleTask, title: "Updated" }]);
    const result = await updateTaskForUser("user-1", "task-1", { ...baseInput, title: "Updated" });
    expect(result).toEqual({ ok: true, task: { ...sampleTask, title: "Updated" } });
  });

  it("updateTaskForUser returns NOT_FOUND when the task isn't owned by this user", async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);
    const result = await updateTaskForUser("user-1", "someone-elses-task", baseInput);
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("updateTaskForUser rejects attaching a course owned by another user", async () => {
    mockGetCourseForUser.mockResolvedValueOnce(null);
    const result = await updateTaskForUser("user-1", "task-1", { ...baseInput, courseId: "someone-elses-course" });
    expect(result).toEqual({ ok: false, error: "COURSE_NOT_FOUND" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updateTaskProgressForUser sets status to COMPLETED at 100%", async () => {
    mockLimit.mockResolvedValueOnce([{ ...sampleTask, status: "IN_PROGRESS", progressPercent: 60 }]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleTask, status: "COMPLETED", progressPercent: 100 }]);

    const result = await updateTaskProgressForUser("user-1", "task-1", 100);
    expect(result?.status).toBe("COMPLETED");

    const setArgs = firstCallArg(mockUpdateSet);
    expect(setArgs.status).toBe("COMPLETED");
  });

  it("updateTaskProgressForUser reverts a completed task to IN_PROGRESS when progress drops below 100", async () => {
    mockLimit.mockResolvedValueOnce([{ ...sampleTask, status: "COMPLETED", progressPercent: 100 }]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleTask, status: "IN_PROGRESS", progressPercent: 50 }]);

    await updateTaskProgressForUser("user-1", "task-1", 50);

    const setArgs = firstCallArg(mockUpdateSet);
    expect(setArgs.status).toBe("IN_PROGRESS");
  });

  it("updateTaskProgressForUser keeps the existing status otherwise", async () => {
    mockLimit.mockResolvedValueOnce([{ ...sampleTask, status: "TODO", progressPercent: 0 }]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleTask, status: "TODO", progressPercent: 30 }]);

    await updateTaskProgressForUser("user-1", "task-1", 30);

    const setArgs = firstCallArg(mockUpdateSet);
    expect(setArgs.status).toBe("TODO");
  });

  it("updateTaskProgressForUser returns null without writing when not owned", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const result = await updateTaskProgressForUser("user-1", "someone-elses-task", 50);
    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("deleteTaskForUser deletes when owned", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "task-1" }]);
    await expect(deleteTaskForUser("user-1", "task-1")).resolves.toBe(true);
  });

  it("deleteTaskForUser returns false when not owned", async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);
    await expect(deleteTaskForUser("user-1", "someone-elses-task")).resolves.toBe(false);
  });
});
