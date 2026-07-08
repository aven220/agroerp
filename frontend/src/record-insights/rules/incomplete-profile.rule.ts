import type { InsightRule } from '../contracts/insight-rule';

function readEntityStatus(entity: Record<string, unknown>): string | null {
  const status = entity.status;
  if (typeof status === 'string' && status.trim()) return status;
  return null;
}

export const incompleteProfileRule: InsightRule = {
  id: 'incomplete-profile',
  evaluate(record) {
    const status = readEntityStatus(record.entity);
    if (!status || status.toUpperCase() !== 'INCOMPLETE') return [];

    return [
      {
        id: 'incomplete-profile',
        severity: 'error',
        title: 'Perfil',
        description: 'Perfil incompleto.',
      },
    ];
  },
};
