import { describe, expect, it, vi, beforeEach } from "vitest";

const NOW = new Date("2026-06-15T12:00:00Z"); // a Monday

const mockListTasksForUser = vi.fn();
vi.mock("@/lib/services/task-service", () => ({
  listTasksForUser: mockListTasksForUser,
}));

const mockListSchedulesForUser = vi.fn();
vi.mock("@/lib/services/schedule-service", () => ({
  listSchedulesForUser: mockListSchedulesForUser,
}));

const mockListCoursesForUser = vi.fn();
vi.mock("@/lib/services/course-service", () => ({
  listCoursesForUser: mockListCoursesForUser,
}));

// Priority Engine is NOT mocked — the whole point of these tests is to prove
// the context is built from the real engine's output, not a reimplemented one.
const { buildAcademicContext } = await import("./academic-context-service");

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    userId: "user-1",
    courseId: null,
    type: "ASSIGNMENT",
    title: "Sample task",
    description: null,
    status: "TODO",
    dueDate: new Date("2026-06-20T00:00:00Z"),
    estimatedHours: 2,
    progressPercent: 0,
    weight: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    courseName: null,
    ...overrides,
  };
}

function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "schedule-1",
    courseId: "course-1",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:30",
    location: "Room 101",
    createdAt: new Date(),
    courseName: "Deep Learning",
    ...overrides,
  };
}

describe("buildAcademicContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTasksForUser.mockResolvedValue([]);
    mockListSchedulesForUser.mockResolvedValue([]);
    mockListCoursesForUser.mockResolvedValue([]);
  });

  it("scopes every query to the given userId, never any other user's id", async () => {
    await buildAcademicContext("user-1", NOW);

    expect(mockListTasksForUser).toHaveBeenCalledWith("user-1");
    expect(mockListSchedulesForUser).toHaveBeenCalledWith("user-1");
    expect(mockListCoursesForUser).toHaveBeenCalledWith("user-1");
  });

  it("lists course names from the course service", async () => {
    mockListCoursesForUser.mockResolvedValue([{ id: "c1", name: "Deep Learning" }, { id: "c2", name: "Algorithms" }]);
    const { context } = await buildAcademicContext("user-1", NOW);
    expect(context.courseNames).toEqual(["Deep Learning", "Algorithms"]);
  });

  it("excludes completed tasks from the ranked list entirely", async () => {
    mockListTasksForUser.mockResolvedValue([
      makeTask({ id: "done", status: "COMPLETED", title: "Done task" }),
      makeTask({ id: "todo", title: "Todo task" }),
    ]);
    const { context } = await buildAcademicContext("user-1", NOW);
    expect(context.rankedTasks.map((t) => t.title)).toEqual(["Todo task"]);
  });

  it("ranks tasks using the real Priority Engine (urgent task ranked first)", async () => {
    mockListTasksForUser.mockResolvedValue([
      makeTask({ id: "distant", title: "Distant task", dueDate: new Date("2027-01-01T00:00:00Z") }),
      makeTask({ id: "urgent", title: "Urgent task", dueDate: new Date(NOW.getTime() + 2 * 60 * 60 * 1000) }),
    ]);

    const { context, rankedTasks } = await buildAcademicContext("user-1", NOW);

    expect(context.rankedTasks[0].title).toBe("Urgent task");
    expect(context.rankedTasks[0].priorityScore).toBeGreaterThan(context.rankedTasks[1].priorityScore);
    // The engine's native output is also exposed, for planAvailableTime.
    expect(rankedTasks[0].task.title).toBe("Urgent task");
    expect(rankedTasks[0].priority.score).toBe(context.rankedTasks[0].priorityScore);
  });

  it("carries the engine's reasons through unchanged, rather than inventing its own explanation", async () => {
    mockListTasksForUser.mockResolvedValue([makeTask({ dueDate: new Date("2020-01-01T00:00:00Z") })]);
    const { context } = await buildAcademicContext("user-1", NOW);
    expect(context.rankedTasks[0].isOverdue).toBe(true);
    expect(context.rankedTasks[0].priorityReasons).toContain("Already overdue");
  });

  it("never includes database ids or userId in the context sent to the AI", async () => {
    mockListTasksForUser.mockResolvedValue([makeTask()]);
    mockListSchedulesForUser.mockResolvedValue([makeSchedule()]);
    const { context } = await buildAcademicContext("user-1", NOW);

    expect(context.rankedTasks[0]).not.toHaveProperty("id");
    expect(context.rankedTasks[0]).not.toHaveProperty("userId");
    expect(context.rankedTasks[0]).not.toHaveProperty("courseId");
    expect(context.todaysClasses[0] ?? context.upcomingClasses[0]).not.toHaveProperty("id");
  });

  it("splits schedules into today vs. upcoming by ISO day of week", async () => {
    mockListSchedulesForUser.mockResolvedValue([
      makeSchedule({ id: "today", dayOfWeek: 1 }), // NOW is a Monday
      makeSchedule({ id: "later", dayOfWeek: 3 }),
    ]);
    const { context } = await buildAcademicContext("user-1", NOW);
    expect(context.todaysClasses).toHaveLength(1);
    expect(context.upcomingClasses).toHaveLength(1);
  });
});
