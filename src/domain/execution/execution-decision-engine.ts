import type { EnergyLevel, LifeAreaType, Priority } from "../types";

export type ActiveProfile =
  | "REGULAR"
  | "EXAM_PREP"
  | "HACKATHON"
  | "PLACEMENT"
  | "VACATION";

export type ExecutionEnvironment = "HOME" | "COLLEGE" | "COMMUTE" | "LIBRARY";
export type ExecutionDevice = "MOBILE" | "LAPTOP";
export type Connectivity = "ONLINE" | "OFFLINE";

export interface ExecutionContext {
  environment: ExecutionEnvironment;
  device: ExecutionDevice;
  availableMinutes: number;
  energy: EnergyLevel;
  connectivity: Connectivity;
  activeProfile: ActiveProfile;
  /** Logical calendar date for due/overdue scoring (YYYY-MM-DD). */
  todayDateKey: string;
}

export type ExecutionCandidateSource = "task_instance" | "backlog" | "schedule";

export interface ExecutionCandidate {
  id: string;
  title: string;
  source: ExecutionCandidateSource;
  priority: Priority;
  energyRequired: EnergyLevel;
  durationMinutes: number;
  isDeepWork: boolean;
  isBlocked: boolean;
  /** Tags used for profile alignment (e.g. leetcode, startup, college). */
  objectiveTags: string[];
  lifeAreaType?: LifeAreaType;
  carryCount?: number;
  sourceDateKey?: string;
  unlocksCount?: number;
  dbInstanceId?: string;
}

export type ContextFit = "excellent" | "good" | "poor" | "blocked";

export interface ScoredRecommendation {
  candidate: ExecutionCandidate;
  score: number;
  contextFit: ContextFit;
  reasons: string[];
}

const PRIORITY_SCORE: Record<Priority, number> = {
  CRITICAL: 40,
  HIGH: 25,
  MEDIUM: 10,
  LOW: 0,
};

const PROFILE_TAG_WEIGHTS: Record<ActiveProfile, Record<string, number>> = {
  REGULAR: {},
  EXAM_PREP: { college: 50, academic: 45 },
  HACKATHON: { startup: 50, aiml: 45, ai_ml: 45 },
  PLACEMENT: { leetcode: 50, career: 40, career_coding: 40 },
  VACATION: { health: 60, personal: 35 },
};

const ENERGY_ORDER: Record<EnergyLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function energyFit(userEnergy: EnergyLevel, taskEnergy: EnergyLevel): number {
  const gap = ENERGY_ORDER[taskEnergy] - ENERGY_ORDER[userEnergy];
  if (gap <= 0) return 15;
  if (gap === 1) return 0;
  return -25;
}

function contextEnvironmentScore(
  ctx: ExecutionContext,
  candidate: ExecutionCandidate
): { delta: number; reasons: string[] } {
  const reasons: string[] = [];
  let delta = 0;

  if (candidate.isDeepWork) {
    if (ctx.environment === "COMMUTE" || ctx.device === "MOBILE") {
      delta -= 80;
      reasons.push("Deep work is a poor fit on mobile or during commute");
    } else if (ctx.environment === "HOME" || ctx.environment === "LIBRARY") {
      delta += 20;
      reasons.push("Environment supports focused deep work");
    }
  } else if (ctx.environment === "COMMUTE" && ctx.device === "MOBILE") {
    delta += 25;
    reasons.push("Lightweight task fits commute + mobile");
  }

  if (ctx.connectivity === "OFFLINE" && candidate.isDeepWork) {
    delta -= 15;
    reasons.push("Deep work often needs connectivity for references");
  }

  return { delta, reasons };
}

function durationFit(availableMinutes: number, durationMinutes: number): { delta: number; reason?: string } {
  if (durationMinutes <= availableMinutes) {
    const slack = availableMinutes - durationMinutes;
    if (slack <= 15) return { delta: 20, reason: "Uses your available window efficiently" };
    return { delta: 10, reason: "Fits within available time" };
  }
  const overrun = durationMinutes - availableMinutes;
  if (overrun <= 10) return { delta: -5, reason: "Slightly longer than available time" };
  return { delta: -60, reason: "Exceeds available time window" };
}

function profileAlignment(profile: ActiveProfile, tags: string[]): { delta: number; reason?: string } {
  const weights = PROFILE_TAG_WEIGHTS[profile] ?? {};
  let best = 0;
  let tag = "";
  for (const t of tags) {
    const w = weights[t.toLowerCase()] ?? 0;
    if (w > best) {
      best = w;
      tag = t;
    }
  }
  if (best > 0) {
    return { delta: best, reason: `Aligns with ${profile.replace("_", " ")} focus (${tag})` };
  }
  return { delta: 0 };
}

