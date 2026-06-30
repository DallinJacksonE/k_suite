export function createRateLimiter(options = { maxAttempts: 10, windowMs: 60_000 }) {
    const attempts = new Map();
    return {
        consume(req, key = req.ip ?? 'unknown') {
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
    retryAfterSeconds;
    statusCode = 429;
    constructor(retryAfterSeconds) {
        super('Too many attempts.');
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
export function assertNotRateLimited(limiter, req, key) {
    const result = limiter.consume(req, key);
    if (result.limited)
        throw new RateLimitError(result.retryAfterSeconds ?? 60);
}
