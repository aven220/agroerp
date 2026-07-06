import { apiRequest } from './client';

export function getEfmFaCenter() {
  return apiRequest<Record<string, unknown>>('/efm/fa/center');
}

export function seedEfmFa() {
  return apiRequest<unknown>('/efm/fa/seed', { method: 'POST', body: '{}' });
}

export function listEfmFaCategories() {
  return apiRequest<unknown[]>('/efm/fa/categories');
}

export function listEfmFaAssets(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/fa/assets${q}`);
}

export function getEfmFaAsset(assetKey: string) {
  return apiRequest<unknown>(`/efm/fa/assets/${encodeURIComponent(assetKey)}`);
}

export function getEfmFaAssetHistory(assetKey: string) {
  return apiRequest<unknown[]>(`/efm/fa/assets/${encodeURIComponent(assetKey)}/history`);
}

export function scanEfmFaAsset(tag: string) {
  return apiRequest<unknown>(`/efm/fa/assets/scan/${encodeURIComponent(tag)}`);
}

export function listEfmFaDepreciationRuns(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/fa/depreciation/runs${q}`);
}

export function listEfmFaDepreciationLines(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/fa/depreciation/lines${q}`);
}

export function listEfmFaTransfers(assetKey?: string) {
  const q = assetKey ? `?assetKey=${encodeURIComponent(assetKey)}` : '';
  return apiRequest<unknown[]>(`/efm/fa/transfers${q}`);
}

export function listEfmFaDisposals() {
  return apiRequest<unknown[]>('/efm/fa/disposals');
}

export function listEfmFaPhysicalInventories() {
  return apiRequest<unknown[]>('/efm/fa/physical-inventories');
}

export function getEfmFaPhysicalInventory(inventoryKey: string) {
  return apiRequest<unknown>(`/efm/fa/physical-inventories/${encodeURIComponent(inventoryKey)}`);
}

export function registerEfmFaAsset(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fa/assets', { method: 'POST', body: JSON.stringify(data) });
}

export function runEfmFaDepreciation(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fa/depreciation/run', { method: 'POST', body: JSON.stringify(data) });
}

export function runEfmFaAmortization(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fa/amortization/run', { method: 'POST', body: JSON.stringify(data) });
}
