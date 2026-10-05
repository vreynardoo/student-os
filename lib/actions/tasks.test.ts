import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockCreateTaskForUser = vi.fn();
const mockUpdateTaskForUser = vi.fn();
const mockUpdateTaskProgressForUser = vi.fn();
const mockDeleteTaskForUser = vi.fn();
vi.mock("@/lib/services/task-service", () => ({
  createTaskForUser: mockCreateTaskForUser,
  updateTaskForUser: mockUpdateTaskForUser,
  updateTaskProgressForUser: mockUpdateTaskProgressForUser,
  deleteTaskForUser: mockDeleteTaskForUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createTaskAction, updateTaskAction, updateTaskProgressAction, deleteTaskAction } = await import("./tasks");

const validInput = { type: "ASSIGNMENT", title: "Finish problem set", dueDate: "2026-06-01T00:00:00.000Z" };

describe("createTaskAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await createTaskAction(validInput);
    expect(result.ok).toBe(false);
    expect(mockCreateTaskForUser).not.toHaveBeenCalled();
  });

  it("rejects invalid input without touching the database", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const result = await createTaskAction({ ...validInput, title: "" });
    expect(result.ok).toBe(false);
    expect(mockCreateTaskForUser).not.toHaveBeenCalled();
  });

  it("creates the task scoped to the session user, ignoring any client-supplied userId", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreateTaskForUser.mockResolvedValueOnce({ ok: true, task: { id: "task-1" } });

    const result = await createTaskAction({ ...validInput, userId: "someone-else" });

    expect(result).toEqual({ ok: true });
    expect(mockCreateTaskForUser).toHaveBeenCalledWith("user-1", expect.objectContaining({ title: validInput.title }));
  });

  it("surfaces COURSE_NOT_FOUND as a clean error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreateTaskForUser.mockResolvedValueOnce({ ok: false, error: "COURSE_NOT_FOUND" });

    const result = await createTaskAction({ ...validInput, courseId: "someone-elses-course" });
    expect(result).toEqual({ ok: false, error: "That course could not be found." });
  });
});

describe("updateTaskAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when the task isn't owned by this user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateTaskForUser.mockResolvedValueOnce({ ok: false, error: "NOT_FOUND" });

    const result = await updateTaskAction("someone-elses-task", validInput);
    expect(result).toEqual({ ok: false, error: "Task not found." });
  });

  it("updates when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateTaskForUser.mockResolvedValueOnce({ ok: true, task: { id: "task-1" } });

    const result = await updateTaskAction("task-1", validInput);
    expect(result).toEqual({ ok: true });
  });
});

describe("updateTaskProgressAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an out-of-range progress value without touching the database", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const result = await updateTaskProgressAction("task-1", { progressPercent: 150 });
    expect(result.ok).toBe(false);
    expect(mockUpdateTaskProgressForUser).not.toHaveBeenCalled();
  });

  it("returns not-found when the task isn't owned by this user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateTaskProgressForUser.mockResolvedValueOnce(null);

    const result = await updateTaskProgressAction("someone-elses-task", { progressPercent: 50 });
    expect(result).toEqual({ ok: false, error: "Task not found." });
  });

  it("updates progress when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateTaskProgressForUser.mockResolvedValueOnce({ id: "task-1", progressPercent: 50 });

    const result = await updateTaskProgressAction("task-1", { progressPercent: 50 });
    expect(result).toEqual({ ok: true });
  });
});

describe("deleteTaskAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when nothing was deleted (not owned)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteTaskForUser.mockResolvedValueOnce(false);

    const result = await deleteTaskAction("someone-elses-task");
    expect(result).toEqual({ ok: false, error: "Task not found." });
  });

  it("deletes when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteTaskForUser.mockResolvedValueOnce(true);

    const result = await deleteTaskAction("task-1");
    expect(result).toEqual({ ok: true });
  });
});
