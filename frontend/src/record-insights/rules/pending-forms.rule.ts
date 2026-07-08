import type { InsightRule } from '../contracts/insight-rule';
import type { UreFormLink, UreRecordExplorerResponse } from '../../record-explorer/types';

/** Status values treated as pending until the API exposes `pendingForms` explicitly. */
const PENDING_FORM_STATUSES = new Set([
  'pending',
  'draft',
  'in_progress',
  'in_review',
  'submitted',
]);

/**
 * Resolves pending forms from `record.pendingForms` when available,
 * otherwise infers from `record.forms[].status`.
 */
export function resolvePendingForms(record: UreRecordExplorerResponse): UreFormLink[] {
  if (record.pendingForms?.length) {
    return record.pendingForms;
  }
  return record.forms.filter(
    (form) => form.status && PENDING_FORM_STATUSES.has(form.status.toLowerCase()),
  );
}

export const pendingFormsRule: InsightRule = {
  id: 'pending-forms',
  evaluate(record) {
    const pending = resolvePendingForms(record);
    if (pending.length === 0) return [];
    return [
      {
        id: 'pending-forms',
        severity: 'info',
        title: 'Formularios',
        description: 'Tiene formularios pendientes.',
        actionLabel: 'Ver formularios',
        actionRoute: '#ure-forms',
      },
    ];
  },
};
