import { describe, it, expect } from "vitest";
import {
  ExecutionDecisionEngine,
  inferEnvironmentFromCommitments,
  clientProfileToActive,
  type ExecutionCandidate,
  type ExecutionContext,
} from "../src/domain/execution/execution-decision-engine.js";

describe("Execution Decision Engine (Context-Aware LOS)", () => {
  const engine = new ExecutionDecisionEngine();

  const baseCtx: ExecutionContext = {
    environment: "HOME",
    device: "LAPTOP",
    availableMinutes: 60,
    energy: "HIGH",
    connectivity: "ONLINE",
    activeProfile: "PLACEMENT",
    todayDateKey: "2026-09-24",
  };

  const lecture: ExecutionCandidate = {
    id: "1",
    title: "Watch System Design Lecture",
    source: "backlog",
    priority: "MEDIUM",
    energyRequired: "MEDIUM",
    durationMinutes: 45,
    isDeepWork: false,
    isBlocked: false,
    objectiveTags: ["career", "leetcode"],
  };

  const deepApi: ExecutionCandidate = {
    id: "2",
    title: "Build Login API",
    source: "task_instance",
    priority: "HIGH",
    energyRequired: "HIGH",
    durationMinutes: 90,
    isDeepWork: true,
    isBlocked: false,
    objectiveTags: ["startup"],
  };

  it("prefers mobile-friendly learning on commute over deep work", () => {
    const commuteCtx: ExecutionContext = {
      ...baseCtx,
      environment: "COMMUTE",
      device: "MOBILE",
      availableMinutes: 25,
      energy: "MEDIUM",
    };

    const best = engine.recommend(commuteCtx, [deepApi, lecture]);
    expect(best?.candidate.id).toBe("1");
    expect(best?.contextFit).not.toBe("blocked");
  });

  it("ranks placement-aligned leetcode higher under PLACEMENT profile at home", () => {
    const ranked = engine.rank(baseCtx, [deepApi, lecture]);
    expect(ranked[0]?.candidate.id).toBe("1");
    expect(ranked[0]?.reasons.some((r) => r.includes("PLACEMENT"))).toBe(true);
  });

  it("penalizes tasks that exceed available time", () => {
    const shortWindow: ExecutionContext = {
      ...baseCtx,
      availableMinutes: 30,
    };
    const scored = engine.scoreCandidate(shortWindow, deepApi);
    expect(scored.reasons.some((r) => r.includes("Exceeds available time"))).toBe(true);
  });

  it("returns blocked fit for dependency-blocked candidates", () => {
    const blocked: ExecutionCandidate = {
      ...lecture,
      id: "blocked-1",
      isBlocked: true,
    };
    const scored = engine.scoreCandidate(baseCtx, blocked);
    expect(scored.contextFit).toBe("blocked");
  });

  it("infers COMMUTE from active commitment window", () => {
    const env = inferEnvironmentFromCommitments(480, [
      { type: "COMMUTE", startMinute: 420, endMinute: 540 },
    ]);
    expect(env).toBe("COMMUTE");
  });

  it("maps client profile slugs to ActiveProfile", () => {
    expect(clientProfileToActive("placement")).toBe("PLACEMENT");
    expect(clientProfileToActive("unknown")).toBe("REGULAR");
  });
});
