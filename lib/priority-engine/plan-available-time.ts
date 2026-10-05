import type { PriorityInputTask, RankedTask } from "./types";

export interface PlannedItem {
  task: PriorityInputTask;
  allocatedHours: number;
  // true when this task's remaining work doesn't fully fit — the plan only
  // covers `allocatedHours` worth of it, not the whole task.
  isPartial: boolean;
}

export interface AvailableTimePlan {
  items: PlannedItem[];
  usedHours: number;
  unusedHours: number;
  // true if any ranked task with remaining work didn't fully fit (partially
  // allocated, or not reached at all before time ran out).
  insufficientTime: boolean;
}

/**
 * Greedily fits already-ranked tasks into a stated block of available time,
 * highest priority first. Pure and deterministic: no randomness, no clock
 * access, no I/O. Does not invent partial progress — a task that doesn't
 * fully fit is explicitly marked `isPartial` with the hours it was actually
 * allocated, rather than silently rounding it off as done.
 */
export function planAvailableTime(rankedTasks: RankedTask[], availableHours: number): AvailableTimePlan {
  if (!Number.isFinite(availableHours) || availableHours <= 0) {
    const anyWorkRemaining = rankedTasks.some((ranked) => ranked.priority.breakdown.remainingHours > 0);
    return { items: [], usedHours: 0, unusedHours: 0, insufficientTime: anyWorkRemaining };
  }

  let hoursLeft = availableHours;
  const items: PlannedItem[] = [];

  for (const ranked of rankedTasks) {
    if (hoursLeft <= 0) break;

    const needed = ranked.priority.breakdown.remainingHours;
    if (needed <= 0) continue;

    const allocated = Math.min(needed, hoursLeft);
    items.push({ task: ranked.task, allocatedHours: allocated, isPartial: allocated < needed });
    hoursLeft -= allocated;
  }

  const plannedIds = new Set(items.map((item) => item.task.id));
  const skippedTaskWithWork = rankedTasks.some(
    (ranked) => ranked.priority.breakdown.remainingHours > 0 && !plannedIds.has(ranked.task.id),
  );
  const insufficientTime = items.some((item) => item.isPartial) || skippedTaskWithWork;

  return {
    items,
    usedHours: availableHours - hoursLeft,
    unusedHours: Math.max(0, hoursLeft),
    insufficientTime,
  };
}
