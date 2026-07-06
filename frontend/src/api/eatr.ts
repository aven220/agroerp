import { apiRequest } from './client';

export interface EatrCenter {
  dashboard: Record<string, unknown>;
  productionLots: unknown[];
  commercialLots: unknown[];
  traceEvents: unknown[];
  custodyTransfers: unknown[];
  harvestSchedules: unknown[];
}

export function getEatrCenter() {
  return apiRequest<EatrCenter>('/eatr/center');
}

export function bootstrapEatr() {
  return apiRequest<EatrCenter>('/eatr/bootstrap', { method: 'POST' });
}

export function getEatrDashboard() {
  return apiRequest<unknown>('/eatr/dashboard');
}

export function listEatrTraceEvents(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eatr/trace/events${q}`);
}

export function queryEatrTrace(params: { lotKey?: string; qrCode?: string; commercialLotKey?: string }) {
  const search = new URLSearchParams();
  if (params.lotKey) search.set('lotKey', params.lotKey);
  if (params.qrCode) search.set('qrCode', params.qrCode);
  if (params.commercialLotKey) search.set('commercialLotKey', params.commercialLotKey);
  const q = search.toString();
  return apiRequest<unknown>(`/eatr/trace/query${q ? `?${q}` : ''}`);
}

export function listEatrProductionLots(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eatr/lots/production${q}`);
}

export function listEatrCommercialLots() {
  return apiRequest<unknown[]>('/eatr/lots/commercial');
}

export function listEatrCustody() {
  return apiRequest<unknown[]>('/eatr/custody');
}

export function listEatrHarvestSchedules() {
  return apiRequest<unknown[]>('/eatr/harvest/schedules');
}

export function listEatrWeighings() {
  return apiRequest<unknown[]>('/eatr/harvest/weighings');
}

export function listEatrPostharvest() {
  return apiRequest<unknown[]>('/eatr/postharvest');
}

export function listEatrQuality() {
  return apiRequest<unknown[]>('/eatr/quality');
}

export function listEatrPackaging() {
  return apiRequest<unknown[]>('/eatr/packaging');
}

export function listEatrExportMarkets() {
  return apiRequest<unknown[]>('/eatr/export/markets');
}

export function listEatrShipments() {
  return apiRequest<unknown[]>('/eatr/export/shipments');
}
