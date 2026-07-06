import { apiRequest } from './client';

export function getEpscmWmsCenter() {
  return apiRequest<Record<string, unknown>>('/epscm/wms/center');
}

export function bootstrapEpscmWms() {
  return apiRequest<unknown>('/epscm/wms/bootstrap', { method: 'POST', body: '{}' });
}

export function getEpscmWmsDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/wms/dashboard');
}

export function getEpscmWmsAudit() {
  return apiRequest<unknown[]>('/epscm/wms/audit');
}

export function getEpscmWmsHierarchy(warehouseKey: string) {
  return apiRequest<Record<string, unknown>>(`/epscm/wms/warehouses/${encodeURIComponent(warehouseKey)}/hierarchy`);
}

export function getEpscmWmsMap(warehouseKey: string) {
  return apiRequest<unknown[]>(`/epscm/wms/warehouses/${encodeURIComponent(warehouseKey)}/map`);
}

export function seedEpscmWmsHierarchy(warehouseKey: string) {
  return apiRequest<unknown>(`/epscm/wms/warehouses/${encodeURIComponent(warehouseKey)}/seed`, {
    method: 'POST', body: '{}',
  });
}

export function listEpscmWmsLocations(warehouseKey?: string) {
  const q = warehouseKey ? `?warehouseKey=${encodeURIComponent(warehouseKey)}` : '';
  return apiRequest<unknown[]>(`/epscm/wms/locations${q}`);
}

export function getEpscmWmsOccupancy(warehouseKey?: string) {
  const q = warehouseKey ? `?warehouseKey=${encodeURIComponent(warehouseKey)}` : '';
  return apiRequest<unknown[]>(`/epscm/wms/locations/occupancy${q}`);
}

export function suggestEpscmWmsLocation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/wms/locations/suggest', {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function listEpscmWmsTransfers(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/epscm/wms/transfers${q}`);
}

export function createEpscmWmsTransfer(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/wms/transfers', { method: 'POST', body: JSON.stringify(body) });
}

export function submitEpscmWmsTransfer(transferKey: string) {
  return apiRequest<unknown>(`/epscm/wms/transfers/${encodeURIComponent(transferKey)}/submit`, {
    method: 'POST', body: '{}',
  });
}

export function completeEpscmWmsTransfer(transferKey: string) {
  return apiRequest<unknown>(`/epscm/wms/transfers/${encodeURIComponent(transferKey)}/complete`, {
    method: 'POST', body: '{}',
  });
}

export function getEpscmWmsPickPanel(warehouseKey?: string) {
  const q = warehouseKey ? `?warehouseKey=${encodeURIComponent(warehouseKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/epscm/wms/picking/panel${q}`);
}

export function listEpscmWmsPickTasks(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/epscm/wms/picking/tasks${q}`);
}

export function createEpscmWmsWave(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/wms/picking/waves', { method: 'POST', body: JSON.stringify(body) });
}

export function getEpscmWmsPackPanel() {
  return apiRequest<unknown[]>('/epscm/wms/packing/panel');
}

export function listEpscmWmsDispatches() {
  return apiRequest<unknown[]>('/epscm/wms/dispatches');
}

export function listEpscmWmsReceipts() {
  return apiRequest<unknown[]>('/epscm/wms/receipts');
}

export function listEpscmWmsCrossDock() {
  return apiRequest<unknown[]>('/epscm/wms/cross-dock');
}
