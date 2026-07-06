export function isExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function computeExpiresAt(ttlSeconds: number, now = new Date()): Date {
  return new Date(now.getTime() + Math.max(1, ttlSeconds) * 1000);
}

export function cacheHitRatio(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) return 0;
  return hits / total;
}
