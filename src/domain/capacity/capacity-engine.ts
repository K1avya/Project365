import type { Commitment } from "../types";

export interface TaskDurationItem {
  id?: string;
  title?: string;
  durationMinutes: number;
}

export interface EventPauseWindow {
  title: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
}

export interface CalculateDailyCapacityParams {
  dayStartMinute?: number;          // e.g. 360 (06:00 AM)
  dayCutoffMinute?: number;         // e.g. 60 (01:00 AM logical end)
  dailySleepHours?: number;         // e.g. 7.0
  commitments: Commitment[];        // Active commitments (College, Bus, Dinner, etc.)
  plannedTasks: TaskDurationItem[]; // Tasks planned for this day
  eventPauseWindows?: EventPauseWindow[]; // Active pauses (Hackathons, festivals)
  forcePlanAnyway?: boolean;        // Explicit user override
  allowOverride?: boolean;          // Alias for forcePlanAnyway
  activeProfile?: "REGULAR" | "EXAM_PREP" | "HACKATHON" | "PLACEMENT" | "VACATION";
}

export interface CapacityReport {
  grossMinutes: number;
  commitmentMinutes: number;
  discretionaryMinutes: number;
  plannedMinutes: number;
  overloadMinutes: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  forcedOverride: boolean;
  warningMessage?: string;
}

export class CapacityOverloadError extends Error {
  constructor(
    public readonly plannedMinutes: number,
    public readonly discretionaryMinutes: number,
    public readonly overloadMinutes: number
  ) {
    const plannedH = (plannedMinutes / 60).toFixed(1);
    const discH = (discretionaryMinutes / 60).toFixed(1);
    const overH = (overloadMinutes / 60).toFixed(1);

    super(
      `[CAPACITY GATE BLOCKED] Planned time (${plannedH}h / ${plannedMinutes}m) exceeds Discretionary Capacity (${discH}h / ${discretionaryMinutes}m) by ${overH}h (${overloadMinutes}m). Schedule is mathematically impossible.`
    );
    this.name = "CapacityOverloadError";
  }
}

export class CapacityEngine {
  /**
   * Evaluates the reality gate of a day:
   * Discretionary = Gross - Sleep - Commitments - PauseWindows
   * Enforces: plannedMinutes <= discretionaryMinutes (BLOCK SAVE by default)
   */
  evaluateCapacity(params: CalculateDailyCapacityParams): CapacityReport {
    const startMin = params.dayStartMinute ?? 360;   // 06:00 AM
    const cutoffMin = params.dayCutoffMinute ?? 60;  // 01:00 AM
    let sleepHours = params.dailySleepHours ?? 7.0;
    const profile = params.activeProfile ?? "REGULAR";

    // Removed: Active Profile rules to sleep (Capacity should reflect reality)
    // Gross waking window
    let grossMinutes = 0;
    if (cutoffMin <= startMin) {
      grossMinutes = (1440 - startMin) + cutoffMin;
    } else {
      grossMinutes = cutoffMin - startMin;
    }

    const sleepMinutes = Math.round(sleepHours * 60);

    // Sum active commitments
    const commitmentMinutes = params.commitments
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + c.durationMinutes, 0);

    // Sum event pauses (e.g. workshop, hackathon freeze)
    const pauseWindowMinutes = (params.eventPauseWindows || []).reduce(
      (sum, p) => sum + p.durationMinutes,
      0
    );

    // Sleep deficit from outside waking window
    const unallocatedNightMinutes = 1440 - grossMinutes;
    const extraSleepFromWaking = Math.max(0, sleepMinutes - unallocatedNightMinutes);

    const discretionaryMinutes = Math.max(
      0,
      grossMinutes - extraSleepFromWaking - commitmentMinutes - pauseWindowMinutes
    );

    const plannedMinutes = params.plannedTasks.reduce(
      (sum, t) => sum + t.durationMinutes,
      0
    );

