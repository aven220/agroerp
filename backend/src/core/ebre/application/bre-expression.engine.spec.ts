import { BreExpressionEngine } from './bre-expression.engine';

describe('BreExpressionEngine', () => {
  const engine = new BreExpressionEngine();

  it('evaluates math expressions', () => {
    expect(engine.evaluate({ key: 'x', expression: '10 + 5 * 2' }, {})).toBe(20);
    expect(engine.evaluate({ key: 'x', expression: '{payload.score} * 2', type: 'math' }, { payload: { score: 40 } })).toBe(80);
  });

  it('interpolates string templates', () => {
    expect(engine.evaluate({ key: 'm', expression: 'Hola {payload.name}', type: 'string' }, { payload: { name: 'AGRO' } })).toBe('Hola AGRO');
  });

  it('evaluates geo expressions', () => {
    expect(engine.evaluate({ key: 'g', expression: 'inside_geofence', type: 'geo' }, { geo: { insideGeofence: true } })).toBe(true);
  });
});
