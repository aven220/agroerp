import type { InsightRule } from '../contracts/insight-rule';
import type { UreTimelineItem } from '../../record-explorer/types';

const INACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns the most recent event date when `occurredAt` is a valid ISO timestamp.
 * If events are empty or dates are invalid, returns null (rule is skipped safely).
 */
export function resolveLatestEventDate(events: UreTimelineItem[]): Date | null {
  if (!events.length) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const latest = new Date(sorted[0].occurredAt);
  return Number.isNaN(latest.getTime()) ? null : latest;
}

export const inactiveRecordRule: InsightRule = {
  id: 'inactive-record',
  evaluate(record) {
    const latestEventDate = resolveLatestEventDate(record.events);
    if (!latestEventDate) return [];

    const elapsed = Date.now() - latestEventDate.getTime();
    if (elapsed <= INACTIVE_THRESHOLD_MS) return [];

    return [
      {
        id: 'inactive-record',
        severity: 'warning',
        title: 'Actividad',
        description: 'Registro sin actividad reciente.',
        actionLabel: 'Ver actividad',
        actionRoute: '#ure-activity',
      },
    ];
  },
};
