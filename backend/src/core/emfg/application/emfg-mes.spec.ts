import {
  aggregateMonitorStats,
  canMesTransition,
  computeAdvancePct,
  computeElapsedMinutes,
  computeYieldPct,
  validateConsumption,
} from '../domain/emfg-mes.engine';

describe('emfg-mes.engine', () => {
  it('validates MES transitions', () => {
    expect(canMesTransition('released', 'start')).toEqual({ ok: true, to: 'in_progress' });
    expect(canMesTransition('in_progress', 'pause')).toEqual({ ok: true, to: 'paused' });
    expect(canMesTransition('paused', 'resume')).toEqual({ ok: true, to: 'in_progress' });
    expect(canMesTransition('in_progress', 'suspend')).toEqual({ ok: true, to: 'suspended' });
    expect(canMesTransition('suspended', 'resume')).toEqual({ ok: true, to: 'in_progress' });
    expect(canMesTransition('in_progress', 'finish')).toEqual({ ok: true, to: 'completed' });
    expect(canMesTransition('completed', 'start')).toEqual({ ok: false });
  });

  it('computes elapsed minutes', () => {
    const start = new Date('2026-07-05T08:00:00Z');
    const end = new Date('2026-07-05T09:30:00Z');
    expect(computeElapsedMinutes(start, end)).toBe(90);
  });

  it('computes yield and advance', () => {
    expect(computeYieldPct(80, 100)).toBe(80);
    expect(computeAdvancePct(150, 100)).toBe(100);
  });

  it('validates consumption quantities', () => {
    expect(validateConsumption(100, 50, 30)).toEqual([]);
    expect(validateConsumption(100, 50, 0)).toContain('invalid_quantity');
    expect(validateConsumption(100, 95, 20)).toContain('exceeds_required');
    expect(validateConsumption(100, 95, 20, true)).toEqual([]);
  });

  it('aggregates monitor stats', () => {
    const stats = aggregateMonitorStats([
      { status: 'in_progress', plannedQty: 100, producedQty: 40, scrapQty: 2, materials: [{ requiredQty: 50, issuedQty: 30 }] },
      { status: 'paused', plannedQty: 200, producedQty: 100, scrapQty: 5, materials: [{ requiredQty: 80, issuedQty: 60 }] },
      { status: 'completed', plannedQty: 50, producedQty: 50, scrapQty: 0 },
    ]);
    expect(stats.active).toBe(1);
    expect(stats.stopped).toBe(1);
    expect(stats.finished).toBe(1);
    expect(stats.totalProduced).toBe(190);
    expect(stats.consumed).toBe(90);
    expect(stats.required).toBe(130);
  });

  it('handles concurrent transition rules consistently', () => {
    const actions = ['start', 'pause', 'resume', 'finish'] as const;
    let status = 'released';
    for (const action of actions) {
      const t = canMesTransition(status, action);
      if (t.ok && t.to) status = t.to;
    }
    expect(status).toBe('completed');
  });

  it('supports high volume aggregation', () => {
    const orders = Array.from({ length: 1000 }, (_, i) => ({
      status: i % 3 === 0 ? 'in_progress' : i % 3 === 1 ? 'paused' : 'completed',
      plannedQty: 100,
      producedQty: i % 100,
      scrapQty: i % 5,
      materials: [{ requiredQty: 10, issuedQty: i % 10 }],
    }));
    const stats = aggregateMonitorStats(orders);
    expect(stats.active + stats.stopped + stats.finished).toBe(1000);
  });
});
