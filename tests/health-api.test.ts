import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/health/route.js";

describe("System Health & Reliability Monitoring Gate (Phase 2)", () => {
  it("returns 200 OK with database connection status and telemetry", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.database.connected).toBe(true);
    expect(typeof body.database.latencyMs).toBe("number");
    expect(body.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(body.schemaVersion).toBe("20260919000001");
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.pendingWeeklyPlans).toBe("number");
    expect(typeof body.staleSnapshots).toBe("number");
  });
});
