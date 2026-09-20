import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function evaluateRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const existing = rateLimitStore.get(identifier);

  // If entry expired or doesn't exist, reset window
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  // Increment count
  existing.count += 1;
  const remaining = Math.max(0, options.maxRequests - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Enforces rate limiting on a request.
 * Returns HTTP 429 NextResponse if threshold exceeded; returns null if permitted.
 */
export function enforceRateLimit(
  req: Request,
  endpoint: string,
  options: RateLimitOptions
): NextResponse | null {
  const ip = extractClientIp(req);
  const identifier = `${ip}:${endpoint}`;
  const result = evaluateRateLimit(identifier, options);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Rate limit exceeded. Please try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(options.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

export function resetRateLimits(): void {
  rateLimitStore.clear();
}
