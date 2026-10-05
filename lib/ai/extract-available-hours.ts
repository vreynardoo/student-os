// Best-effort, regex-based extraction of a stated number of available hours
// (e.g. "I have 3 hours tonight") — deliberately not full NLU. Misses phrasing
// like "a couple hours" or "180 minutes"; that's an accepted limitation for
// this MVP rather than building a parsing system for it.
const HOURS_PATTERN = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i;

export function extractAvailableHours(message: string): number | null {
  const match = message.match(HOURS_PATTERN);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  return value;
}
