import "server-only";

// Best-effort in-memory login throttle (docs/06: "consider rate limiting").
// Single-instance guard; for multi-instance deployments put the app behind
// a gateway/WAF rate limiter. Never reveal whether a username exists.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function loginThrottleKey(username: string, ip: string): string {
  return `${username}::${ip}`;
}

export function isLoginThrottled(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (now >= bucket.resetAt) {
    buckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string, now = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearLoginThrottle(key: string): void {
  buckets.delete(key);
}
