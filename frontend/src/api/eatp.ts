import { apiRequest } from './client';

export interface EatpCenter {
  dashboard: Record<string, unknown>;
  campaigns: unknown[];
  seasons: unknown[];
  crops: unknown[];
  tasks: unknown[];
  calendar: unknown[];
}

export function getEatpCenter() {
  return apiRequest<EatpCenter>('/eatp/center');
}

export function bootstrapEatp() {
  return apiRequest<EatpCenter>('/eatp/bootstrap', { method: 'POST' });
}

export function getEatpDashboard() {
  return apiRequest<unknown>('/eatp/dashboard');
}

export function listEatpFarms(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<unknown>(`/eatp/farms${q}`);
}

export function getEatpFarm(farmId: string) {
  return apiRequest<unknown>(`/eatp/farms/${farmId}`);
}

export function listEatpLots(farmUnitId?: string) {
  const q = farmUnitId ? `?farmUnitId=${farmUnitId}` : '';
  return apiRequest<unknown[]>(`/eatp/lots${q}`);
}

export function getEatpLot(lotId: string) {
  return apiRequest<unknown>(`/eatp/lots/${lotId}`);
}

export function resolveEatpQr(qrCode: string) {
  return apiRequest<unknown>(`/eatp/qr/${encodeURIComponent(qrCode)}`);
}

export function listEatpCropStands(farmUnitId?: string) {
  const q = farmUnitId ? `?farmUnitId=${farmUnitId}` : '';
  return apiRequest<unknown[]>(`/eatp/crops/stands${q}`);
}

export function listEatpCropRegistry() {
  return apiRequest<unknown[]>('/eatp/crops/registry');
}

export function listEatpCampaigns() {
  return apiRequest<unknown[]>('/eatp/campaigns');
}

export function listEatpSeasons() {
  return apiRequest<unknown[]>('/eatp/seasons');
}

export function getEatpLaborCatalog() {
  return apiRequest<unknown[]>('/eatp/labors/catalog');
}

export function listEatpLaborTasks(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eatp/labors/tasks${q}`);
}

export function recordEatpLabor(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eatp/labors/record', { method: 'POST', body: JSON.stringify(data) });
}

export function getEatpCalendar() {
  return apiRequest<unknown[]>('/eatp/schedule/calendar');
}

export function listEatpInputItems(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest<unknown[]>(`/eatp/inputs/items${q}`);
}

export function listEatpAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eatp/audit${q}`);
}
