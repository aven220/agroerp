/** URE — Universal Record Explorer Foundation */

export const URE_ENTITY_TYPES = ['Producer', 'Farm', 'Lot'] as const;
export type UreEntityType = (typeof URE_ENTITY_TYPES)[number];

export interface UreRecordSummary {
  entityType: string;
  recordId: string;
  title: string;
  subtitle?: string;
  status?: string;
  badges?: string[];
  kpis?: Array<{ label: string; value: string | number; trend?: string }>;
}

export interface UreTimelineItem {
  id: string;
  type: string;
  occurredAt: string;
  title: string;
  detail?: string | null;
  actorId?: string | null;
}

export interface UreRelationship {
  id: string;
  entityType: string;
  label: string;
  href?: string;
  meta?: Record<string, unknown>;
}

export interface UreDocument {
  id: string;
  title?: string | null;
  documentTypeCode?: string | null;
  mediaType?: string | null;
  contentId?: string | null;
  createdAt?: string;
}

export interface UrePhoto {
  id: string;
  title?: string | null;
  contentId?: string | null;
  url?: string | null;
  capturedAt?: string | null;
}

export interface UreFormLink {
  id: string;
  formId?: string;
  formKey?: string;
  name?: string;
  status?: string;
  submittedAt?: string;
}

export interface UreAnalyticsMetric {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
}

export interface UreQuickAction {
  id: string;
  label: string;
  action: string;
  href?: string;
  variant?: 'primary' | 'default' | 'danger';
}

export interface UreRecordExplorerResponse {
  summary: UreRecordSummary;
  entity: Record<string, unknown>;
  forms: UreFormLink[];
  relationships: UreRelationship[];
  documents: UreDocument[];
  photos: UrePhoto[];
  analytics: UreAnalyticsMetric[];
  events: UreTimelineItem[];
  quickActions: UreQuickAction[];
}