function urgencyScore(todayDateKey: string, sourceDateKey?: string, carryCount?: number): { delta: number; reasons: string[] } {
  const reasons: string[] = [];
  let delta = 0;
  if (sourceDateKey) {
    if (sourceDateKey < todayDateKey) {
      delta += 50;
      reasons.push("Overdue — carry-forward pressure");
    } else if (sourceDateKey === todayDateKey) {
      delta += 20;
      reasons.push("Due today");
    }
  }
  if (carryCount && carryCount > 0) {
    delta += Math.min(40, carryCount * 10);
    reasons.push(`Carried forward ${carryCount} time(s)`);
  }
  return { delta, reasons };
}

function classifyContextFit(score: number, isBlocked: boolean, poorContext: boolean): ContextFit {
  if (isBlocked) return "blocked";
  if (poorContext || score < 0) return "poor";
  if (score >= 80) return "excellent";
  return "good";
}

export class ExecutionDecisionEngine {
  scoreCandidate(ctx: ExecutionContext, candidate: ExecutionCandidate): ScoredRecommendation {
    const reasons: string[] = [];
    let score = 0;
    let poorContext = false;

    if (candidate.isBlocked) {
      return {
        candidate,
        score: -1000,
        contextFit: "blocked",
        reasons: ["Blocked by incomplete dependencies"],
      };
    }

    score += PRIORITY_SCORE[candidate.priority];
    reasons.push(`${candidate.priority} priority`);

    const profile = profileAlignment(ctx.activeProfile, candidate.objectiveTags);
    score += profile.delta;
    if (profile.reason) reasons.push(profile.reason);

    const urgency = urgencyScore(ctx.todayDateKey, candidate.sourceDateKey, candidate.carryCount);
    score += urgency.delta;
    reasons.push(...urgency.reasons);

    if (candidate.unlocksCount && candidate.unlocksCount > 0) {
      const unlock = Math.min(150, candidate.unlocksCount * 15);
      score += unlock;
      reasons.push(`Unlocks ${candidate.unlocksCount} dependent item(s)`);
    }

    const env = contextEnvironmentScore(ctx, candidate);
    score += env.delta;
    reasons.push(...env.reasons);
    if (env.delta <= -50) poorContext = true;

    const dur = durationFit(ctx.availableMinutes, candidate.durationMinutes);
    score += dur.delta;
    if (dur.reason) reasons.push(dur.reason);
    if (dur.delta <= -60) poorContext = true;

    const eFit = energyFit(ctx.energy, candidate.energyRequired);
    score += eFit;
    if (eFit < 0) reasons.push("Task energy demand exceeds your current energy");
    else if (eFit > 0) reasons.push("Energy level matches the task");

    return {
      candidate,
      score,
      contextFit: classifyContextFit(score, false, poorContext),
      reasons,
    };
  }

  rank(ctx: ExecutionContext, candidates: ExecutionCandidate[]): ScoredRecommendation[] {
    return candidates
      .map((c) => this.scoreCandidate(ctx, c))
      .filter((r) => r.contextFit !== "blocked")
      .sort((a, b) => b.score - a.score);
  }

  recommend(ctx: ExecutionContext, candidates: ExecutionCandidate[]): ScoredRecommendation | null {
    const ranked = this.rank(ctx, candidates);
    return ranked[0] ?? null;
  }
}

/** Maps client profile slugs to server ActiveProfile enum. */
export function clientProfileToActive(profile: string): ActiveProfile {
  const map: Record<string, ActiveProfile> = {
    regular: "REGULAR",
    exam: "EXAM_PREP",
    hackathon: "HACKATHON",
    placement: "PLACEMENT",
    vacation: "VACATION",
  };
  return map[profile] ?? "REGULAR";
}

/** Infer commute context from active COMMUTE commitments and clock time. */
export function inferEnvironmentFromCommitments(
  nowMinute: number,
  commitments: Array<{ type: string; startMinute: number; endMinute: number }>
): ExecutionEnvironment {
  for (const c of commitments) {
    if (c.type !== "COMMUTE") continue;
    let end = c.endMinute;
    let now = nowMinute;
    if (end <= c.startMinute) end += 1440;
    if (now < c.startMinute) now += 1440;
    if (now >= c.startMinute && now < end) return "COMMUTE";
  }
  return "HOME";
}
