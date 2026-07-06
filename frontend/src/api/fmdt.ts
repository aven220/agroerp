import { apiRequest } from './client';

export interface FieldLotProfile {
  id: string;
  lotCode: string;
  lotName: string;
  status: string;
  lotTypeCode: string;
  ftipLotUnitId: string;
  farmUnitId: string;
  totalAreaHa?: number | null;
  cultivableAreaHa?: number | null;
  plantedAreaHa?: number | null;
  centroidLatitude?: number | null;
  centroidLongitude?: number | null;
  boundaryGeoRef?: Record<string, unknown> | null;
  responsibleProducerId?: string | null;
  observations?: string | null;
  version: number;
  farmUnit?: { farmCode: string; farmName: string; municipalityCode?: string | null };
  responsibleProducer?: { id: string; legalName: string; producerNumber?: string };
  digitalTwin?: LotDigitalTwin;
  agronomicStates?: LotAgronomicState[];
  operations?: FieldOperation[];
  costEntries?: LotCostEntry[];
  harvestRecords?: HarvestRecord[];
  documents?: LotDocument[];
}

export interface LotAgronomicState {
  id: string;
  primaryCropCode: string;
  varietyCodes: string[];
  expectedYieldKgHa?: number | null;
  phenologicalStageCode?: string | null;
}

export interface FieldOperation {
  id: string;
  operationTypeCode: string;
  operationDate: string;
  areaTreatedHa: number;
  totalCost?: number | null;
  status: string;
}

export interface LotCostEntry {
  id: string;
  campaignCode: string;
  costCategoryCode: string;
  amount: number;
  approvalStatus: string;
}

export interface HarvestRecord {
  id: string;
  campaignCode: string;
  estimatedKg?: number | null;
  actualKg?: number | null;
  status: string;
}

export interface LotDocument {
  id: string;
  documentTypeCode: string;
  title: string;
  mediaType?: string | null;
}

export interface LotDigitalTwin {
  productionYtdKg?: number | null;
  avgYieldKgHa?: number | null;
  expectedYieldKgHa?: number | null;
  totalCostYtd?: number | null;
  costPerHa?: number | null;
  costPerKg?: number | null;
  revenueYtd?: number | null;
  marginPct?: number | null;
  qualityAvgScore?: number | null;
  operationsCountYtd: number;
  riskFlags: string[];
  thematicIndicators: Record<string, unknown>;
  aiProjection: Record<string, unknown>;
}

export interface LotListResponse {
  items: FieldLotProfile[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface LotDashboard {
  kpis: {
    total: number;
    active: number;
    georeferenced: number;
    georefRatePct: number;
    avgYieldKgHa: number;
    avgQualityScore: number;
    totalProductionYtdKg: number;
    totalCostYtd: number;
    avgCostPerHa: number;
    activeRisks: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byCrop: Array<{ cropCode: string; count: number }>;
}

export interface LotFilters {
  status?: string;
  farmUnitId?: string;
  producerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQuery(filters: LotFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function listLots(filters?: LotFilters) {
  return apiRequest<LotListResponse>(`/fmdt/lots${buildQuery(filters)}`);
}

export function getLot(id: string) {
  return apiRequest<FieldLotProfile>(`/fmdt/lots/${id}`);
}

export function createLot(data: Record<string, unknown>) {
  return apiRequest<FieldLotProfile>('/fmdt/lots', { method: 'POST', body: JSON.stringify(data) });
}

export function updateLot(id: string, data: Record<string, unknown>) {
  return apiRequest<FieldLotProfile>(`/fmdt/lots/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteLot(id: string) {
  return apiRequest<FieldLotProfile>(`/fmdt/lots/${id}`, { method: 'DELETE' });
}

export function getLotTwin(id: string) {
  return apiRequest<{ profile: FieldLotProfile; twin: LotDigitalTwin }>(`/fmdt/lots/${id}/twin`);
}

export function getLotTimeline(id: string) {
  return apiRequest<{ items: Array<{ type: string; id: string; occurredAt: string; title: string; detail?: string }> }>(
    `/fmdt/lots/${id}/timeline`,
  );
}

export function getLotDashboard() {
  return apiRequest<LotDashboard>('/fmdt/lots/dashboard');
}

export function getLotMap(filters?: LotFilters) {
  return apiRequest<{ items: Array<{
    id: string; lotCode: string; lotName: string; status: string;
    latitude: number; longitude: number; totalAreaHa?: number | null; farmName: string;
  }> }>(`/fmdt/lots/map${buildQuery(filters)}`);
}

export function transitionLotLifecycle(id: string, data: { toStatus: string; reasonNotes?: string }) {
  return apiRequest<FieldLotProfile>(`/fmdt/lots/${id}/lifecycle`, { method: 'POST', body: JSON.stringify(data) });
}

export function exportLots(filters?: LotFilters) {
  return apiRequest<{ csv: string; count: number }>(`/fmdt/lots/export${buildQuery(filters)}`);
}

export function getImportTemplate() {
  return apiRequest<string>('/fmdt/lots/import/template');
}

export function validateLotImport(items: Record<string, unknown>[]) {
  return apiRequest<unknown>('/fmdt/lots/import/validate', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function importLots(items: Record<string, unknown>[], options?: { force?: boolean; continueOnError?: boolean }) {
  return apiRequest<unknown>('/fmdt/lots/import', {
    method: 'POST',
    body: JSON.stringify({ items, ...options }),
  });
}

export function getEligibleFtipLots(farmUnitId?: string) {
  const q = farmUnitId ? `?farmUnitId=${farmUnitId}` : '';
  return apiRequest<{ items: unknown[] }>(`/fmdt/lots/eligible-ftip${q}`);
}

export function listOperationTypes() {
  return apiRequest<{ items: string[] }>('/fmdt/operation-types');
}

export function addFieldOperation(lotId: string, data: Record<string, unknown>) {
  return apiRequest<FieldOperation>(`/fmdt/lots/${lotId}/operations`, { method: 'POST', body: JSON.stringify(data) });
}

export function addLotDocument(lotId: string, data: Record<string, unknown>) {
  return apiRequest<LotDocument>(`/fmdt/lots/${lotId}/documents`, { method: 'POST', body: JSON.stringify(data) });
}

export function setLotGeometry(
  id: string,
  data: { applicationGeo: Record<string, unknown>; source?: string; reasonNotes?: string },
) {
  return apiRequest<FieldLotProfile>(`/fmdt/lots/${id}/geometry`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function runFmdtReport(reportCode: string, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return apiRequest<unknown>(`/fmdt/reports/${reportCode}${q}`);
}
