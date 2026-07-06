import { computeTwinDelta } from '../domain/digital-twin.engine';

describe('EIESDP DigitalTwinEngine', () => {
  it('computes delta when reported differs from desired', () => {
    const desired = { threshold: 30, mode: 'auto', enabled: true };
    const reported = { threshold: 25, mode: 'auto', enabled: true };
    expect(computeTwinDelta(desired, reported)).toEqual({ threshold: 30 });
  });

  it('returns empty delta when states match', () => {
    const state = { threshold: 30, mode: 'manual' };
    expect(computeTwinDelta(state, { ...state })).toEqual({});
  });

  it('detects nested object differences', () => {
    const desired = { config: { interval: 60 } };
    const reported = { config: { interval: 30 } };
    expect(computeTwinDelta(desired, reported)).toEqual({ config: { interval: 60 } });
  });
});