    const isOverloaded = plannedMinutes > discretionaryMinutes;
    const overloadMinutes = isOverloaded ? plannedMinutes - discretionaryMinutes : 0;

    const utilizationPercent =
      discretionaryMinutes > 0
        ? Math.round((plannedMinutes / discretionaryMinutes) * 100)
        : plannedMinutes > 0
        ? 999
        : 0;

    let warningMessage: string | undefined;
    if (isOverloaded) {
      warningMessage = `WARNING: Overloaded by ${overloadMinutes} min (${(overloadMinutes / 60).toFixed(1)}h). Planned: ${(plannedMinutes / 60).toFixed(1)}h, Max Discretionary: ${(discretionaryMinutes / 60).toFixed(1)}h.`;
    }

    let override = Boolean(params.forcePlanAnyway ?? params.allowOverride);

    // Apply Active Profile rules to overload gatekeeper
    if (profile === "HACKATHON") {
      override = true; // Hackathons implicitly allow overloaded schedules
    } else if (profile === "VACATION") {
      override = false; // Vacations strictly enforce the capacity limit
    }

    const report: CapacityReport = {
      grossMinutes,
      commitmentMinutes,
      discretionaryMinutes,
      plannedMinutes,
      overloadMinutes,
      utilizationPercent,
      isOverloaded,
      forcedOverride: Boolean(isOverloaded && override),
      warningMessage,
    };

    // CRITICAL REALITY GATE: plannedMinutes <= discretionaryMinutes
    if (isOverloaded && !override) {
      throw new CapacityOverloadError(
        plannedMinutes,
        discretionaryMinutes,
        overloadMinutes
      );
    }

    if (report.forcedOverride) {
      console.warn(`[CAPACITY OVERRIDE LOGGED] User forcefully saved overloaded schedule: ${warningMessage}`);
    }

    return report;
  }

  calculateDailyCapacity(params: CalculateDailyCapacityParams) {
    const report = this.evaluateCapacity({
      ...params,
      forcePlanAnyway: params.forcePlanAnyway ?? params.allowOverride,
    });

    return {
      wakingWindowMinutes: report.grossMinutes,
      sleepMinutes: Math.round((params.dailySleepHours ?? 7) * 60),
      committedMinutes: report.commitmentMinutes,
      netAvailableMinutes: report.discretionaryMinutes,
      netAvailableHours: Number((report.discretionaryMinutes / 60).toFixed(2)),
      plannedMinutes: report.plannedMinutes,
      plannedHours: Number((report.plannedMinutes / 60).toFixed(2)),
      bufferMinutes: !report.isOverloaded ? report.discretionaryMinutes - report.plannedMinutes : 0,
      bufferHours: !report.isOverloaded
        ? Number(((report.discretionaryMinutes - report.plannedMinutes) / 60).toFixed(2))
        : 0,
      isOverloaded: report.isOverloaded,
      overloadMinutes: report.overloadMinutes,
      overloadHours: Number((report.overloadMinutes / 60).toFixed(2)),
      capacityUtilization: report.utilizationPercent,
    };
  }

  calculateWeeklySummary(days: Array<{ netAvailableHours: number; plannedHours: number; committedMinutes: number }>) {
    const netAvailableHours = days.reduce((sum, d) => sum + d.netAvailableHours, 0);
    const plannedHours = days.reduce((sum, d) => sum + d.plannedHours, 0);
    const committedHours = days.reduce((sum, d) => sum + d.committedMinutes / 60, 0);
    const isOverloaded = plannedHours > netAvailableHours;
    const overloadHours = Math.max(0, plannedHours - netAvailableHours);

    return {
      netAvailableHours: Number(netAvailableHours.toFixed(1)),
      plannedHours: Number(plannedHours.toFixed(1)),
      committedHours: Number(committedHours.toFixed(1)),
      isOverloaded,
      overloadHours: Number(overloadHours.toFixed(1)),
      weeklyUtilization: netAvailableHours > 0 ? Math.round((plannedHours / netAvailableHours) * 100) : 0,
    };
  }
}