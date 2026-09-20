import type { TaskEvent, TaskEventType, TaskStatus } from "../types";

export interface LogEventParams {
  taskInstanceId: string;
  eventType: TaskEventType;
  payload?: Record<string, unknown> | null;
  timestamp?: Date;
}

export class InvalidStateTransitionError extends Error {
  constructor(currentStatus: TaskStatus, attemptedEvent: TaskEventType) {
    super(`Cannot transition from status "${currentStatus}" via event "${attemptedEvent}".`);
    this.name = "InvalidStateTransitionError";
  }
}

export class EventLogger {
  private events: TaskEvent[] = [];

  /**
   * Appends an immutable event to the audit ledger.
   */
  log(params: LogEventParams, idGenerator: () => string = () => crypto.randomUUID()): TaskEvent {
    const event: TaskEvent = {
      id: idGenerator(),
      taskInstanceId: params.taskInstanceId,
      eventType: params.eventType,
      payload: params.payload ? { ...params.payload } : null,
      createdAt: params.timestamp ?? new Date(),
    };

    this.events.push(Object.freeze(event));
    return event;
  }

  /**
   * Retrieves all events recorded for a specific TaskInstance in chronological order.
   */
  getEventsForInstance(taskInstanceId: string): TaskEvent[] {
    return this.events
      .filter(e => e.taskInstanceId === taskInstanceId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Validates whether a state transition event is legally allowed
   * from the current status according to Rule 1.
   */
  validateTransition(currentStatus: TaskStatus, event: TaskEventType): TaskStatus {
    switch (event) {
      case "STARTED":
      case "RESUMED":
        if (currentStatus !== "PENDING" && currentStatus !== "PAUSED") {
          throw new InvalidStateTransitionError(currentStatus, event);
        }
        return "ACTIVE";

      case "PAUSED":
        if (currentStatus !== "ACTIVE") {
          throw new InvalidStateTransitionError(currentStatus, event);
        }
        return "PAUSED";

      case "COMPLETED":
        if (currentStatus !== "ACTIVE" && currentStatus !== "PENDING") {
          throw new InvalidStateTransitionError(currentStatus, event);
        }
        return "COMPLETED";

      case "MISSED":
        if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
          throw new InvalidStateTransitionError(currentStatus, event);
        }
        return "MISSED";

      case "CANCELLED":
        if (currentStatus === "COMPLETED") {
          throw new InvalidStateTransitionError(currentStatus, event);
        }
        return "CANCELLED";

      case "SCHEDULED":
      case "CREATED":
        return currentStatus; // Does not alter status directly

      case "ARCHIVED":
        return currentStatus;

      default:
        return currentStatus;
    }
  }

  /**
   * Calculates total paused duration in milliseconds from the event stream.
   */
  calculateTotalPausedMs(taskInstanceId: string): number {
    const events = this.getEventsForInstance(taskInstanceId);
    let totalPausedMs = 0;
    let pauseStartTime: number | null = null;

    for (const e of events) {
      if (e.eventType === "PAUSED") {
        pauseStartTime = e.createdAt.getTime();
      } else if ((e.eventType === "RESUMED" || e.eventType === "COMPLETED" || e.eventType === "MISSED") && pauseStartTime !== null) {
        totalPausedMs += Math.max(0, e.createdAt.getTime() - pauseStartTime);
        pauseStartTime = null;
      }
    }

    return totalPausedMs;
  }

  /**
   * Returns the count of total events in the ledger.
   */
  get count(): number {
    return this.events.length;
  }
}
