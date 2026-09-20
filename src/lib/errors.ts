import { NextResponse } from "next/server";

export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends Error {
  constructor(message = "Invalid request payload.") {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConcurrencyConflictError extends Error {
  constructor(message = "Concurrency conflict: resource was modified or cannot transition state.") {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

/**
 * Standardized API Route Error Handler.
 * Enforces anti-enumeration:
 * - NotFoundError -> 404
 * - Entity ownership mismatches ("Unauthorized") -> 404 (to avoid leaking resource existence)
 * - ConcurrencyConflictError -> 409
 * - ValidationError -> 400
 * - Uncaught / generic validation -> 400
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }

  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  if (err instanceof ConcurrencyConflictError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }

  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const message = err instanceof Error ? err.message : String(err);
  const lowerMsg = message.toLowerCase();

  // Anti-enumeration: if error indicates not found, unauthorized tenant access, or ownership mismatch
  if (
    lowerMsg.includes("not found") ||
    lowerMsg.includes("does not belong to actor") ||
    lowerMsg.includes("unauthorized access") ||
    lowerMsg.includes("unauthorized or")
  ) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
