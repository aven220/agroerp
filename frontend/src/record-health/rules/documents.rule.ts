import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';

const WEIGHT = 10;

export const documentsRule: HealthRule = {
  id: 'documents',
  evaluate(record) {
    const passed = record.documents.length > 0;
    return buildHealthCheck({
      id: 'documents',
      title: 'Documentos',
      description: passed
        ? 'El registro tiene documentos asociados.'
        : 'El registro no tiene documentos.',
      passed,
      weight: WEIGHT,
    });
  },
};
