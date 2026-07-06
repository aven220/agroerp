import {
  canMoveToStage,
  computeWeightedValue,
  pipelineBoard,
  resolveStageProbability,
} from '../domain/escm-pipeline.engine';
import { ESCM_DEFAULT_PIPELINE_STAGES } from '../domain/escm.catalogs';

describe('ESCM Pipeline Engine', () => {
  const stages = ESCM_DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s }));

  it('defines default pipeline stages', () => {
    expect(stages.some((s) => s.stageKey === 'negotiation')).toBe(true);
    expect(stages.some((s) => s.isWon)).toBe(true);
    expect(stages.some((s) => s.isLost)).toBe(true);
  });

  it('allows forward stage moves', () => {
    expect(canMoveToStage(stages, 'prospect', 'qualified')).toBe(true);
    expect(canMoveToStage(stages, 'negotiation', 'won')).toBe(true);
  });

  it('blocks invalid transitions from closed won', () => {
    expect(canMoveToStage(stages, 'won', 'negotiation')).toBe(false);
    expect(canMoveToStage(stages, 'won', 'archived')).toBe(true);
  });

  it('computes weighted value', () => {
    expect(computeWeightedValue(1000000, 70)).toBe(700000);
  });

  it('builds pipeline board', () => {
    const board = pipelineBoard(stages, [
      { stageKey: 'prospect', opportunityKey: 'O1' },
      { stageKey: 'prospect', opportunityKey: 'O2' },
      { stageKey: 'won', opportunityKey: 'O3' },
    ]);
    expect(board.prospect).toHaveLength(2);
    expect(board.won).toHaveLength(1);
  });

  it('resolves stage probability with override', () => {
    expect(resolveStageProbability(stages, 'proposal', 80)).toBe(80);
    expect(resolveStageProbability(stages, 'proposal')).toBe(55);
  });
});
