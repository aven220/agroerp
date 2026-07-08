import type { InsightRule } from '../contracts/insight-rule';

export const missingPhotosRule: InsightRule = {
  id: 'missing-photos',
  evaluate(record) {
    if (record.photos.length > 0) return [];
    return [
      {
        id: 'missing-photos',
        severity: 'warning',
        title: 'Fotografías',
        description: 'No existen fotografías.',
        actionLabel: 'Ir a fotos',
        actionRoute: '#ure-photos',
      },
    ];
  },
};
