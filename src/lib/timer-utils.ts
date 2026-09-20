import type { TaskEventResponseDTO } from "../dtos/event.dto";

/**
 * Derives exact elapsed work milliseconds from the append-only event stream.
 * ZERO reliance on client React state or setInterval drift.
 */
export function computeElapsedSeconds(
  events: TaskEventResponseDTO[] | undefined,
  currentStatus: string,
  nowMs: number = Date.now()
): number {
  if (!events || events.length === 0) {
    return 0;
  }

  let totalMs = 0;
  let runningStartMs: number | null = null;

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const ev of sorted) {
    const evTime = new Date(ev.createdAt).getTime();

    if (ev.eventType === "STARTED" || ev.eventType === "RESUMED") {
      runningStartMs = evTime;
    } else if (
      (ev.eventType === "PAUSED" || ev.eventType === "COMPLETED" || ev.eventType === "MISSED") &&
      runningStartMs !== null
    ) {
      totalMs += Math.max(0, evTime - runningStartMs);
      runningStartMs = null;
    }
  }

  // If task is currently ACTIVE and has not ended
  if (currentStatus === "ACTIVE" && runningStartMs !== null) {
    totalMs += Math.max(0, nowMs - runningStartMs);
  }

  return Math.floor(totalMs / 1000);
}

export function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
