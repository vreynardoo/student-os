import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));

const mockCreateCourseForUser = vi.fn();
const mockUpdateCourseForUser = vi.fn();
const mockDeleteCourseForUser = vi.fn();
vi.mock("@/lib/services/course-service", () => ({
  createCourseForUser: mockCreateCourseForUser,
  updateCourseForUser: mockUpdateCourseForUser,
  deleteCourseForUser: mockDeleteCourseForUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createCourseAction, updateCourseAction, deleteCourseAction } = await import("./courses");

describe("createCourseAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await createCourseAction({ name: "Deep Learning" });
    expect(result.ok).toBe(false);
    expect(mockCreateCourseForUser).not.toHaveBeenCalled();
  });

  it("rejects invalid input without touching the database", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    const result = await createCourseAction({ name: "" });
    expect(result.ok).toBe(false);
    expect(mockCreateCourseForUser).not.toHaveBeenCalled();
  });

  it("creates the course scoped to the session user, ignoring any client-supplied userId", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockCreateCourseForUser.mockResolvedValueOnce({ id: "course-1" });

    const result = await createCourseAction({ name: "Deep Learning", userId: "someone-else" });

    expect(result).toEqual({ ok: true });
    expect(mockCreateCourseForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Deep Learning" }),
    );
  });
});

describe("updateCourseAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await updateCourseAction("course-1", { name: "Updated" });
    expect(result.ok).toBe(false);
    expect(mockUpdateCourseForUser).not.toHaveBeenCalled();
  });

  it("returns not-found when the course isn't owned by this user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateCourseForUser.mockResolvedValueOnce(null);

    const result = await updateCourseAction("someone-elses-course", { name: "Updated" });
    expect(result).toEqual({ ok: false, error: "Course not found." });
  });

  it("updates when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockUpdateCourseForUser.mockResolvedValueOnce({ id: "course-1", name: "Updated" });

    const result = await updateCourseAction("course-1", { name: "Updated" });
    expect(result).toEqual({ ok: true });
  });
});

describe("deleteCourseAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not-found when nothing was deleted (not owned)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteCourseForUser.mockResolvedValueOnce(false);

    const result = await deleteCourseAction("someone-elses-course");
    expect(result).toEqual({ ok: false, error: "Course not found." });
  });

  it("deletes when owned", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockDeleteCourseForUser.mockResolvedValueOnce(true);

    const result = await deleteCourseAction("course-1");
    expect(result).toEqual({ ok: true });
  });
});
