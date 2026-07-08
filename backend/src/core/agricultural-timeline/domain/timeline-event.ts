export const TIMELINE_EVENT_TYPES = {
  FORM_SUBMITTED: 'FORM_SUBMITTED',
  FORM_APPROVED: 'FORM_APPROVED',
  PRODUCER_CREATED: 'PRODUCER_CREATED',
  FARM_CREATED: 'FARM_CREATED',
  LOT_CREATED: 'LOT_CREATED',
  VISIT: 'VISIT',
  PHOTO: 'PHOTO',
  DOCUMENT: 'DOCUMENT',
  ANALYTICS: 'ANALYTICS',
  CUSTOM: 'CUSTOM',
} as const;

export type TimelineEventType =
  (typeof TIMELINE_EVENT_TYPES)[keyof typeof TIMELINE_EVENT_TYPES];

export const TIMELINE_SOURCES = {
  FORMS: 'FORMS',
  EVENTS: 'EVENTS',
  ANALYTICS: 'ANALYTICS',
} as const;

export type TimelineSource =
  (typeof TIMELINE_SOURCES)[keyof typeof TIMELINE_SOURCES];

export type TimelineImportance = 'low' | 'normal' | 'high';

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string | null;
  entityId: string;
  entityType: string;
  organizationId: string;
  eventType: TimelineEventType;
  source: TimelineSource;
  importance: TimelineImportance;
  icon: string | null;
  metadata: Record<string, unknown>;
}

export interface TimelineGroup {
  year: number;
  items: TimelineItem[];
}

export interface TimelineResponse {
  years: TimelineGroup[];
  items: TimelineItem[];
  totalItems: number;
}

export interface TimelineQueryContext {
  organizationId: string;
  entityType: string;
  entityId: string;
  aggregateType: string;
}

export interface TimelineFilter {
  from?: Date;
  to?: Date;
  types?: TimelineEventType[];
  limit?: number;
}
