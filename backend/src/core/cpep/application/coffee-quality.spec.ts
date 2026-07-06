import {
  computeDefectsTotal,
  computeQualityScore,
  evaluateQualityRules,
  generateCustodyCode,
  generateSampleKey,
  mergeBreActions,
  ticketStatusForDecision,
} from '../domain/quality.engine';

describe('CPEP QualityEngine', () => {
  it('computes defects and score', () => {
    expect(computeDefectsTotal({ pasillaPct: 1, brocaPct: 0.5, blackBeansPct: 0.5 })).toBe(2);
    const score = computeQualityScore({ humidityPct: 11, factor: 92, pasillaPct: 1, brocaPct: 0.5 });
    expect(score).toBeGreaterThan(80);
  });

  it('accepts good coffee automatically', () => {
    const result = evaluateQualityRules({
      humidityPct: 11,
      factor: 93,
      pasillaPct: 0.5,
      brocaPct: 0.2,
      color: 'verde oliva',
      odor: 'limpio',
    });
    expect(result.decision).toMatch(/accepted/);
    expect(result.bonusesTotal).toBeGreaterThan(0);
    expect(result.grade).toMatch(/premium|excelso|standard/);
  });

  it('rejects high humidity and bad odor', () => {
    const humidity = evaluateQualityRules({ humidityPct: 15, factor: 90 });
    expect(humidity.decision).toBe('rejected');

    const odor = evaluateQualityRules({ humidityPct: 11, factor: 90, odor: 'moho' });
    expect(odor.decision).toBe('rejected');
  });

  it('conditions and applies penalties', () => {
    const result = evaluateQualityRules({
      humidityPct: 12.8,
      factor: 85,
      pasillaPct: 4,
      brocaPct: 3,
    });
    expect(result.decision).toBe('conditioned');
    expect(result.penaltiesTotal).toBeGreaterThan(0);
  });

  it('requests lab for borderline cases', () => {
    const result = evaluateQualityRules({ humidityPct: 13.2, factor: 90, pasillaPct: 1 });
    expect(result.decision).toBe('requires_lab');
    expect(result.requiresReview).toBe(true);
  });

  it('escalates foreign matter', () => {
    const result = evaluateQualityRules({
      humidityPct: 11,
      factor: 92,
      foreignMatterPct: 2,
    });
    expect(result.escalated).toBe(true);
    expect(result.decision).toBe('conditioned');
  });

  it('merges BRE actions', () => {
    const base = evaluateQualityRules({ humidityPct: 11, factor: 92 });
    const merged = mergeBreActions(base, [
      {
        ruleKey: 'bre-bonus',
        matched: true,
        actions: [{ type: 'bonus', config: { amount: 50, message: 'BRE bonus' } }],
      },
    ]);
    expect(merged.bonusesTotal).toBe(base.bonusesTotal + 50);
  });

  it('maps decisions to ticket statuses', () => {
    expect(ticketStatusForDecision('accepted')).toBe('settlement_pending');
    expect(ticketStatusForDecision('rejected')).toBe('quality_rejected');
    expect(ticketStatusForDecision('requires_lab')).toBe('quality_lab');
  });

  it('generates sample and custody codes', () => {
    const sample = generateSampleKey('RCP-001', 1);
    expect(sample.startsWith('SMP-')).toBe(true);
    expect(generateCustodyCode(sample).startsWith('CUS-')).toBe(true);
  });

  it('handles concurrent evaluations independently', () => {
    const a = evaluateQualityRules({ humidityPct: 11, factor: 94 });
    const b = evaluateQualityRules({ humidityPct: 15, factor: 80 });
    expect(a.decision).not.toBe('rejected');
    expect(b.decision).toBe('rejected');
  });
});
