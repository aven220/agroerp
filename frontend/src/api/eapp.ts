import { apiRequest } from './client';

export interface EappCenter {
  dashboard: Record<string, unknown>;
  layers: unknown[];
  pois: unknown[];
  infra: unknown[];
  missions: unknown[];
  thematicMaps: unknown[];
  indices: unknown[];
  devices: unknown[];
  catalogs: Record<string, unknown>;
}

export function getEappCenter() {
  return apiRequest<EappCenter>('/eapp/center');
}

export function bootstrapEapp() {
  return apiRequest<EappCenter>('/eapp/bootstrap', { method: 'POST' });
}

export function getEappDashboard() {
  return apiRequest<unknown>('/eapp/dashboard');
}

export function getEappMapContext() {
  return apiRequest<unknown>('/eapp/gis/map');
}

export function listEappLayers() {
  return apiRequest<unknown[]>('/eapp/gis/layers');
}

export function measureEappArea(geometry: Record<string, unknown>) {
  return apiRequest<unknown>('/eapp/gis/measure/area', { method: 'POST', body: JSON.stringify({ geometry }) });
}

export function measureEappDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  return apiRequest<unknown>('/eapp/gis/measure/distance', {
    method: 'POST',
    body: JSON.stringify({ lat1, lng1, lat2, lng2 }),
  });
}

export function listEappPois(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eapp/geo/pois${q}`);
}

export function listEappInfrastructure(infraType?: string) {
  const q = infraType ? `?infraType=${infraType}` : '';
  return apiRequest<unknown[]>(`/eapp/geo/infrastructure${q}`);
}

export function listEappSubdivisions(parentLotId?: string) {
  const q = parentLotId ? `?parentLotId=${parentLotId}` : '';
  return apiRequest<unknown[]>(`/eapp/geo/subdivisions${q}`);
}

export function listEappSatelliteProviders() {
  return apiRequest<unknown[]>('/eapp/satellite/providers');
}

export function listEappSatelliteScenes(vendor?: string) {
  const q = vendor ? `?vendor=${vendor}` : '';
  return apiRequest<unknown[]>(`/eapp/satellite/scenes${q}`);
}

export function listEappDroneMissions(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eapp/drones/missions${q}`);
}

export function listEappDroneFlights(missionId?: string) {
  const q = missionId ? `?missionId=${missionId}` : '';
  return apiRequest<unknown[]>(`/eapp/drones/flights${q}`);
}

export function listEappThematicMaps(mapType?: string) {
  const q = mapType ? `?mapType=${mapType}` : '';
  return apiRequest<unknown[]>(`/eapp/thematic-maps${q}`);
}

export function listEappIndices() {
  return apiRequest<unknown[]>('/eapp/indices');
}

export function listEappIndexReadings(indexKey?: string) {
  const q = indexKey ? `?indexKey=${indexKey}` : '';
  return apiRequest<unknown[]>(`/eapp/indices/readings${q}`);
}

export function listEappTelemetryDevices(deviceType?: string) {
  const q = deviceType ? `?deviceType=${deviceType}` : '';
  return apiRequest<unknown[]>(`/eapp/telemetry/devices${q}`);
}

export function listEappTelemetryReadings(deviceKey?: string) {
  const q = deviceKey ? `?deviceKey=${deviceKey}` : '';
  return apiRequest<unknown[]>(`/eapp/telemetry/readings${q}`);
}

export function listEappInspections(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eapp/inspections${q}`);
}

export function getEappAuditLog(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eapp/audit${q}`);
}
