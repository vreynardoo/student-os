import { describe, expect, it, vi, beforeEach } from "vitest";

const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy }));
const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
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
  listSchedulesForUser,
  getScheduleForUser,
  createScheduleForUser,
  updateScheduleForUser,
  deleteScheduleForUser,
} = await import("./schedule-service");

const sampleSchedule = {
  id: "schedule-1",
  courseId: "course-1",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "10:30",
  location: "Room 203",
  createdAt: new Date(),
};

describe("schedule-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listSchedulesForUser returns schedules joined with their course name", async () => {
    mockOrderBy.mockResolvedValueOnce([{ ...sampleSchedule, courseName: "Deep Learning" }]);
    const result = await listSchedulesForUser("user-1");
    expect(result).toEqual([{ ...sampleSchedule, courseName: "Deep Learning" }]);
  });

  it("getScheduleForUser returns the schedule when its course is owned by this user", async () => {
    mockLimit.mockResolvedValueOnce([{ schedule: sampleSchedule }]);
    await expect(getScheduleForUser("user-1", "schedule-1")).resolves.toEqual(sampleSchedule);
  });

  it("getScheduleForUser returns null when not found or the course isn't owned", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(getScheduleForUser("user-1", "someone-elses-schedule")).resolves.toBeNull();
  });

  it("createScheduleForUser inserts when the course belongs to this user", async () => {
    mockGetCourseForUser.mockResolvedValueOnce({ id: "course-1", userId: "user-1" });
    mockInsertReturning.mockResolvedValueOnce([sampleSchedule]);

    const result = await createScheduleForUser("user-1", {
      courseId: "course-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:30",
    });

    expect(result).toEqual({ ok: true, schedule: sampleSchedule });
  });

  it("rejects creating a schedule for a course that doesn't belong to this user, without touching the insert", async () => {
    mockGetCourseForUser.mockResolvedValueOnce(null);

    const result = await createScheduleForUser("user-1", {
      courseId: "someone-elses-course",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:30",
    });

    expect(result).toEqual({ ok: false, error: "COURSE_NOT_FOUND" });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("updateScheduleForUser updates when the schedule's course is owned by this user", async () => {
    mockLimit.mockResolvedValueOnce([{ schedule: sampleSchedule }]);
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleSchedule, startTime: "11:00" }]);

    const result = await updateScheduleForUser("user-1", "schedule-1", {
      dayOfWeek: 1,
      startTime: "11:00",
      endTime: "12:00",
    });

    expect(result?.startTime).toBe("11:00");
  });

  it("updateScheduleForUser returns null without updating when not owned", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await updateScheduleForUser("user-1", "someone-elses-schedule", {
      dayOfWeek: 1,
      startTime: "11:00",
      endTime: "12:00",
    });

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("deleteScheduleForUser deletes when owned", async () => {
    mockLimit.mockResolvedValueOnce([{ schedule: sampleSchedule }]);
    mockDeleteReturning.mockResolvedValueOnce([{ id: "schedule-1" }]);

    await expect(deleteScheduleForUser("user-1", "schedule-1")).resolves.toBe(true);
  });

  it("deleteScheduleForUser returns false without deleting when not owned", async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(deleteScheduleForUser("user-1", "someone-elses-schedule")).resolves.toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
