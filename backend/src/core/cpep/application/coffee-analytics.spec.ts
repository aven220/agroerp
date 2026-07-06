import {
  avg,
  comparePeriods,
  groupCount,
  groupSum,
  hoursBucket,
  msToMinutes,
  percent,
  periodRange,
  startOfDay,
  sum,
  toCsv,
} from '../domain/analytics.engine';

describe('CPEP AnalyticsEngine', () => {
  it('aggregates averages and sums', () => {
    expect(avg([2, 4, 6])).toBe(4);
    expect(sum([1, 2, 3])).toBe(6);
    expect(percent(1, 4)).toBe(25);
    expect(msToMinutes(120_000)).toBe(2);
  });

  it('groups counts and sums', () => {
    const items = [
      { k: 'a', v: 10 },
      { k: 'a', v: 5 },
      { k: 'b', v: 7 },
    ];
    expect(groupCount(items, (i) => i.k)).toEqual({ a: 2, b: 1 });
    expect(groupSum(items, (i) => i.k, (i) => i.v)).toEqual({ a: 15, b: 7 });
  });

  it('builds period ranges and hour buckets', () => {
    const day = periodRange('day');
    expect(day.from.getTime()).toBe(startOfDay().getTime());
    const local = new Date();
    local.setHours(15, 30, 0, 0);
    expect(hoursBucket(local)).toBe('15:00');
  });

  it('compares periods', () => {
    const result = comparePeriods({ kg: 100, amount: 200 }, { kg: 80, amount: 250 });
    expect(result.kg.delta).toBe(20);
    expect(result.amount.delta).toBe(-50);
  });

  it('exports csv', () => {
    const csv = toCsv([
      { ticketKey: 'A', kg: 10 },
      { ticketKey: 'B', kg: 20 },
    ]);
    expect(csv.split('\n').length).toBe(3);
    expect(csv).toContain('ticketKey');
  });

  it('handles concurrent independent aggregations', () => {
    const a = groupSum([{ k: 'x', v: 1 }], (i) => i.k, (i) => i.v);
    const b = groupSum([{ k: 'x', v: 9 }], (i) => i.k, (i) => i.v);
    expect(a.x).toBe(1);
    expect(b.x).toBe(9);
  });
});
