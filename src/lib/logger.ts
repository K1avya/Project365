/**
 * Project365 Structured JSON Logger
 * Provides standardized contextual logging with correlation IDs, latency tracking,
 * and structured metadata formatting.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: string;
  elapsedMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(payload: LogPayload): string {
    return JSON.stringify(payload);
  }

  debug(message: string, meta?: Record<string, unknown>, context?: string) {
    if (process.env.NODE_ENV === "production" && process.env.DEBUG !== "true") return;
    const entry: LogPayload = {
      level: "DEBUG",
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata: meta,
    };
    console.debug(this.formatLog(entry));
  }

  info(message: string, meta?: Record<string, unknown>, context?: string) {
    const entry: LogPayload = {
      level: "INFO",
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata: meta,
    };
    console.log(this.formatLog(entry));
  }

  warn(message: string, meta?: Record<string, unknown>, context?: string) {
    const entry: LogPayload = {
      level: "WARN",
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata: meta,
    };
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>, context?: string) {
    const errObj = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
      ? { name: "Error", message: String(error) }
      : undefined;

    const entry: LogPayload = {
      level: "ERROR",
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata: meta,
      error: errObj,
    };
    console.error(this.formatLog(entry));
  }

  /**
   * Times an async operation and logs elapsed milliseconds upon completion.
   */
  async timed<T>(
    operationName: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>,
    context?: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const elapsedMs = Number((performance.now() - start).toFixed(2));
      this.info(`${operationName} completed successfully`, { ...meta, elapsedMs }, context);
      return result;
    } catch (err) {
      const elapsedMs = Number((performance.now() - start).toFixed(2));
      this.error(`${operationName} failed`, err, { ...meta, elapsedMs }, context);
      throw err;
    }
  }
}

export const logger = new Logger();
