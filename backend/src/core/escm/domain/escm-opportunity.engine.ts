export type EscmOpportunityStatusValue = 'open' | 'won' | 'lost' | 'archived';

export function generateOpportunityKey(seq: number): string {
  return `OPP-${String(seq).padStart(6, '0')}`;
}

export function generateProspectKey(seq: number): string {
  return `PRO-${String(seq).padStart(6, '0')}`;
}

export function generateInteractionKey(prefix: string): string {
  return `INT-${prefix}-${Date.now()}`.slice(0, 120);
}

export function generateActivityKey(prefix: string): string {
  return `ACT-${prefix}-${Date.now()}`.slice(0, 120);
}

export function resolveOpportunityStatus(
  stage: { isWon?: boolean; isLost?: boolean; isArchived?: boolean },
): EscmOpportunityStatusValue {
  if (stage.isWon) return 'won';
  if (stage.isLost) return 'lost';
  if (stage.isArchived) return 'archived';
  return 'open';
}

export function validateOpportunityInput(input: {
  title?: string;
  estimatedValue?: number;
  probability?: number;
}): string | null {
  if (!input.title?.trim()) return 'Título requerido';
  if (input.estimatedValue != null && input.estimatedValue < 0) return 'Valor estimado inválido';
  if (input.probability != null && (input.probability < 0 || input.probability > 100)) {
    return 'Probabilidad debe estar entre 0 y 100';
  }
  return null;
}

export function mergeOfflineOpportunityUpdates<T extends { opportunityKey: string; updatedAt: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const map = new Map(existing.map((o) => [o.opportunityKey, o]));
  for (const row of incoming) {
    const prev = map.get(row.opportunityKey);
    if (!prev || row.updatedAt > prev.updatedAt) map.set(row.opportunityKey, row);
  }
  return [...map.values()];
}
