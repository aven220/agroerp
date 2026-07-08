import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';

const WEIGHT = 10;

export const photosRule: HealthRule = {
  id: 'photos',
  evaluate(record) {
    const passed = record.photos.length > 0;
    return buildHealthCheck({
      id: 'photos',
      title: 'Fotografías',
      description: passed
        ? 'El registro tiene fotografías asociadas.'
        : 'El registro no tiene fotografías.',
      passed,
      weight: WEIGHT,
    });
  },
};
