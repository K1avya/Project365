/**
 * Project365 Time Engine - Integer Minute Utilities
 * All daily times are stored as minutes from midnight: 0 <= m < 1440
 */

export const MINUTES_IN_DAY = 1440;

/**
 * Converts a 24-hour time string ("HH:mm") into minutes from midnight (0..1439).
 * Throws an Error if the input is malformed or out of range.
 */
export function timeToMinute(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") {
    throw new Error(`Invalid time string: "${timeStr}". Expected format "HH:mm".`);
  }

  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "HH:mm".`);
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error(`Time components must be integers: "${timeStr}".`);
  }

  if (hours < 0 || hours > 23) {
    throw new Error(`Hours must be between 0 and 23. Received: ${hours}.`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new Error(`Minutes must be between 0 and 59. Received: ${minutes}.`);
  }

  return hours * 60 + minutes;
}

/**
 * Converts integer minutes from midnight into zero-padded "HH:mm".
 */
export function minuteToTime(minutes: number): string {
  if (!Number.isInteger(minutes)) {
    throw new Error(`Minutes must be an integer. Received: ${minutes}.`);
  }

  // Normalize positive modulo
  const normalized = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates the exact duration in minutes between two times.
 * Correctly accounts for intervals that cross midnight (e.g. 23:30 to 01:00 = 90 min).
 */
export function calculateDuration(startMinute: number, endMinute: number): number {
  if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)) {
    throw new Error("Start and end minutes must be integers.");
  }

  const s = ((startMinute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const e = ((endMinute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  if (e >= s) {
    return e - s;
  }
  return (e + MINUTES_IN_DAY) - s;
}

/**
 * Normalizes an interval [start, end) into 1 or 2 standard intervals
 * to accurately handle cross-midnight intervals.
 */
function normalizeInterval(start: number, end: number): Array<[number, number]> {
  const s = ((start % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const e = ((end % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  if (s === e) return []; // 0-duration interval does not occupy time
  if (e > s) return [[s, e]];
  // Crosses midnight: split into [s, 1440) and [0, e)
  return [[s, MINUTES_IN_DAY], [0, e]];
}

/**
 * Validates whether interval A [aStart, aEnd) overlaps with interval B [bStart, bEnd).
 * Supports both same-day and cross-midnight intervals.
 */
export function isOverlapping(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  const aSegments = normalizeInterval(aStart, aEnd);
  const bSegments = normalizeInterval(bStart, bEnd);

  for (const [a1, a2] of aSegments) {
    for (const [b1, b2] of bSegments) {
      if (a1 < b2 && b1 < a2) {
        return true;
      }
    }
  }
  return false;
}
