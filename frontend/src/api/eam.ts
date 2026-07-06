import { apiRequest } from './client';

export function getEamCenter() {
  return apiRequest<Record<string, unknown>>('/eam/center');
}

export function bootstrapEam() {
  return apiRequest<unknown>('/eam/bootstrap', { method: 'POST', body: '{}' });
}

export function listEamFamilies() {
  return apiRequest<unknown[]>('/eam/families');
}

export function listEamAssets() {
  return apiRequest<unknown[]>('/eam/assets');
}

export function getEamAsset(assetKey: string) {
  return apiRequest<Record<string, unknown>>(`/eam/assets/${encodeURIComponent(assetKey)}`);
}

export function listEamLocations() {
  return apiRequest<unknown[]>('/eam/locations');
}

export function getEamLocationMap() {
  return apiRequest<unknown[]>('/eam/locations/map');
}

export function getEamDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/dashboard');
}

export function computeEamIndicators() {
  return apiRequest<Record<string, unknown>>('/eam/indicators/compute', { method: 'POST', body: '{}' });
}

export function scanEamAsset(code: string, scanType: 'qr' | 'barcode' = 'qr') {
  return apiRequest<Record<string, unknown>>('/eam/scan', {
    method: 'POST',
    body: JSON.stringify({ code, scanType }),
  });
}
