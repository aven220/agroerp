import { cacheHitRatio, computeExpiresAt, isExpired } from '../domain/cache.engine';
import { improvementPct } from '../domain/query-optimizer.engine';

describe('EPOP stress and recovery', () => {
  it('handles cache thrash without negative ratios', () => {
    let hits = 0;
    let misses = 0;
    for (let i = 0; i < 5000; i++) {
      const exp = computeExpiresAt(i % 2 === 0 ? 1 : 3600);
      if (isExpired(exp, new Date(Date.now() + 2000))) misses += 1;
      else hits += 1;
    }
    const ratio = cacheHitRatio(hits, misses);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it('benchmark comparison recovers from regression', () => {
    const regression = improvementPct(100, 150);
    expect(regression).toBeLessThan(0);
    const recovery = improvementPct(150, 90);
    expect(recovery).toBeGreaterThan(0);
  });
});
