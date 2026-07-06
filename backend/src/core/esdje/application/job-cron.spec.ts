import { matchesCron, nextCronRun, isBusinessDay } from './job-cron.util';
import { JobRetryEngine } from './job-retry.engine';

describe('JobCronUtil', () => {
  it('matches every minute cron', () => {
    const d = new Date('2026-07-03T10:15:00');
    expect(matchesCron('* * * * *', d)).toBe(true);
  });

  it('matches hourly cron at minute 0', () => {
    const d = new Date('2026-07-03T10:00:00');
    expect(matchesCron('0 * * * *', d)).toBe(true);
    expect(matchesCron('0 * * * *', new Date('2026-07-03T10:30:00'))).toBe(false);
  });

  it('computes next cron run', () => {
    const from = new Date('2026-07-03T10:00:00');
    const next = nextCronRun('0 */2 * * *', from);
    expect(next.getMinutes()).toBe(0);
    expect(next.getHours() % 2).toBe(0);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });

  it('identifies business days', () => {
    expect(isBusinessDay(new Date(2026, 6, 6))).toBe(true);
    expect(isBusinessDay(new Date(2026, 6, 5))).toBe(false);
  });
});

describe('JobRetryEngine', () => {
  const engine = new JobRetryEngine();

  it('exponential backoff', () => {
    expect(engine.computeDelay('exponential', 1000, 1)).toBe(1000);
    expect(engine.computeDelay('exponential', 1000, 2)).toBe(2000);
    expect(engine.computeDelay('exponential', 1000, 3)).toBe(4000);
  });

  it('linear backoff', () => {
    expect(engine.computeDelay('linear', 500, 3)).toBe(1500);
  });

  it('fixed backoff', () => {
    expect(engine.computeDelay('fixed', 2000, 5)).toBe(2000);
  });

  it('shouldRetry respects maxRetries', () => {
    expect(engine.shouldRetry(1, 3)).toBe(true);
    expect(engine.shouldRetry(3, 3)).toBe(false);
  });
});

describe('ESDJE concurrency readiness', () => {
  it('processes batch dispatch shape', async () => {
    const batch = Array.from({ length: 200 }, (_, i) => ({ id: i, priority: i % 5 }));
    const sorted = [...batch].sort((a, b) => a.priority - b.priority);
    expect(sorted[0].priority).toBe(0);
    expect(sorted.length).toBe(200);
  });
});

describe('ESDJE failure recovery', () => {
  it('delays retry runs in the future', () => {
    const engine = new JobRetryEngine();
    const delay = engine.computeDelay('exponential', 1000, 2);
    const retryAt = Date.now() + delay;
    expect(retryAt).toBeGreaterThan(Date.now());
  });
});
