import { apiRequest } from './client';

export interface Producer {
  id: string;
  organizationId: string;
  producerNumber: string;
  producerTypeCode: string;
  legalName: string;
  commercialName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  documentTypeCode: string;
  documentNumber: string;
  taxId?: string | null;
  birthDate?: string | null;
  lifecycleStatus: string;
  categoryCode?: string | null;
  leadSourceCode?: string | null;
  yearsExperience?: number | null;
  photoContentId?: string | null;
  signatureContentId?: string | null;
  municipalityCode?: string | null;
  veredaCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  assignedBuyerId?: string | null;
  assignedTechnicianId?: string | null;
  riskScore: number;
  qualityScore: number;
  lifetimeValueScore?: number | null;
  notes?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  registeredAt: string;
  activatedAt?: string | null;
  lastActivityAt?: string | null;
  lastVisitAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contacts?: ProducerContact[];
  addresses?: ProducerAddress[];
  certifications?: ProducerCertification[];
  documents?: ProducerDocument[];
  producerNotes?: ProducerNote[];
  farmLinks?: ProducerFarmLink[];
  territoryLinks?: ProducerTerritoryLink[];
  lifecycleEvents?: ProducerLifecycleEvent[];
}

export interface ProducerContact {
  id: string;
  contactTypeCode: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
}

export interface ProducerAddress {
  id: string;
  addressTypeCode: string;
  line1: string;
  line2?: string | null;
  municipalityCode?: string | null;
  veredaCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
}

export interface ProducerCertification {
  id: string;
  schemeCode: string;
  certificateNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  status: string;
}

export interface ProducerDocument {
  id: string;
  documentTypeCode: string;
  contentId: string;
  title: string;
  description?: string | null;
}

export interface ProducerNote {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface ProducerFarmLink {
  id: string;
  farmResourceId: string;
  roleCode: string;
  isPrimary: boolean;
}

export interface ProducerTerritoryLink {
  id: string;
  farmUnitId: string;
  relationshipType: string;
  isPrimary: boolean;
  farmUnit?: {
    id: string;
    farmCode: string;
    farmName: string;
    status: string;
    totalAreaHa?: number | null;
    municipalityCode?: string | null;
  };
}

export interface ProducerLifecycleEvent {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  occurredAt: string;
}

export interface ProducerListResponse {
  items: Producer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProducerDashboard {
  kpis: {
    total: number;
    active: number;
    pendingApproval: number;
    suspended: number;
    recentActivations: number;
    expiringCertifications: number;
    avgQualityScore: number;
    avgRiskScore: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byMunicipality: Array<{ municipalityCode: string | null; count: number }>;
}

export interface TimelineItem {
  type: string;
  id: string;
  occurredAt: string;
  title: string;
  detail?: string | null;
  actorId?: string | null;
}

export interface ProducerFilters {
  lifecycleStatus?: string;
  municipalityCode?: string;
  veredaCode?: string;
  assignedBuyerId?: string;
  assignedTechnicianId?: string;
  segmentId?: string;
  categoryCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type CreateProducerPayload = Partial<Producer> & {
  producerTypeCode: string;
  legalName: string;
  documentTypeCode: string;
  documentNumber: string;
};

function buildQuery(filters: ProducerFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function listProducers(filters?: ProducerFilters) {
  return apiRequest<ProducerListResponse>(`/prm/producers${buildQuery(filters)}`);
}

export function getProducer(id: string) {
  return apiRequest<Producer>(`/prm/producers/${id}`);
}

export function createProducer(data: CreateProducerPayload) {
  return apiRequest<Producer>('/prm/producers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateProducer(id: string, data: Partial<CreateProducerPayload> & { version?: number }) {
  return apiRequest<Producer>(`/prm/producers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProducer(id: string) {
  return apiRequest<Producer>(`/prm/producers/${id}`, { method: 'DELETE' });
}

export function checkDuplicate(documentNumber: string, excludeId?: string) {
  const params = new URLSearchParams({ documentNumber });
  if (excludeId) params.set('excludeId', excludeId);
  return apiRequest<{ duplicate: boolean; existing?: Producer }>(
    `/prm/producers/check-duplicate?${params}`,
  );
}

export function getProducerDashboard() {
  return apiRequest<ProducerDashboard>('/prm/producers/dashboard');
}

export function getProducerMap(filters?: ProducerFilters) {
  return apiRequest<{ items: Array<{
    id: string;
    producerNumber: string;
    legalName: string;
    lifecycleStatus: string;
    municipalityCode?: string;
    latitude: number;
    longitude: number;
    qualityScore: number;
  }> }>(`/prm/producers/map${buildQuery(filters)}`);
}

export function getProducerTimeline(id: string) {
  return apiRequest<{ items: TimelineItem[] }>(`/prm/producers/${id}/timeline`);
}

export function getProducer360(id: string) {
  return apiRequest<Record<string, unknown>>(`/prm/producers/${id}/360`);
}

export function transitionLifecycle(
  id: string,
  data: { toStatus: string; reasonCode?: string; reasonNotes?: string },
) {
  return apiRequest<Producer>(`/prm/producers/${id}/lifecycle`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addProducerContact(id: string, data: Partial<ProducerContact>) {
  return apiRequest<ProducerContact>(`/prm/producers/${id}/contacts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addProducerAddress(id: string, data: Partial<ProducerAddress>) {
  return apiRequest<ProducerAddress>(`/prm/producers/${id}/addresses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addProducerNote(id: string, content: string) {
  return apiRequest<ProducerNote>(`/prm/producers/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function addProducerDocument(
  id: string,
  data: {
    title: string;
    documentTypeCode: string;
    contentId: string;
    description?: string;
  },
) {
  return apiRequest<ProducerDocument>(`/prm/producers/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function assignProducer(
  id: string,
  data: { assignmentType: string; assigneeId: string; reason?: string },
) {
  return apiRequest<unknown>(`/prm/producers/${id}/assignments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function exportProducers(filters?: ProducerFilters) {
  return apiRequest<{ csv: string; count: number }>(
    `/prm/producers/export${buildQuery(filters)}`,
  );
}

export function listSegments() {
  return apiRequest<Array<{ id: string; name: string; slug: string; memberCount: number }>>(
    '/prm/segments',
  );
}
