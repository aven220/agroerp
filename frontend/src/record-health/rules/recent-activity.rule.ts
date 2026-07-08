import { buildHealthCheck, type HealthRule } from '../contracts/health-rule';
import type { UreTimelineItem } from '../../record-explorer/types';

const WEIGHT = 20;
const RECENT_ACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns the latest valid event date or null when events/dates are unavailable.
 */
export function resolveLatestEventDate(events: UreTimelineItem[]): Date | null {
  if (!events.length) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  const latest = new Date(sorted[0].occurredAt);
  return Number.isNaN(latest.getTime()) ? null : latest;
}

export const recentActivityRule: HealthRule = {
  id: 'recent-activity',
  evaluate(record) {
    const latestEventDate = resolveLatestEventDate(record.events);
    const passed =
      latestEventDate !== null &&
      Date.now() - latestEventDate.getTime() <= RECENT_ACTIVITY_MS;

    return buildHealthCheck({
      id: 'recent-activity',
      title: 'Actividad reciente',
      description: passed
        ? 'El registro tiene actividad en los últimos 30 días.'
        : 'El registro no tiene actividad reciente (< 30 días).',
      passed,
      weight: WEIGHT,
    });
  },
};
