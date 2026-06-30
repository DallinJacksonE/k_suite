import type { Request } from 'express';

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  consume(req: Request, key?: string): RateLimitResult;
}

interface AttemptWindow {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions = { maxAttempts: 10, windowMs: 60_000 }): RateLimiter {
  const attempts = new Map<string, AttemptWindow>();

  return {
    consume(req, key = req.ip ?? 'unknown'): RateLimitResult {
      const now = Date.now();
      const current = attempts.get(key);
      if (!current || current.resetAt <= now) {
        attempts.set(key, { count: 1, resetAt: now + options.windowMs });
        return { limited: false };
      }

      if (current.count >= options.maxAttempts) {
        return { limited: true, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
      }

      current.count += 1;
      return { limited: false };
    },
  };
}

export class RateLimitError extends Error {
  statusCode = 429;

  constructor(public readonly retryAfterSeconds: number) {
    super('Too many attempts.');
  }
}

export function assertNotRateLimited(limiter: RateLimiter, req: Request, key?: string): void {
  const result = limiter.consume(req, key);
  if (result.limited) throw new RateLimitError(result.retryAfterSeconds ?? 60);
}
