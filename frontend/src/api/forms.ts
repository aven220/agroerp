import { apiRequest } from './client';

export interface FormLocationSettings {
  enabled?: boolean;
  required?: boolean;
  accuracy?: number;
}

export interface FormMediaSettings {
  allowPhotos?: boolean;
  multiplePhotos?: boolean;
  allowFiles?: boolean;
}

export interface FormCatalogRequirement {
  catalogKey: string;
  source?: 'builtin' | 'api' | 'remote' | string;
  offline?: boolean;
}

export interface FormCaptureMetadata {
  processingType?: string;
  requiredCatalogKeys?: string[];
  catalogRequirements?: FormCatalogRequirement[];
  entityMapping?: FormEntityMapping;
}

export const DATA_PROVIDER_TYPES = {
  MANUAL: 'MANUAL',
  STATIC_LIST: 'STATIC_LIST',
  ERP_CATALOG: 'ERP_CATALOG',
  ERP_ENTITY: 'ERP_ENTITY',
  DEPENDENT: 'DEPENDENT',
  FORM_RESULT: 'FORM_RESULT',
  EXTERNAL_API: 'EXTERNAL_API',
} as const;

export type DataProviderType = (typeof DATA_PROVIDER_TYPES)[keyof typeof DATA_PROVIDER_TYPES];

export interface FieldDataProvider {
  type: DataProviderType;
  catalogKey?: string;
  entityType?: string;
  entityField?: string;
  dependsOnField?: string;
  dependsOnCatalog?: string;
  apiUrl?: string;
  valueField?: string;
  labelField?: string;
  sourceFieldKey?: string;
  staticOptions?: Array<{ value: string; label: string }>;
}

export interface FormFieldEntityMapping {
  fieldKey: string;
  entityType: string;
  entityProperty: string;
}

export interface FormEntityMapping {
  targetEntity: string;
  mappings: FormFieldEntityMapping[];
}

export interface FormUcemFieldOrigin {
  fieldKey: string;
  label: string;
  dataProviderType: DataProviderType;
  catalogKey?: string;
  dependencies?: string[];
  entityProperty?: string;
  entityType?: string;
}

export interface FormUcemPreview {
  entityMapping?: FormEntityMapping;
  universalCatalogs: Array<{
    catalogKey: string;
    displayName: string;
    domain: string;
    offlineCapable: boolean;
    dependencies?: string[];
    version: string;
  }>;
  fieldOrigins: FormUcemFieldOrigin[];
}

export interface FormFieldDefinition {
  key: string;
  type: string;
  label: string;
  description?: string;
  sectionKey?: string;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  visibleWhen?: unknown;
  requiredWhen?: unknown;
  readOnlyWhen?: unknown;
  relationTo?: string;
  apiSource?: { url: string; valueField: string; labelField: string };
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    maxAccuracyMeters?: number;
  };
  calculate?: { expression: string; dependsOn: string[] };
  fields?: FormFieldDefinition[];
  matrix?: { rows: string[]; columns: string[] };
  metadata?: Record<string, unknown>;
  dataProvider?: FieldDataProvider;
}

export type FormLayoutNodeType =
  | 'section'
  | 'accordion'
  | 'tabs'
  | 'tab'
  | 'repeat_group'
  | 'matrix'
  | 'field';

export type FormLayoutChild = string | FormLayoutNode;

export interface FormLayoutNodeBase {
  key: string;
  title?: string;
  description?: string;
}

export interface FormLayoutSectionNode extends FormLayoutNodeBase {
  type: 'section' | 'accordion';
  children: FormLayoutChild[];
}

export interface FormLayoutTabNode extends FormLayoutNodeBase {
  type: 'tab';
  children: FormLayoutChild[];
}

export interface FormLayoutTabsNode extends FormLayoutNodeBase {
  type: 'tabs';
  children: FormLayoutTabNode[];
}

export interface FormLayoutRepeatGroupNode extends FormLayoutNodeBase {
  type: 'repeat_group';
  min?: number;
  max?: number;
  children?: FormLayoutChild[];
}

export type FormMatrixResponseType = 'select' | 'radio' | 'number' | 'text' | 'checkbox';

export interface FormLayoutMatrixNode extends FormLayoutNodeBase {
  type: 'matrix';
  rows: string[];
  columns: Array<{ value: string; label: string }>;
  responseType?: FormMatrixResponseType;
}

export interface FormLayoutFieldNode extends FormLayoutNodeBase {
  type: 'field';
}

export type FormLayoutNode =
  | FormLayoutSectionNode
  | FormLayoutTabsNode
  | FormLayoutTabNode
  | FormLayoutRepeatGroupNode
  | FormLayoutMatrixNode
  | FormLayoutFieldNode;

