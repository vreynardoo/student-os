import { describe, expect, it } from "vitest";
import { computeDashboardData } from "./compute-dashboard-data";
import type { TaskWithCourse } from "@/lib/services/task-service";
import type { ScheduleWithCourse } from "@/lib/services/schedule-service";

const NOW = new Date("2026-06-15T12:00:00Z"); // a Monday

function makeTask(overrides: Partial<TaskWithCourse> = {}): TaskWithCourse {
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

function makeSchedule(overrides: Partial<ScheduleWithCourse> = {}): ScheduleWithCourse {
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

describe("computeDashboardData", () => {
  it("counts active tasks, excluding completed ones", () => {
    const tasks = [makeTask({ id: "a", status: "TODO" }), makeTask({ id: "b", status: "COMPLETED" })];
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.activeTasks.map((t) => t.id)).toEqual(["a"]);
  });

  it("counts overdue tasks correctly", () => {
    const tasks = [
      makeTask({ id: "overdue", dueDate: new Date("2026-06-10T00:00:00Z") }),
      makeTask({ id: "future", dueDate: new Date("2026-07-01T00:00:00Z") }),
      makeTask({ id: "overdue-but-done", status: "COMPLETED", dueDate: new Date("2026-06-01T00:00:00Z") }),
    ];
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.overdueTasks.map((t) => t.id)).toEqual(["overdue"]);
  });

  it("counts due-soon tasks (within the next 7 days), excluding overdue and far-future ones", () => {
    const tasks = [
      makeTask({ id: "overdue", dueDate: new Date("2026-06-10T00:00:00Z") }),
      makeTask({ id: "due-in-3-days", dueDate: new Date("2026-06-18T12:00:00Z") }),
      makeTask({ id: "due-in-exactly-7-days", dueDate: new Date("2026-06-22T12:00:00Z") }),
      makeTask({ id: "due-in-10-days", dueDate: new Date("2026-06-25T12:00:00Z") }),
    ];
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.dueSoonTasks.map((t) => t.id).sort()).toEqual(["due-in-3-days", "due-in-exactly-7-days"]);
  });

  it("computes overall progress as the average of active tasks' progress", () => {
    const tasks = [
      makeTask({ id: "a", progressPercent: 0 }),
      makeTask({ id: "b", progressPercent: 50 }),
      makeTask({ id: "c", status: "COMPLETED", progressPercent: 100 }),
    ];
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.overallProgress).toBe(25); // average of 0 and 50, completed task excluded
  });

  it("reports 0% overall progress when there are no active tasks", () => {
    const result = computeDashboardData([], [], NOW);
    expect(result.overallProgress).toBe(0);
  });

  it("ranks priority tasks using the real Priority Engine (urgent task ranked first)", () => {
    const urgent = makeTask({ id: "urgent", dueDate: new Date(NOW.getTime() + 2 * 60 * 60 * 1000) });
    const distant = makeTask({ id: "distant", dueDate: new Date("2027-01-01T00:00:00Z") });
    const result = computeDashboardData([distant, urgent], [], NOW);

    expect(result.topPriorityTasks[0].task.id).toBe("urgent");
    expect(result.topPriorityTasks[0].priority.score).toBeGreaterThan(result.topPriorityTasks[1].priority.score);
  });

  it("excludes completed tasks from priority ranking entirely", () => {
    const tasks = [makeTask({ id: "done", status: "COMPLETED" }), makeTask({ id: "todo" })];
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.topPriorityTasks.map((r) => r.task.id)).toEqual(["todo"]);
  });

  it("limits priority tasks and upcoming tasks to 5", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ id: `task-${i}`, dueDate: new Date(NOW.getTime() + (i + 1) * 24 * 60 * 60 * 1000) }),
    );
    const result = computeDashboardData(tasks, [], NOW);
    expect(result.topPriorityTasks).toHaveLength(5);
    expect(result.upcomingTasks).toHaveLength(5);
  });

  it("orders upcoming tasks by nearest due date", () => {
    const tasks = [
      makeTask({ id: "later", dueDate: new Date("2026-07-01T00:00:00Z") }),
      makeTask({ id: "sooner", dueDate: new Date("2026-06-18T00:00:00Z") }),
    ];
    // Simulating listTasksForUser's own dueDate-ascending order, which the
    // function relies on rather than re-sorting itself.
    const sorted = [...tasks].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const result = computeDashboardData(sorted, [], NOW);
    expect(result.upcomingTasks.map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("shows an empty priority/upcoming list when there are no tasks", () => {
    const result = computeDashboardData([], [], NOW);
    expect(result.topPriorityTasks).toEqual([]);
    expect(result.upcomingTasks).toEqual([]);
  });

  it("filters today's schedule to the current ISO day of week", () => {
    const schedules = [
      makeSchedule({ id: "monday-class", dayOfWeek: 1 }),
      makeSchedule({ id: "tuesday-class", dayOfWeek: 2 }),
    ];
    // NOW is a Monday (ISO day 1).
    const result = computeDashboardData([], schedules, NOW);
    expect(result.todaysSchedule.map((s) => s.id)).toEqual(["monday-class"]);
  });

  it("maps Sunday (Date#getDay()=0) to ISO day 7", () => {
    const sunday = new Date("2026-06-21T12:00:00Z");
    const schedules = [makeSchedule({ id: "sunday-class", dayOfWeek: 7 })];
    const result = computeDashboardData([], schedules, sunday);
    expect(result.todaysSchedule.map((s) => s.id)).toEqual(["sunday-class"]);
  });

  it("shows an empty schedule when there are no classes today", () => {
    const schedules = [makeSchedule({ dayOfWeek: 2 })]; // Tuesday, NOW is Monday
    const result = computeDashboardData([], schedules, NOW);
    expect(result.todaysSchedule).toEqual([]);
  });
});
