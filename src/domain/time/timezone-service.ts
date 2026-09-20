/**
 * Project365 Timezone & Logical Day Boundary Engine
 * 
 * Enforces consistent calendar day normalization across all tiers.
 * Accounts for:
 * 1. User IANA timezone (e.g. 'Asia/Kolkata', 'America/Los_Angeles', 'UTC')
 * 2. User logical day cutoff hour (e.g. 01:00 AM)
 *    - Hours < cutoffHour belong to the PREVIOUS logical day.
 * 3. PostgreSQL @db.Date representation (stored as canonical UTC midnight: YYYY-MM-DDT00:00:00.000Z).
 */

export class TimezoneService {
  /**
   * Resolves the logical calendar date for a given instant.
   * If local time in the specified timezone is before cutoffHour (e.g., 00:30 when cutoff is 1),
   * the date is normalized to the previous calendar day.
   */
  static toLogicalCalendarDate(
    instant: Date | string | number = new Date(),
    cutoffHour: number = 1,
    timeZone: string = "UTC"
  ): Date {
    const d = instant instanceof Date ? instant : new Date(instant);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid instant: "${instant}"`);
    }

    // Extract wall-clock components in the target timezone
    const parts = this.extractZonedParts(d, timeZone);
    let { year, month, day, hour } = parts;

    // If local hour is before the logical cutoff, subtract 1 calendar day
    if (hour < cutoffHour) {
      const prevDate = new Date(Date.UTC(year, month - 1, day - 1, 0, 0, 0, 0));
      year = prevDate.getUTCFullYear();
      month = prevDate.getUTCMonth() + 1;
      day = prevDate.getUTCDate();
    }

    // Always return canonical UTC midnight date for @db.Date
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  /**
   * Formats the logical date as "YYYY-MM-DD".
   */
  static toLogicalDateString(
    instant: Date | string | number = new Date(),
    cutoffHour: number = 1,
    timeZone: string = "UTC"
  ): string {
    const date = this.toLogicalCalendarDate(instant, cutoffHour, timeZone);
    return date.toISOString().slice(0, 10);
  }

  /**
   * Parses a calendar date string ("YYYY-MM-DD") into a canonical UTC midnight Date.
   */
  static parseCalendarDate(dateStr: string): Date {
    if (!dateStr || typeof dateStr !== "string") {
      throw new Error(`Invalid date string: "${dateStr}". Expected "YYYY-MM-DD".`);
    }

    const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error(`Date string "${dateStr}" must match format "YYYY-MM-DD".`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12) {
      throw new Error(`Month must be between 01 and 12. Received: ${month}.`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Day must be between 01 and 31. Received: ${day}.`);
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  /**
   * Determines if a given date is strictly in the past relative to the reference logical date.
   */
  static isHistoricalDate(
    targetDate: Date,
    referenceDate: Date = this.toLogicalCalendarDate()
  ): boolean {
    const t = targetDate.getTime();
    const r = referenceDate.getTime();
    return t < r;
  }

  /**
   * Helper: Extracts zoned components using standard Intl.DateTimeFormat
   */
  private static extractZonedParts(
    date: Date,
    timeZone: string
  ): { year: number; month: number; day: number; hour: number; minute: number } {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      });

      const parts = formatter.formatToParts(date);
      let year = 1970;
      let month = 1;
      let day = 1;
      let hour = 0;
      let minute = 0;

      for (const part of parts) {
        if (part.type === "year") year = Number(part.value);
        if (part.type === "month") month = Number(part.value);
        if (part.type === "day") day = Number(part.value);
        if (part.type === "hour") hour = Number(part.value);
        if (part.type === "minute") minute = Number(part.value);
      }

      return { year, month, day, hour, minute };
    } catch {
      // Fallback to UTC if timezone is unrecognized
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
      };
    }
  }
}