export interface FormDefinitionSchema {
  version: number;
  fields: FormFieldDefinition[];
  sections?: Array<{ key: string; title: string; description?: string }>;
  layout?: FormLayoutNode[];
  dataProviders?: Record<string, FieldDataProvider>;
  universalCatalogs?: FormUcemPreview['universalCatalogs'];
  settings?: {
    requireGps?: boolean;
    allowDraft?: boolean;
    offlineCapable?: boolean;
    allowOffline?: boolean;
    requiresSync?: boolean;
    layoutMode?: 'flat' | 'tabs' | 'accordion';
    location?: FormLocationSettings;
    media?: FormMediaSettings;
  };
}

export const FORM_FIELD_TYPES = [
  'text', 'textarea', 'number', 'integer', 'decimal', 'currency', 'boolean', 'checkbox', 'radio',
  'date', 'time', 'datetime', 'select', 'multi_select', 'autocomplete', 'geo', 'geo_polygon', 'map',
  'photo', 'video', 'audio', 'signature', 'barcode', 'qrcode', 'file', 'pdf', 'gallery', 'relation',
  'calculated', 'hidden', 'repeat_group', 'subform', 'matrix', 'scale', 'likert', 'rating', 'emoji',
  'heading', 'separator', 'html', 'markdown', 'hyperlink', 'button', 'indicator',
] as const;

export const UDFE_LAYOUT_FIELD_TYPES = [
  'heading', 'separator', 'html', 'markdown', 'hyperlink', 'button', 'indicator', 'hidden',
] as const;

export interface FormDefinition {
  id: string;
  formKey: string;
  name: string;
  description?: string | null;
  version: number;
  schema: FormDefinitionSchema;
  status: string;
  sectorCode?: string | null;
  tags?: string[];
  metadata?: FormCaptureMetadata | Record<string, unknown>;
  publishedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formVersion: number;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
  deviceInfo?: Record<string, unknown> | null;
  status: string;
  syncStatus: string;
  createdAt: string;
  gpsLocation?: { lat: number; lng: number; accuracy?: number } | null;
  form?: { formKey: string; name: string; version: number };
}

export interface FormDashboard {
  kpis: {
    totalForms: number;
    publishedForms: number;
    draftForms: number;
    inReviewForms: number;
    totalSubmissions: number;
    pendingSync: number;
    totalAssignments: number;
    pendingAssignments: number;
    submissionRatePct: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  topForms: Array<{ formId: string; formKey?: string; name?: string; submissions: number }>;
}

export interface FormRenderPayload {
  schemaVersion: number;
  settings?: FormDefinitionSchema['settings'];
  fields: Array<FormFieldDefinition & { visible: boolean; effectiveRequired: boolean }>;
  resolvedData: Record<string, unknown>;
}

export interface RenderedForm {
  formId: string;
  formKey: string;
  name: string;
  version: number;
  status: string;
  render: FormRenderPayload;
  metadata?: FormCaptureMetadata | Record<string, unknown>;
  requiredCatalogKeys?: string[];
  fields: FormRenderPayload['fields'];
  resolvedData?: Record<string, unknown>;
  settings?: FormDefinitionSchema['settings'];
  schemaVersion?: number;
  ucem?: FormUcemPreview;
}

export function listForms(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const q = params.toString();
  return apiRequest<FormDefinition[]>(`/forms${q ? `?${q}` : ''}`);
}

export function getForm(id: string) {
  return apiRequest<FormDefinition>(`/forms/${id}`);
}

export function createForm(data: {
  formKey: string;
  name: string;
  description?: string;
  schema: FormDefinitionSchema;
  metadata?: Record<string, unknown>;
  requiredCatalogKeys?: string[];
}) {
  return apiRequest<FormDefinition>('/forms', { method: 'POST', body: JSON.stringify(data) });
}

export function updateForm(
  id: string,
  data: {
    name?: string;
    description?: string;
    schema?: FormDefinitionSchema;
    metadata?: Record<string, unknown>;
    requiredCatalogKeys?: string[];
  },
) {
  return apiRequest<FormDefinition>(`/forms/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function publishForm(id: string) {
  return apiRequest<FormDefinition>(`/forms/${id}/publish`, { method: 'POST' });
}

export function newFormVersion(formKey: string) {
  return apiRequest<FormDefinition>(`/forms/keys/${formKey}/versions`, { method: 'POST' });
}

export function renderForm(id: string, partialData?: Record<string, unknown>) {
  return apiRequest<RenderedForm>(`/forms/${id}/render`, {
    method: 'POST',
    body: JSON.stringify({ partialData }),
  });
}

export function submitForm(
  id: string,
  data: {
    data: Record<string, unknown>;
    context?: Record<string, unknown>;
    draft?: boolean;
    gpsLocation?: { lat: number; lng: number; accuracy?: number };
  },
) {
  return apiRequest<{ submission: FormSubmission }>(`/forms/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function listSubmissions(filters?: { formId?: string; formKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.formId) params.set('formId', filters.formId);
  if (filters?.formKey) params.set('formKey', filters.formKey);
  const q = params.toString();
  return apiRequest<FormSubmission[]>(`/form-submissions${q ? `?${q}` : ''}`);
}

export function getFormDashboard() {
  return apiRequest<FormDashboard>('/udfe/dashboard');
}

export interface BootstrapFormsPayload {
  syncedAt: string;
  forms: Array<Pick<FormDefinition, 'id' | 'formKey' | 'name' | 'version' | 'status' | 'schema' | 'publishedAt'>>;
}

/** Paquete que descargan los dispositivos Android al sincronizar. */
export function bootstrapForms() {
  return apiRequest<BootstrapFormsPayload>('/forms/bootstrap');
}

export function duplicateForm(id: string, newFormKey: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newFormKey }),
  });
}

