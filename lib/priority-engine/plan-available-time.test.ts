import { describe, expect, it } from "vitest";
import { rankTasks } from "./priority-engine";
import { planAvailableTime } from "./plan-available-time";
import type { PriorityInputTask } from "./types";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeTask(overrides: Partial<PriorityInputTask> = {}): PriorityInputTask {
  return {
    id: "task-1",
    title: "Sample task",
    dueDate: new Date("2026-01-03T00:00:00Z"),
    estimatedHours: 2,
    progressPercent: 0,
    weight: 1,
    status: "TODO",
    ...overrides,
  };
}

describe("planAvailableTime", () => {
  it("fits all tasks when there is enough available time", () => {
    const tasks = [makeTask({ id: "a", estimatedHours: 1 }), makeTask({ id: "b", estimatedHours: 1 })];
    const plan = planAvailableTime(rankTasks(tasks, NOW), 5);

    expect(plan.insufficientTime).toBe(false);
    expect(plan.items).toHaveLength(2);
    expect(plan.items.every((item) => !item.isPartial)).toBe(true);
    expect(plan.usedHours).toBe(2);
    expect(plan.unusedHours).toBe(3);
  });

  it("partially allocates and flags insufficient time when work exceeds available hours", () => {
    const tasks = [makeTask({ id: "a", estimatedHours: 5 })];
    const plan = planAvailableTime(rankTasks(tasks, NOW), 2);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].isPartial).toBe(true);
    expect(plan.items[0].allocatedHours).toBe(2);
    expect(plan.insufficientTime).toBe(true);
    expect(plan.unusedHours).toBe(0);
  });

  it("prioritizes higher-ranked tasks, leaving lower-ranked ones unallocated when time runs out", () => {
    const urgent = makeTask({ id: "urgent", dueDate: new Date("2026-01-01T02:00:00Z"), estimatedHours: 2 });
    const distant = makeTask({ id: "distant", dueDate: new Date("2026-06-01T00:00:00Z"), estimatedHours: 2 });
    const plan = planAvailableTime(rankTasks([distant, urgent], NOW), 2);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].task.id).toBe("urgent");
    expect(plan.insufficientTime).toBe(true);
  });

  it("returns an empty plan for an empty task list", () => {
    const plan = planAvailableTime([], 3);
    expect(plan).toEqual({ items: [], usedHours: 0, unusedHours: 3, insufficientTime: false });
  });

  it("handles zero available time without allocating anything", () => {
    const tasks = [makeTask({ estimatedHours: 1 })];
    const plan = planAvailableTime(rankTasks(tasks, NOW), 0);
    expect(plan.items).toEqual([]);
    expect(plan.insufficientTime).toBe(true);
  });

  it("treats negative, NaN, or infinite available time as invalid, not as unlimited", () => {
    const tasks = [makeTask({ estimatedHours: 1 })];
    expect(planAvailableTime(rankTasks(tasks, NOW), -5).items).toEqual([]);
    expect(planAvailableTime(rankTasks(tasks, NOW), NaN).items).toEqual([]);
    expect(planAvailableTime(rankTasks(tasks, NOW), Infinity).insufficientTime).toBe(true);
  });

  it("skips completed tasks (no remaining work) even if present in the ranked list", () => {
    const completed = makeTask({ id: "done", status: "COMPLETED" });
    const todo = makeTask({ id: "todo", estimatedHours: 1 });
    const plan = planAvailableTime(rankTasks([completed, todo], NOW), 5);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].task.id).toBe("todo");
  });
});
