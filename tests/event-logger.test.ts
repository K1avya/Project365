import { describe, it, expect, beforeEach } from "vitest";
import {
  EventLogger,
  InvalidStateTransitionError,
} from "../src/domain/events/event-logger.js";

describe("Module 5: Event Logger (Rule 1 - Event Sourcing)", () => {
  let logger: EventLogger;

  beforeEach(() => {
    logger = new EventLogger();
  });

  it("appends immutable events and maintains chronological audit trail", () => {
    const instanceId = "instance-1";

    const e1 = logger.log({
      taskInstanceId: instanceId,
      eventType: "CREATED",
      timestamp: new Date("2026-09-20T06:00:00Z"),
    });

    const e2 = logger.log({
      taskInstanceId: instanceId,
      eventType: "STARTED",
      timestamp: new Date("2026-09-20T06:05:00Z"),
    });

    const e3 = logger.log({
      taskInstanceId: instanceId,
      eventType: "COMPLETED",
      payload: { actualMinutes: 55, leetCodeSolved: 2 },
      timestamp: new Date("2026-09-20T07:00:00Z"),
    });

    expect(logger.count).toBe(3);
    const history = logger.getEventsForInstance(instanceId);
    expect(history.map(h => h.eventType)).toEqual(["CREATED", "STARTED", "COMPLETED"]);
    expect(history[2].payload).toEqual({ actualMinutes: 55, leetCodeSolved: 2 });
  });

  it("validates legal and illegal state transitions", () => {
    // Legal transitions
    expect(logger.validateTransition("PENDING", "STARTED")).toBe("ACTIVE");
    expect(logger.validateTransition("ACTIVE", "PAUSED")).toBe("PAUSED");
    expect(logger.validateTransition("PAUSED", "RESUMED")).toBe("ACTIVE");
    expect(logger.validateTransition("ACTIVE", "COMPLETED")).toBe("COMPLETED");
    expect(logger.validateTransition("PENDING", "MISSED")).toBe("MISSED");

    // Illegal transitions
    expect(() => logger.validateTransition("PENDING", "PAUSED")).toThrow(
      InvalidStateTransitionError
    );
    expect(() => logger.validateTransition("COMPLETED", "MISSED")).toThrow(
      InvalidStateTransitionError
    );
    expect(() => logger.validateTransition("COMPLETED", "CANCELLED")).toThrow(
      InvalidStateTransitionError
    );
  });

  it("calculates total paused milliseconds across pause/resume cycles", () => {
    const instanceId = "instance-with-pauses";

    // Started at 10:00 AM
    logger.log({
      taskInstanceId: instanceId,
      eventType: "STARTED",
      timestamp: new Date("2026-09-20T10:00:00Z"),
    });

    // Paused at 10:15 AM (15 min in)
    logger.log({
      taskInstanceId: instanceId,
      eventType: "PAUSED",
      timestamp: new Date("2026-09-20T10:15:00Z"),
    });

    // Resumed at 10:20 AM (5 min pause = 300,000 ms)
    logger.log({
      taskInstanceId: instanceId,
      eventType: "RESUMED",
      timestamp: new Date("2026-09-20T10:20:00Z"),
    });

    // Paused again at 10:40 AM
    logger.log({
      taskInstanceId: instanceId,
      eventType: "PAUSED",
      timestamp: new Date("2026-09-20T10:40:00Z"),
    });

    // Completed at 10:50 AM while paused (10 min pause = 600,000 ms)
    logger.log({
      taskInstanceId: instanceId,
      eventType: "COMPLETED",
      timestamp: new Date("2026-09-20T10:50:00Z"),
    });

    // Total paused = 5 min + 10 min = 15 min = 900,000 ms
    const totalPausedMs = logger.calculateTotalPausedMs(instanceId);
    expect(totalPausedMs).toBe(15 * 60 * 1000);
  });
});
