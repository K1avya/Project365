import { describe, it, expect, beforeEach } from "vitest";
import { evaluateRateLimit, enforceRateLimit, resetRateLimits } from "../src/lib/rate-limiter.js";

describe("Sliding Window Rate Limiter Gate", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("permits requests within the defined threshold", () => {
    const opts = { maxRequests: 3, windowSeconds: 60 };
    const id = "192.168.1.1:/api/auth/register";

    const r1 = evaluateRateLimit(id, opts);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = evaluateRateLimit(id, opts);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = evaluateRateLimit(id, opts);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding threshold with retryAfterSeconds", () => {
    const opts = { maxRequests: 2, windowSeconds: 30 };
    const id = "192.168.1.2:/api/auth/register";

    evaluateRateLimit(id, opts);
    evaluateRateLimit(id, opts);

    // 3rd attempt exceeds maxRequests = 2
    const blocked = evaluateRateLimit(id, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("enforceRateLimit returns HTTP 429 response when limit is exceeded", () => {
    const opts = { maxRequests: 2, windowSeconds: 60 };
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.50" },
    });

    // 1st request -> permitted (returns null)
    expect(enforceRateLimit(req, "/api/auth/register", opts)).toBeNull();

    // 2nd request -> permitted
    expect(enforceRateLimit(req, "/api/auth/register", opts)).toBeNull();

    // 3rd request -> blocked (returns 429)
    const res = enforceRateLimit(req, "/api/auth/register", opts);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBeDefined();
  });
});
