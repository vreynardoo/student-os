import { describe, expect, it } from "vitest";
import { calculatePriority, rankTasks } from "./priority-engine";
import type { PriorityInputTask } from "./types";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeTask(overrides: Partial<PriorityInputTask> = {}): PriorityInputTask {
  return {
    id: "task-1",
    title: "Sample task",
    dueDate: new Date("2026-01-03T00:00:00Z"),
    estimatedHours: 4,
    progressPercent: 0,
    weight: 1,
    status: "TODO",
    ...overrides,
  };
}

describe("calculatePriority", () => {
  it("scores a task due soon higher than an otherwise-identical task due far in the future", () => {
    const soon = calculatePriority(makeTask({ id: "soon", dueDate: new Date("2026-01-01T06:00:00Z") }), NOW);
    const distant = calculatePriority(makeTask({ id: "distant", dueDate: new Date("2026-03-01T00:00:00Z") }), NOW);
    expect(soon.score).toBeGreaterThan(distant.score);
  });

  it("caps urgency at 1 for an overdue task instead of letting it grow unbounded", () => {
    const slightlyOverdue = calculatePriority(makeTask({ id: "a", dueDate: new Date("2025-12-31T23:00:00Z") }), NOW);
    const veryOverdue = calculatePriority(makeTask({ id: "b", dueDate: new Date("2020-01-01T00:00:00Z") }), NOW);

    expect(slightlyOverdue.breakdown.urgency).toBe(1);
    expect(veryOverdue.breakdown.urgency).toBe(1);
    expect(Number.isFinite(veryOverdue.score)).toBe(true);
    expect(veryOverdue.score).toBeLessThanOrEqual(100);
    expect(veryOverdue.breakdown.isOverdue).toBe(true);
    expect(veryOverdue.reasons).toContain("Already overdue");
  });

  it("gives a completed task a score of 0 and a clear reason, regardless of deadline", () => {
    const result = calculatePriority(makeTask({ status: "COMPLETED", dueDate: new Date("2025-01-01T00:00:00Z") }), NOW);
    expect(result.score).toBe(0);
    expect(result.level).toBe("LOW");
    expect(result.reasons).toEqual(["Already completed"]);
  });

  it("reduces remaining work as progress increases, lowering pace pressure", () => {
    const noProgress = calculatePriority(makeTask({ id: "a", progressPercent: 0 }), NOW);
    const halfProgress = calculatePriority(makeTask({ id: "b", progressPercent: 50 }), NOW);
    const done = calculatePriority(makeTask({ id: "c", progressPercent: 100 }), NOW);

    expect(halfProgress.breakdown.remainingHours).toBeLessThan(noProgress.breakdown.remainingHours);
    expect(done.breakdown.remainingHours).toBe(0);
    expect(halfProgress.breakdown.pacePressure).toBeLessThanOrEqual(noProgress.breakdown.pacePressure);
  });

  it("increases pace pressure when more work remains for the same deadline", () => {
    const lightWork = calculatePriority(makeTask({ id: "a", estimatedHours: 1 }), NOW);
    const heavyWork = calculatePriority(makeTask({ id: "b", estimatedHours: 20 }), NOW);
    expect(heavyWork.breakdown.pacePressure).toBeGreaterThan(lightWork.breakdown.pacePressure);
  });

  it("lets weight nudge the score only modestly, never dominating it", () => {
    const neutral = calculatePriority(makeTask({ id: "a", weight: 1 }), NOW);
    const heavy = calculatePriority(makeTask({ id: "b", weight: 100 }), NOW);
    expect(heavy.score).toBeGreaterThanOrEqual(neutral.score);
    expect(heavy.score).toBeLessThanOrEqual(Math.round(neutral.score * 1.3) + 1);
  });

  it("falls back to a default estimate when estimatedHours is missing, without producing NaN", () => {
    const result = calculatePriority(makeTask({ estimatedHours: null }), NOW);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.breakdown.usedDefaultEstimate).toBe(true);
    expect(result.reasons).toContain("No time estimate provided — using a default estimate");
  });

  it("never produces NaN or Infinity across a range of extreme inputs", () => {
    const extremeCases = [
      makeTask({ dueDate: new Date("1970-01-01T00:00:00Z") }),
      makeTask({ dueDate: new Date("2100-01-01T00:00:00Z") }),
      makeTask({ estimatedHours: 0.001 }),
      makeTask({ estimatedHours: 10000 }),
      makeTask({ progressPercent: 100, status: "COMPLETED" }),
      makeTask({ weight: 0 }),
      makeTask({ weight: 9999 }),
    ];

    for (const task of extremeCases) {
      const result = calculatePriority(task, NOW);
      expect(Number.isFinite(result.score)).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.breakdown.urgency)).toBe(true);
      expect(Number.isFinite(result.breakdown.pacePressure)).toBe(true);
    }
  });

  it("is deterministic for the same input and reference time", () => {
    const task = makeTask();
    expect(calculatePriority(task, NOW)).toEqual(calculatePriority(task, NOW));
  });
});

describe("rankTasks", () => {
  it("orders tasks by score, highest first", () => {
    const urgent = makeTask({ id: "urgent", dueDate: new Date("2026-01-01T02:00:00Z") });
    const distant = makeTask({ id: "distant", dueDate: new Date("2026-06-01T00:00:00Z") });
    const ranked = rankTasks([distant, urgent], NOW);
    expect(ranked.map((r) => r.task.id)).toEqual(["urgent", "distant"]);
  });

  it("breaks ties deterministically by id when every other factor is equal", () => {
    const a = makeTask({ id: "b-task" });
    const b = makeTask({ id: "a-task" });

    const first = rankTasks([a, b], NOW).map((r) => r.task.id);
    const second = rankTasks([b, a], NOW).map((r) => r.task.id);

    expect(first).toEqual(second);
    expect(first).toEqual(["a-task", "b-task"]);
  });

  it("never reorders across repeated calls on the same input", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: new Date("2026-01-02T00:00:00Z") }),
      makeTask({ id: "2", dueDate: new Date("2026-01-01T12:00:00Z") }),
      makeTask({ id: "3", dueDate: new Date("2026-02-01T00:00:00Z") }),
    ];
    const first = rankTasks(tasks, NOW).map((r) => r.task.id);
    const second = rankTasks(tasks, NOW).map((r) => r.task.id);
    expect(second).toEqual(first);
  });
});
