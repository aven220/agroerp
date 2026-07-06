import { apiRequest } from './client';

export function getEmfgResourcesCenter() {
  return apiRequest<Record<string, unknown>>('/emfg/resources/center');
}

export function getEmfgResourcesIndicators() {
  return apiRequest<Record<string, unknown>>('/emfg/resources/indicators');
}

export function listEmfgResourcesWorkcenters() {
  return apiRequest<unknown[]>('/emfg/resources/workcenters');
}

export function listEmfgResourceCells(centerKey?: string) {
  const q = centerKey ? `?centerKey=${encodeURIComponent(centerKey)}` : '';
  return apiRequest<unknown[]>(`/emfg/resources/cells${q}`);
}

export function createEmfgResourceCell(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/resources/cells', { method: 'POST', body: JSON.stringify(body) });
}

export function listEmfgResourceEquipment(equipmentType?: string) {
  const q = equipmentType ? `?equipmentType=${encodeURIComponent(equipmentType)}` : '';
  return apiRequest<unknown[]>(`/emfg/resources/equipment${q}`);
}

export function createEmfgResourceEquipment(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/resources/equipment', { method: 'POST', body: JSON.stringify(body) });
}

export function syncEmfgResourceMachines() {
  return apiRequest<unknown>('/emfg/resources/equipment/sync-machines', { method: 'POST', body: '{}' });
}

export function setEmfgResourceAvailability(equipmentKey: string, body: { status: string; reason?: string }) {
  return apiRequest<unknown>(`/emfg/resources/equipment/${encodeURIComponent(equipmentKey)}/availability`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function getEmfgResourcesCapacityPanel() {
  return apiRequest<Record<string, unknown>>('/emfg/resources/capacity/panel');
}

export function computeEmfgResourcesCapacity() {
  return apiRequest<unknown>('/emfg/resources/capacity/compute', { method: 'POST', body: '{}' });
}

export function recordEmfgResourceMaintenance(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/resources/maintenance/logs', { method: 'POST', body: JSON.stringify(body) });
}

export function recordEmfgResourceDowntime(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/resources/downtimes', { method: 'POST', body: JSON.stringify(body) });
}

export function syncEmfgResourcesOffline(body: { deviceId?: string; actions: unknown[] }) {
  return apiRequest<unknown>('/emfg/resources/offline/sync', { method: 'POST', body: JSON.stringify(body) });
}
