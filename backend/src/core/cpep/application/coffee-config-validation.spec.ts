import { applyAutoAdjustments, isWithinSchedule, validateReceptionRules } from '../domain/config-validation.engine';

describe('CPEP config validation engine', () => {
  it('validates schedule windows', () => {
    const noon = new Date('2026-07-03T12:00:00');
    expect(isWithinSchedule('06:00', '18:00', noon)).toBe(true);
    const night = new Date('2026-07-03T20:00:00');
    expect(isWithinSchedule('06:00', '18:00', night)).toBe(false);
  });

  it('detects humidity and limit violations', () => {
    const result = validateReceptionRules(
      [{ openTime: '06:00', closeTime: '18:00', maxHumidityPct: 12.5, maxTicketsDay: 1, isActive: true }],
      { now: new Date('2026-07-03T10:00:00'), humidityPct: 13, ticketsToday: 1 },
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('applies automatic bonuses and penalties', () => {
    const adj = applyAutoAdjustments(
      [{ code: 'premium', amount: 100, condition: { grade: 'premium' } }],
      [{ code: 'humidity', amount: 50, condition: { maxHumidity: 12.5 } }],
      { grade: 'premium', humidityPct: 13, factor: 90 },
    );
    expect(adj.bonusTotal).toBe(100);
    expect(adj.penaltyTotal).toBe(50);
  });
});
