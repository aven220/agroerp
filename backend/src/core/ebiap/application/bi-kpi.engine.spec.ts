import { BiKpiEngine } from './bi-kpi.engine';

describe('BiKpiEngine', () => {
  const engine = new BiKpiEngine();

  it('evaluates lt alert', () => {
    const alerts = engine.evaluateAlerts(5, 10, [{ operator: 'lt', threshold: 10 }]);
    expect(alerts.some((a) => a.triggered)).toBe(true);
  });

  it('computes variance', () => {
    expect(engine.computeVariance(80, 100)).toBe(-20);
  });

  it('flags critical variance below target', () => {
    const alerts = engine.evaluateAlerts(70, 100, []);
    expect(alerts.some((a) => a.severity === 'critical')).toBe(true);
  });
});
