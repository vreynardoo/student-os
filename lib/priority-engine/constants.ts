// Tunable heuristic constants for the Priority Engine. None of these are
// claimed to be objectively optimal — they're a documented starting point,
// meant to be adjusted against real usage/feedback, not re-derived from theory.

// Urgency decay: urgency = exp(-dueInHours / tau). Chosen so urgency is ~0.5
// around the 1-2 day mark (tau=48h -> exp(-48/48)=0.37), ramping up sharply as
// a deadline approaches while staying low for anything weeks out.
export const URGENCY_TAU_HOURS = 48;

// Weighted sum: score = clamp01(URGENCY_WEIGHT*urgency + PACE_PRESSURE_WEIGHT*pacePressure).
export const URGENCY_WEIGHT = 0.6;
export const PACE_PRESSURE_WEIGHT = 0.4;

// Pace pressure (remainingHours / max(dueInHours, 1)) is unbounded above — a
// task needing more work-hours than hours-until-due can produce values far
// above 1. Needing to spend *all* remaining time working, back to back, is
// already "as pressured as it gets", so pace pressure is clamped to this
// ceiling before being weighted in.
export const PACE_PRESSURE_CEILING = 1;

// Used when a task has no estimatedHours, so "remaining work" is never NaN.
export const DEFAULT_ESTIMATED_HOURS = 2;

// Task weight acts as a modest multiplier, not a dominant term, so a
// high-weight task due in a month can't bury a trivial task due in an hour.
export const WEIGHT_MULTIPLIER_MIN = 0.8;
export const WEIGHT_MULTIPLIER_MAX = 1.3;

// Score (0-100) cutoffs for the human-readable priority level. Deliberately
// plain constants, not derived from any statistical model, so they're easy
// to retune later without touching the scoring logic.
export const PRIORITY_LEVEL_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 35,
} as const;

// Thresholds purely for generating human-readable `reasons` — they don't
// affect the score itself.
export const REASON_OVERDUE_HOURS = 0;
export const REASON_DUE_VERY_SOON_HOURS = 6;
export const REASON_DUE_SOON_HOURS = 24;
export const REASON_LARGE_REMAINING_HOURS = 5;
export const REASON_HIGH_WEIGHT_THRESHOLD = 1.15;
