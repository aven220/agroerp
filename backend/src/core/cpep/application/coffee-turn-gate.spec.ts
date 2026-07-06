import { evaluateGateChecks } from '../domain/gate.engine';
import { averageMs, computeAttentionMs, computeWaitMs, displayLabel, sortQueue } from '../domain/turn.engine';

describe('CPEP gate engine', () => {
  it('blocks inactive producer and sanctions', () => {
    const result = evaluateGateChecks({
      producerActive: false,
      documentsValid: true,
      farmActive: true,
      lotAuthorized: true,
      withinDailyLimits: true,
      qualityRestricted: false,
      hasActiveContract: true,
      hasSanctions: true,
      alerts: ['Alerta configurada'],
    });
    expect(result.allowed).toBe(false);
    expect(result.checks.some((c) => c.code === 'producer_active' && !c.ok)).toBe(true);
  });

  it('allows valid intake with warnings', () => {
    const result = evaluateGateChecks({
      producerActive: true,
      documentsValid: true,
      farmActive: true,
      lotAuthorized: true,
      withinDailyLimits: true,
      qualityRestricted: true,
      hasActiveContract: false,
      hasSanctions: false,
      alerts: [],
    });
    expect(result.allowed).toBe(true);
  });
});

describe('CPEP turn engine', () => {
  it('sorts preferential and priority first', () => {
    const sorted = sortQueue([
      { turnNumber: 2, priority: 100, isPreferential: false, createdAt: new Date('2026-01-01') },
      { turnNumber: 1, priority: 50, isPreferential: true, createdAt: new Date('2026-01-02') },
      { turnNumber: 3, priority: 10, isPreferential: false, createdAt: new Date('2026-01-03') },
    ]);
    expect(sorted[0].isPreferential).toBe(true);
    expect(sorted[1].priority).toBe(10);
  });

  it('computes wait and attention metrics', () => {
    const arrival = new Date('2026-01-01T10:00:00Z');
    const called = new Date('2026-01-01T10:05:00Z');
    const done = new Date('2026-01-01T10:08:00Z');
    expect(computeWaitMs(arrival, called)).toBe(300_000);
    expect(computeAttentionMs(called, done)).toBe(180_000);
    expect(averageMs([100, 200, 300])).toBe(200);
    expect(displayLabel(5, true)).toBe('P-5');
  });
});
