import {
  DEFAULT_ESTIMATED_HOURS,
  PACE_PRESSURE_CEILING,
  PACE_PRESSURE_WEIGHT,
  PRIORITY_LEVEL_THRESHOLDS,
  REASON_DUE_SOON_HOURS,
  REASON_DUE_VERY_SOON_HOURS,
  REASON_HIGH_WEIGHT_THRESHOLD,
  REASON_LARGE_REMAINING_HOURS,
  URGENCY_TAU_HOURS,
  URGENCY_WEIGHT,
  WEIGHT_MULTIPLIER_MAX,
  WEIGHT_MULTIPLIER_MIN,
} from "./constants";
import type { PriorityInputTask, PriorityLevel, PriorityResult, RankedTask } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function levelForScore(score: number): PriorityLevel {
  if (score >= PRIORITY_LEVEL_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= PRIORITY_LEVEL_THRESHOLDS.HIGH) return "HIGH";
  if (score >= PRIORITY_LEVEL_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/**
 * Deterministic, pure priority scoring for a single task. `now` is always an
 * explicit input (never read from the system clock internally) so results are
 * reproducible and testable. This module never touches the database — it only
 * ever sees the plain PriorityInputTask shape the caller constructs.
 */
export function calculatePriority(task: PriorityInputTask, now: Date = new Date()): PriorityResult {
  const dueInHours = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Completed tasks are handled explicitly and short-circuit: there is no
  // "remaining work" or urgency math that makes sense for finished work, and
  // a score of 0 naturally sorts them to the bottom of any ranking.
  if (task.status === "COMPLETED") {
    return {
      taskId: task.id,
      score: 0,
      level: "LOW",
      reasons: ["Already completed"],
      breakdown: {
        dueInHours,
        remainingHours: 0,
        urgency: 0,
        pacePressure: 0,
        weightMultiplier: 1,
        usedDefaultEstimate: false,
        isOverdue: false,
      },
    };
  }

  const isOverdue = dueInHours <= 0;

  const usedDefaultEstimate = task.estimatedHours == null;
  const estimatedHours = task.estimatedHours ?? DEFAULT_ESTIMATED_HOURS;
  const progressFraction = clamp01(task.progressPercent / 100);
  const remainingHours = Math.max(0, estimatedHours * (1 - progressFraction));

  // exp(-dueInHours / tau): for an overdue task dueInHours is negative, which
  // would make the exponent positive and let urgency grow unbounded (even
  // toward Infinity) the longer something has been overdue. Overdue is
  // instead capped at maximum urgency, regardless of degree of lateness.
  const urgency = isOverdue ? 1 : Math.exp(-dueInHours / URGENCY_TAU_HOURS);

  // remainingHours / max(dueInHours, 1) is unbounded above (e.g. 20 hours of
  // work due in 1 hour). Needing to spend all remaining time working, with no
  // slack at all, is already "as pressured as it gets" — clamped so one
  // extreme task can't blow the combined score past its intended [0,1] range.
  const rawPacePressure = remainingHours / Math.max(dueInHours, 1);
  const pacePressure = clamp01(rawPacePressure / PACE_PRESSURE_CEILING);

  // Weight is a modest multiplier, not a dominant term — a heavily-weighted
  // task due in a month still can't bury a trivial task due in an hour.
  const weightMultiplier = clamp(task.weight, WEIGHT_MULTIPLIER_MIN, WEIGHT_MULTIPLIER_MAX);

  const combined = clamp01(URGENCY_WEIGHT * urgency + PACE_PRESSURE_WEIGHT * pacePressure);
  const score = Math.round(clamp01(combined * weightMultiplier) * 100);

  const reasons: string[] = [];
  if (isOverdue) {
    reasons.push("Already overdue");
  } else if (dueInHours <= REASON_DUE_VERY_SOON_HOURS) {
    reasons.push("Due very soon");
  } else if (dueInHours <= REASON_DUE_SOON_HOURS) {
    reasons.push("Due soon");
  }
  if (remainingHours >= REASON_LARGE_REMAINING_HOURS) {
    reasons.push("Large amount of work remaining");
  }
  if (task.weight >= REASON_HIGH_WEIGHT_THRESHOLD) {
    reasons.push("High course weight");
  }
  if (usedDefaultEstimate) {
    reasons.push("No time estimate provided — using a default estimate");
  }
  if (reasons.length === 0) {
    reasons.push("No immediate pressure");
  }

  return {
    taskId: task.id,
    score,
    level: levelForScore(score),
    reasons,
    breakdown: {
      dueInHours,
      remainingHours,
      urgency,
      pacePressure,
      weightMultiplier,
      usedDefaultEstimate,
      isOverdue,
    },
  };
}

/**
 * Ranks tasks highest-priority first. Ties break, in order, on: earlier
 * deadline, higher weight, more remaining work, then task id — so ordering
 * never changes without an underlying data change (never random).
 */
export function rankTasks(tasks: PriorityInputTask[], now: Date = new Date()): RankedTask[] {
  const ranked: RankedTask[] = tasks.map((task) => ({ task, priority: calculatePriority(task, now) }));

  return ranked.sort((a, b) => {
    if (b.priority.score !== a.priority.score) return b.priority.score - a.priority.score;
    if (a.task.dueDate.getTime() !== b.task.dueDate.getTime()) {
      return a.task.dueDate.getTime() - b.task.dueDate.getTime();
    }
    if (b.task.weight !== a.task.weight) return b.task.weight - a.task.weight;
    if (b.priority.breakdown.remainingHours !== a.priority.breakdown.remainingHours) {
      return b.priority.breakdown.remainingHours - a.priority.breakdown.remainingHours;
    }
    return a.task.id.localeCompare(b.task.id);
  });
}
