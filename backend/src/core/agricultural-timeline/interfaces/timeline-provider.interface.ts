import type { TimelineItem, TimelineQueryContext } from '../domain/timeline-event';

export interface TimelineProvider {
  readonly key: string;

  fetch(context: TimelineQueryContext): Promise<TimelineItem[]>;
}

export const TIMELINE_PROVIDERS = Symbol('TIMELINE_PROVIDERS');
