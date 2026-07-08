import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';
import type { UreFormLink } from '../../record-explorer/types';

const WEIGHT = 20;

/** Status values treated as completed when explicit completion metadata is unavailable. */
const COMPLETED_FORM_STATUSES = new Set([
  'completed',
  'approved',
  'done',
  'closed',
  'validated',
]);

export function hasCompletedForms(forms: UreFormLink[]): boolean {
  if (!forms.length) return false;
  return forms.some(
    (form) => form.status && COMPLETED_FORM_STATUSES.has(form.status.toLowerCase()),
  );
}

export const completedFormsRule: HealthRule = {
  id: 'completed-forms',
  evaluate(record) {
    const passed = hasCompletedForms(record.forms);
    return buildHealthCheck({
      id: 'completed-forms',
      title: 'Formularios completos',
      description: passed
        ? 'El registro tiene formularios completados.'
        : 'El registro no tiene formularios completados.',
      passed,
      weight: WEIGHT,
    });
  },
};
