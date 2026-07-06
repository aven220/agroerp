export type EscmPipelineStageDef = {
  stageKey: string;
  name: string;
  sortOrder: number;
  defaultProbability: number;
  isClosed?: boolean;
  isWon?: boolean;
  isLost?: boolean;
  isArchived?: boolean;
  color?: string;
};

export function canMoveToStage(
  stages: EscmPipelineStageDef[],
  fromKey: string,
  toKey: string,
): boolean {
  const from = stages.find((s) => s.stageKey === fromKey);
  const to = stages.find((s) => s.stageKey === toKey);
  if (!from || !to) return false;
  if (from.isArchived) return false;
  if (from.isWon || from.isLost) return Boolean(to.isArchived);
  return true;
}

export function resolveStageProbability(
  stages: EscmPipelineStageDef[],
  stageKey: string,
  override?: number,
): number {
  if (override != null && override >= 0 && override <= 100) return override;
  const stage = stages.find((s) => s.stageKey === stageKey);
  return stage?.defaultProbability ?? 0;
}

export function computeWeightedValue(estimatedValue: number, probability: number): number {
  return Number(((estimatedValue * probability) / 100).toFixed(2));
}

export function pipelineBoard<T extends { stageKey: string }>(
  stages: EscmPipelineStageDef[],
  opportunities: T[],
): Record<string, T[]> {
  const board: Record<string, T[]> = {};
  for (const s of stages) board[s.stageKey] = [];
  for (const opp of opportunities) {
    if (!board[opp.stageKey]) board[opp.stageKey] = [];
    board[opp.stageKey].push(opp);
  }
  return board;
}
