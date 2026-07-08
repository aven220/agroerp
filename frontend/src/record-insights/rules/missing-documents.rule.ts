import type { InsightRule } from '../contracts/insight-rule';

export const missingDocumentsRule: InsightRule = {
  id: 'missing-documents',
  evaluate(record) {
    if (record.documents.length > 0) return [];
    return [
      {
        id: 'missing-documents',
        severity: 'warning',
        title: 'Documentos',
        description: 'No existen documentos asociados.',
        actionLabel: 'Ir a documentos',
        actionRoute: '#ure-documents',
      },
    ];
  },
};
