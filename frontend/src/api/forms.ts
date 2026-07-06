import { apiRequest } from './client';

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
  metadata?: Record<string, unknown>;
}

export interface FormDefinitionSchema {
  version: number;
  fields: FormFieldDefinition[];
  sections?: Array<{ key: string; title: string; description?: string }>;
  settings?: {
    requireGps?: boolean;
    allowDraft?: boolean;
    offlineCapable?: boolean;
    layoutMode?: 'flat' | 'tabs' | 'accordion';
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
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formVersion: number;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
  status: string;
  syncStatus: string;
  createdAt: string;
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

export interface RenderedForm {
  formId: string;
  formKey: string;
  name: string;
  version: number;
  status: string;
  fields: Array<FormFieldDefinition & { visible: boolean; effectiveRequired: boolean }>;
  resolvedData: Record<string, unknown>;
  settings?: FormDefinitionSchema['settings'];
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
}) {
  return apiRequest<FormDefinition>('/forms', { method: 'POST', body: JSON.stringify(data) });
}

export function updateForm(id: string, data: { name?: string; description?: string; schema?: FormDefinitionSchema }) {
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
