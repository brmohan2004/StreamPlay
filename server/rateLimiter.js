// server/rateLimiter.js
function createLimiter(max, windowMs) {
  const buckets = new Map();
  return {
    check(key, now = Date.now()) {
      const windowStart = now - windowMs;
      const arr = (buckets.get(key) || []).filter((t) => t > windowStart);
      if (arr.length >= max) {
        buckets.set(key, arr);
        return { allowed: false, remaining: 0, resetAt: arr[0] + windowMs };
      }
      arr.push(now);
      buckets.set(key, arr);
      if (buckets.size > 10000) {
        const first = buckets.keys().next().value;
        if (first) buckets.delete(first);
      }
      return { allowed: true, remaining: max - arr.length, resetAt: now + windowMs };
    },
    reset(key) {
      if (key) buckets.delete(key); else buckets.clear();
    },
  };
}

export const streamLimiter = createLimiter(20, 60000);
export const proxyLimiter = createLimiter(300, 60000);