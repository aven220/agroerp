import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';

const WEIGHT = 20;

export const relationshipsRule: HealthRule = {
  id: 'relationships',
  evaluate(record) {
    const passed = record.relationships.length > 0;
    return buildHealthCheck({
      id: 'relationships',
      title: 'Relaciones ERP',
      description: passed
        ? 'El registro tiene relaciones ERP vinculadas.'
        : 'El registro no tiene relaciones ERP.',
      passed,
      weight: WEIGHT,
    });
  },
};
