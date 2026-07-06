import { apiRequest } from './client';

export interface FarmUnit {
  id: string;
  farmCode: string;
  farmName: string;
  farmTypeCode: string;
  municipalityCode?: string | null;
  veredaCode?: string | null;
  totalAreaHa?: number | null;
  agriculturalAreaHa?: number | null;
  forestAreaHa?: number | null;
  status: string;
  geometryConfidence?: string | null;
  centroidLatitude?: number | null;
  centroidLongitude?: number | null;
  boundaryGeo?: Record<string, unknown> | null;
  tenureTypeCode?: string | null;
  observations?: string | null;
  version: number;
  lastVisitAt?: string | null;
  activatedAt?: string | null;
  producerLinks?: Array<{
    id: string;
    producerId: string;
    relationshipType: string;
    isPrimary: boolean;
    producer?: { id: string; legalName: string; producerNumber: string };
  }>;
  lots?: FarmLot[];
  parcels?: unknown[];
  certifications?: unknown[];
  documents?: TerritoryDocument[];
  digitalTwin?: FarmDigitalTwin;
}

export interface FarmLot {
  id: string;
  lotCode: string;
  lotName?: string | null;
  areaHa?: number | null;
  status: string;
  cropStands?: CropStand[];
  fieldLotProfile?: { id: string } | null;
}

export interface CropStand {
  id: string;
  speciesCode: string;
  varietyCodes: string[];
  densityPlantsHa?: number | null;
  estimatedYieldKgHa?: number | null;
  status: string;
}

export interface TerritoryDocument {
  id: string;
  documentTypeCode: string;
  contentId: string;
  title: string;
  mediaType?: string | null;
  status: string;
}

export interface FarmDigitalTwin {
  lotCount: number;
  activeCropStandCount: number;
  productionYtdKg?: number | null;
  avgYieldKgHa?: number | null;
  documentCompletenessPct: number;
  riskFlags: string[];
  thematicIndicators: Record<string, unknown>;
  aiProjection: Record<string, unknown>;
}

export interface FarmListResponse {
  items: FarmUnit[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface FarmDashboard {
  kpis: {
    total: number;
    active: number;
    georeferenced: number;
    georefRatePct: number;
    avgTotalAreaHa: number;
    totalAgriculturalAreaHa: number;
    pendingValidation: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byMunicipality: Array<{ municipalityCode: string | null; count: number }>;
}

export interface FarmFilters {
  status?: string;
  municipalityCode?: string;
  producerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQuery(filters: FarmFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function listFarms(filters?: FarmFilters) {
  return apiRequest<FarmListResponse>(`/ftip/farms${buildQuery(filters)}`);
}

export function getFarm(id: string) {
  return apiRequest<FarmUnit>(`/ftip/farms/${id}`);
}

export function createFarm(data: Record<string, unknown>) {
  return apiRequest<FarmUnit>('/ftip/farms', { method: 'POST', body: JSON.stringify(data) });
}

export function updateFarm(id: string, data: Record<string, unknown>) {
  return apiRequest<FarmUnit>(`/ftip/farms/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteFarm(id: string) {
  return apiRequest<FarmUnit>(`/ftip/farms/${id}`, { method: 'DELETE' });
}

export function getFarmTwin(id: string) {
  return apiRequest<{ profile: FarmUnit; twin: FarmDigitalTwin }>(`/ftip/farms/${id}/twin`);
}

export function getFarmTimeline(id: string) {
  return apiRequest<{ items: Array<{ type: string; id: string; occurredAt: string; title: string; detail?: string }> }>(
    `/ftip/farms/${id}/timeline`,
  );
}

export function getFarmDashboard() {
  return apiRequest<FarmDashboard>('/ftip/farms/dashboard');
}

export function getFarmMap(filters?: FarmFilters) {
  return apiRequest<{ items: Array<{
    id: string; farmCode: string; farmName: string; status: string;
    latitude: number; longitude: number; totalAreaHa?: number | null;
  }> }>(`/ftip/farms/map${buildQuery(filters)}`);
}

export function setFarmGeometry(
  id: string,
  data: { geometryGeo: Record<string, unknown>; reasonCode?: string; reasonNotes?: string },
) {
  return apiRequest<unknown>(`/ftip/farms/${id}/geometry`, { method: 'POST', body: JSON.stringify(data) });
}

export function transitionFarmLifecycle(id: string, data: { toStatus: string; reasonNotes?: string }) {
  return apiRequest<FarmUnit>(`/ftip/farms/${id}/lifecycle`, { method: 'POST', body: JSON.stringify(data) });
}

export function linkProducerToFarm(farmId: string, data: { producerId: string; relationshipType?: string; isPrimary?: boolean }) {
  return apiRequest<unknown>(`/ftip/farms/${farmId}/producers`, { method: 'POST', body: JSON.stringify(data) });
}

export function addFarmDocument(farmId: string, data: Record<string, unknown>) {
  return apiRequest<TerritoryDocument>(`/ftip/farms/${farmId}/documents`, { method: 'POST', body: JSON.stringify(data) });
}

export function addFarmLot(farmId: string, data: Record<string, unknown>) {
  return apiRequest<FarmLot>(`/ftip/farms/${farmId}/lots`, { method: 'POST', body: JSON.stringify(data) });
}

export function exportFarms(filters?: FarmFilters) {
  return apiRequest<{ csv: string; count: number }>(`/ftip/farms/export${buildQuery(filters)}`);
}

export function importFarms(items: Record<string, unknown>[]) {
  return apiRequest<{ imported: number; errors: string[] }>('/ftip/farms/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function runFtipReport(reportCode: string, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return apiRequest<unknown>(`/ftip/reports/${reportCode}${q}`);
}