export function archiveForm(id: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/archive`, { method: 'POST' });
}

export function deleteForm(id: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}`, { method: 'DELETE' });
}

export function unpublishForm(id: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/unpublish`, { method: 'POST' });
}

export function exportForm(id: string, format: 'json' | 'csv' = 'json') {
  return apiRequest<{ format: string; payload?: unknown; csv?: string }>(
    `/udfe/forms/${id}/export?format=${format}`,
  );
}

export function importForms(forms: unknown[], force?: boolean) {
  return apiRequest<unknown>('/udfe/import', {
    method: 'POST',
    body: JSON.stringify({ forms, force }),
  });
}

export function listTemplates(sectorCode?: string) {
  const q = sectorCode ? `?sectorCode=${sectorCode}` : '';
  return apiRequest<Array<{ id: string; templateKey: string; name: string; description?: string; schema: FormDefinitionSchema }>>(`/udfe/templates${q}`);
}

export function saveAsTemplate(data: {
  templateKey: string;
  name: string;
  description?: string;
  schema: FormDefinitionSchema;
  tags?: string[];
}) {
  return apiRequest<unknown>('/udfe/templates', { method: 'POST', body: JSON.stringify(data) });
}

export function instantiateTemplate(templateId: string, formKey: string, name?: string) {
  return apiRequest<FormDefinition>(`/udfe/templates/${templateId}/instantiate`, {
    method: 'POST',
    body: JSON.stringify({ formKey, name }),
  });
}

export interface FormVersionHistoryItem {
  id: string;
  version: number;
  status: string;
  createdAt: string;
  publishedAt?: string | null;
}

export function getFormVersionHistory(id: string) {
  return apiRequest<FormVersionHistoryItem[]>(`/udfe/forms/${id}/versions`);
}

export function submitFormForReview(id: string, reasonNotes?: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/submit-review`, {
    method: 'POST',
    body: JSON.stringify({ reasonNotes }),
  });
}

