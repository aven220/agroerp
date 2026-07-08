/** URE — Universal Record Explorer (frontend types, mirrors @agroerp/shared/ure) */

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
  /** Reserved for future API support; rules fall back to forms[].status. */
  pendingForms?: UreFormLink[];
  relationships: UreRelationship[];
  documents: UreDocument[];
  photos: UrePhoto[];
  analytics: UreAnalyticsMetric[];
  events: UreTimelineItem[];
  quickActions: UreQuickAction[];
}

export type UreSectionId =
  | 'info'
  | 'activity'
  | 'forms'
  | 'relationships'
  | 'documents'
  | 'photos'
  | 'analytics';

export interface UreNavSection {
  id: UreSectionId;
  label: string;
  anchor: string;
}

export const URE_NAV_SECTIONS: UreNavSection[] = [
  { id: 'info', label: 'Información', anchor: 'ure-info' },
  { id: 'activity', label: 'Actividad', anchor: 'ure-activity' },
  { id: 'forms', label: 'Formularios', anchor: 'ure-forms' },
  { id: 'relationships', label: 'Relaciones', anchor: 'ure-relationships' },
  { id: 'documents', label: 'Documentos', anchor: 'ure-documents' },
  { id: 'photos', label: 'Fotos', anchor: 'ure-photos' },
  { id: 'analytics', label: 'Analytics', anchor: 'ure-analytics' },
];
