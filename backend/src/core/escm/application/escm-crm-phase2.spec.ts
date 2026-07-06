import {
  canTransitionStatus,
  mergeOfflineVisits,
} from '../domain/escm-customer.engine';
import {
  mergeOfflineOpportunityUpdates,
  resolveOpportunityStatus,
  validateOpportunityInput,
} from '../domain/escm-opportunity.engine';
import {
  canConvertQuotation,
  computeQuotationTotals,
} from '../domain/escm-quotation.engine';
import { canMoveToStage, computeWeightedValue } from '../domain/escm-pipeline.engine';
import { ESCM_DEFAULT_PIPELINE_STAGES } from '../domain/escm.catalogs';

describe('ESCM Phase 2 — full pipeline integration', () => {
  const stages = ESCM_DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s }));

  it('runs prospect → opportunity → quotation → order flow logic', () => {
    expect(validateOpportunityInput({ title: 'Venta café', estimatedValue: 5000000 })).toBeNull();
    expect(canMoveToStage(stages, 'prospect', 'proposal')).toBe(true);

    const probability = 55;
    const weighted = computeWeightedValue(5000000, probability);
    expect(weighted).toBe(2750000);

    const lines = [{ itemKey: 'CAF-PERG-001', quantity: 100, unitPrice: 12000, taxKey: 'iva_19' }];
    const totals = computeQuotationTotals(lines, 0);
    expect(totals.totalAmount).toBeGreaterThan(1000000);
    expect(canConvertQuotation('approved')).toBe(true);
  });

  it('merges offline opportunity updates without collision', () => {
    const merged = mergeOfflineOpportunityUpdates(
      [{ opportunityKey: 'OPP-1', updatedAt: '2026-01-01', stageKey: 'prospect' }],
      [{ opportunityKey: 'OPP-1', updatedAt: '2026-01-02', stageKey: 'qualified' }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].stageKey).toBe('qualified');
  });

  it('resolves won status from stage', () => {
    expect(resolveOpportunityStatus({ isWon: true })).toBe('won');
    expect(resolveOpportunityStatus({ isLost: true })).toBe('lost');
  });

  it('preserves phase 1 customer transitions', () => {
    expect(canTransitionStatus('prospect', 'active')).toBe(true);
    expect(mergeOfflineVisits([], [{ visitKey: 'V1', visitedAt: '2026-01-01' }])).toHaveLength(1);
  });
});
