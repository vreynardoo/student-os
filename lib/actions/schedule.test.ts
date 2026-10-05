import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockCreateScheduleForUser = vi.fn();
const mockUpdateScheduleForUser = vi.fn();
const mockDeleteScheduleForUser = vi.fn();
vi.mock("@/lib/services/schedule-service", () => ({
  createScheduleForUser: mockCreateScheduleForUser,
  updateScheduleForUser: mockUpdateScheduleForUser,
  deleteScheduleForUser: mockDeleteScheduleForUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createScheduleAction, updateScheduleAction, deleteScheduleAction } = await import("./schedule");

const validInput = { courseId: "course-1", dayOfWeek: 1, startTime: "09:00", endTime: "10:30" };

describe("createScheduleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await createScheduleAction(validInput);
    expect(result.ok).toBe(false);
    expect(mockCreateScheduleForUser).not.toHaveBeenCalled();
  });

  it("rejects invalid input (end before start) without touching the database", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const result = await createScheduleAction({ ...validInput, startTime: "10:00", endTime: "09:00" });
    expect(result.ok).toBe(false);
    expect(mockCreateScheduleForUser).not.toHaveBeenCalled();
  });

  it("surfaces COURSE_NOT_FOUND from the service as a clean error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreateScheduleForUser.mockResolvedValueOnce({ ok: false, error: "COURSE_NOT_FOUND" });

    const result = await createScheduleAction({ ...validInput, courseId: "someone-elses-course" });
    expect(result).toEqual({ ok: false, error: "That course could not be found." });
  });

  it("creates the schedule scoped to the session user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreateScheduleForUser.mockResolvedValueOnce({ ok: true, schedule: { id: "schedule-1" } });

    const result = await createScheduleAction(validInput);

    expect(result).toEqual({ ok: true });
    expect(mockCreateScheduleForUser).toHaveBeenCalledWith("user-1", expect.objectContaining(validInput));
  });
});

describe("updateScheduleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when the schedule isn't owned by this user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateScheduleForUser.mockResolvedValueOnce(null);

    const result = await updateScheduleAction("someone-elses-schedule", {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(result).toEqual({ ok: false, error: "Schedule not found." });
  });

  it("updates when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateScheduleForUser.mockResolvedValueOnce({ id: "schedule-1" });

    const result = await updateScheduleAction("schedule-1", {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("deleteScheduleAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when nothing was deleted (not owned)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteScheduleForUser.mockResolvedValueOnce(false);

    const result = await deleteScheduleAction("someone-elses-schedule");
    expect(result).toEqual({ ok: false, error: "Schedule not found." });
  });

  it("deletes when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteScheduleForUser.mockResolvedValueOnce(true);

    const result = await deleteScheduleAction("schedule-1");
    expect(result).toEqual({ ok: true });
  });
});
