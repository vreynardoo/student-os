import { describe, expect, it, vi, beforeEach } from "vitest";

const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderBy }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
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
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

const { listCoursesForUser, getCourseForUser, createCourseForUser, updateCourseForUser, deleteCourseForUser } =
  await import("./course-service");

const sampleCourse = {
  id: "course-1",
  userId: "user-1",
  name: "Deep Learning",
  code: "CS501",
  color: null,
  term: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("course-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listCoursesForUser returns the user's courses", async () => {
    mockOrderBy.mockResolvedValueOnce([sampleCourse]);
    await expect(listCoursesForUser("user-1")).resolves.toEqual([sampleCourse]);
  });

  it("getCourseForUser returns the course when owned", async () => {
    mockLimit.mockResolvedValueOnce([sampleCourse]);
    await expect(getCourseForUser("user-1", "course-1")).resolves.toEqual(sampleCourse);
  });

  it("getCourseForUser returns null when not found or not owned", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await expect(getCourseForUser("user-1", "someone-elses-course")).resolves.toBeNull();
  });

  it("createCourseForUser inserts with the given userId, never a client-supplied one", async () => {
    mockInsertReturning.mockResolvedValueOnce([sampleCourse]);
    await createCourseForUser("user-1", { name: "Deep Learning", code: "CS501" });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", name: "Deep Learning", code: "CS501" }),
    );
  });

  it("updateCourseForUser returns the updated row when owned", async () => {
    mockUpdateReturning.mockResolvedValueOnce([{ ...sampleCourse, name: "Updated" }]);
    const result = await updateCourseForUser("user-1", "course-1", { name: "Updated" });
    expect(result?.name).toBe("Updated");
  });

  it("updateCourseForUser returns null when the course isn't owned by this user", async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);
    const result = await updateCourseForUser("user-1", "someone-elses-course", { name: "Updated" });
    expect(result).toBeNull();
  });

  it("deleteCourseForUser returns true when a row was deleted", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "course-1" }]);
    await expect(deleteCourseForUser("user-1", "course-1")).resolves.toBe(true);
  });

  it("deleteCourseForUser returns false when nothing matched (not found or not owned)", async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);
    await expect(deleteCourseForUser("user-1", "someone-elses-course")).resolves.toBe(false);
  });
});
