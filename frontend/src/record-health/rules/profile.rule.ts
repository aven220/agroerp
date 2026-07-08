import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';

const WEIGHT = 10;

function readEntityStatus(entity: Record<string, unknown>): string | null {
  const status = entity.status;
  if (typeof status === 'string' && status.trim()) return status;
  return null;
}

export const profileRule: HealthRule = {
  id: 'profile',
  evaluate(record) {
    const status = readEntityStatus(record.entity);
    const passed = !status || status.toUpperCase() !== 'INCOMPLETE';

    return buildHealthCheck({
      id: 'profile',
      title: 'Perfil completo',
      description: passed
        ? 'El perfil del registro está completo.'
        : 'El perfil del registro está incompleto.',
      passed,
      weight: WEIGHT,
    });
  },
};