export function approveForm(id: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/approve`, { method: 'POST' });
}

export function rejectForm(id: string, reasonNotes?: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reasonNotes }),
  });
}

export function restoreForm(id: string) {
  return apiRequest<FormDefinition>(`/udfe/forms/${id}/restore`, { method: 'POST' });
}

export type FormsReportType = 'full' | 'catalog' | 'submissions';

export interface FormsReportDownload {
  type: FormsReportType;
  filename: string;
  csv: string;
  generatedAt: string;
  rowCount?: number;
}

export function downloadFormsReport(type: FormsReportType = 'full', formId?: string) {
  const params = new URLSearchParams({ type });
  if (formId) params.set('formId', formId);
  return apiRequest<FormsReportDownload>(`/udfe/reports/export/download?${params}`);
}

export function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv.startsWith('\uFEFF') ? csv : `\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveFormsReport(type: FormsReportType = 'full', formId?: string) {
  const result = await downloadFormsReport(type, formId);
  triggerCsvDownload(result.csv, result.filename);
  return result;
}

export async function saveFormSchemaExport(id: string, formKey: string, format: 'csv' | 'json' = 'csv') {
  const result = await exportForm(id, format);
  if (format === 'csv' && result.csv) {
    triggerCsvDownload(result.csv, `${formKey}-campos.csv`);
    return;
  }
  if (result.payload) {
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Campañas ───

export interface FormCampaign {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  formId: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  expectedCount?: number | null;
  metadata?: {
    zones?: string[];
    municipalities?: string[];
    farms?: string[];
    assigneeUserIds?: string[];
  };
  createdAt: string;
  updatedAt: string;
  form?: { id: string; formKey: string; name: string; version: number; status: string };
}

export interface FormCampaignStats {
  campaignId: string;
  code: string;
  expectedCount: number;
  collected: number;
  synced: number;
  pending: number;
  failed: number;
  withGps: number;
  progressPct: number | null;
}

export function listCampaigns(filters?: { status?: string; formId?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.formId) params.set('formId', filters.formId);
  if (filters?.search) params.set('search', filters.search);
  const q = params.toString();
  return apiRequest<FormCampaign[]>(`/udfe/campaigns${q ? `?${q}` : ''}`);
}

export function getCampaign(id: string) {
  return apiRequest<FormCampaign>(`/udfe/campaigns/${id}`);
}

export function getCampaignStats(id: string) {
  return apiRequest<FormCampaignStats>(`/udfe/campaigns/${id}/stats`);
}

export function createCampaign(data: {
  code: string;
  name: string;
  description?: string;
  formId: string;
  startsAt?: string;
  endsAt?: string;
  expectedCount?: number;
  metadata?: FormCampaign['metadata'];
}) {
  return apiRequest<FormCampaign>('/udfe/campaigns', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCampaign(id: string, data: Partial<Omit<FormCampaign, 'id' | 'form' | 'createdAt' | 'updatedAt'>>) {
  return apiRequest<FormCampaign>(`/udfe/campaigns/${id}`, { method: 'POST', body: JSON.stringify(data) });
}

export function activateCampaign(id: string) {
  return apiRequest<FormCampaign>(`/udfe/campaigns/${id}/activate`, { method: 'POST' });
}

export function closeCampaign(id: string) {
  return apiRequest<FormCampaign>(`/udfe/campaigns/${id}/close`, { method: 'POST' });
}

export function archiveCampaign(id: string) {
  return apiRequest<FormCampaign>(`/udfe/campaigns/${id}/archive`, { method: 'POST' });
}

// ─── Asignaciones ───

export interface FormAssignment {
  id: string;
  formId: string;
  assigneeType: string;
  assigneeId: string;
  status: string;
  dueAt?: string | null;
  assignedAt: string;
  completedAt?: string | null;
  form?: { id: string; formKey: string; name: string; version: number; status: string };
}

export function listAssignments(filters?: { assigneeId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters?.status) params.set('status', filters.status);
  const q = params.toString();
  return apiRequest<FormAssignment[]>(`/udfe/assignments${q ? `?${q}` : ''}`);
}

export function createAssignment(data: {
  formId: string;
  assigneeType: string;
  assigneeId: string;
  contextType?: string;
  contextId?: string;
  dueAt?: string;
}) {
  return apiRequest<FormAssignment>('/udfe/assignments', { method: 'POST', body: JSON.stringify(data) });
}

export function completeAssignment(id: string) {
  return apiRequest<FormAssignment>(`/udfe/assignments/${id}/complete`, { method: 'POST' });
}

// ─── Informes / Centro de datos ───

export function runFormReport(reportCode: string, formId?: string) {
  const params = new URLSearchParams();
  if (formId) params.set('formId', formId);
  const q = params.toString();
  return apiRequest<Record<string, unknown>>(`/udfe/reports/${reportCode}${q ? `?${q}` : ''}`);
}

export function getSubmission(id: string) {
  return apiRequest<FormSubmission & { form?: FormDefinition }>(`/form-submissions/${id}`);
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadGeoJsonFromSubmissions(
  submissions: FormSubmission[],
  filename = 'recoleccion.geojson',
) {
  const features = submissions
    .filter((s) => s.data && typeof s.data === 'object')
    .map((s) => {
      const gps = (s as FormSubmission & { gpsLocation?: { lat?: number; lng?: number } }).gpsLocation
        ?? extractGpsFromData(s.data);
      if (!gps?.lat || !gps?.lng) return null;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [gps.lng, gps.lat] },
        properties: {
          submissionId: s.id,
          formId: s.formId,
          formKey: s.form?.formKey,
          status: s.status,
          syncStatus: s.syncStatus,
          createdAt: s.createdAt,
          ...flattenDataForGeo(s.data),
        },
      };
    })
    .filter(Boolean);

  downloadJson({ type: 'FeatureCollection', features }, filename);
}

function extractGpsFromData(data: Record<string, unknown>): { lat?: number; lng?: number } | null {
  for (const v of Object.values(data)) {
    if (v && typeof v === 'object' && 'lat' in (v as object) && 'lng' in (v as object)) {
      return v as { lat: number; lng: number };
    }
  }
  return null;
}

function flattenDataForGeo(data: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v == null || typeof v === 'object') continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}
