import { BreDecisionService } from './bre-decision.service';

describe('BreDecisionService', () => {
  const service = new BreDecisionService({} as never);

  it('evaluates first hit policy', () => {
    const table = {
      hitPolicy: 'first',
      rows: [
        { inputs: { tier: 'A' }, outputs: { discount: 10 }, priority: 5 },
        { inputs: { tier: 'B' }, outputs: { discount: 5 }, priority: 10 },
      ],
    };
    const result = service.evaluate(table, { tier: 'A' });
    expect(result).toHaveLength(1);
    expect(result[0].discount).toBe(10);
  });

  it('collects all matches', () => {
    const table = {
      hitPolicy: 'collect',
      rows: [
        { inputs: { region: 'CO' }, outputs: { tax: 0.05 } },
        { inputs: { region: '*' }, outputs: { tax: 0.1 } },
      ],
    };
    const result = service.evaluate(table, { region: 'CO' });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
