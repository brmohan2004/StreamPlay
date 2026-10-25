// src/lib/rateLimiter.ts
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class SlidingWindowRateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const arr = (this.buckets.get(key) || []).filter((t) => t > windowStart);
    if (arr.length >= this.max) {
      this.buckets.set(key, arr);
      return { allowed: false, remaining: 0, resetAt: arr[0] + this.windowMs };
    }
    arr.push(now);
    this.buckets.set(key, arr);
    if (this.buckets.size > 10000) {
      const first = this.buckets.keys().next().value;
      if (first) this.buckets.delete(first);
    }
    return { allowed: true, remaining: this.max - arr.length, resetAt: now + this.windowMs };
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }
}

export const streamLimiter = new SlidingWindowRateLimiter(20, 60000);
export const proxyLimiter = new SlidingWindowRateLimiter(300, 60000);