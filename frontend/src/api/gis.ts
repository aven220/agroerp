import { apiRequest } from './client';

export interface GisLayer {
  id: string;
  layerCode: string;
  layerName: string;
  layerType: string;
  sourceModule: string;
  geometryType: string;
  styleRules: Record<string, unknown>;
  status: string;
  isPublic: boolean;
}

export interface GisBasemap {
  id: string;
  basemapCode: string;
  basemapName: string;
  provider: string;
  mapType: string;
  urlTemplate: string;
  attribution?: string | null;
  defaultForOrg: boolean;
  offlineCapable: boolean;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties?: Record<string, unknown>;
  }>;
}

export function getGisDashboard() {
  return apiRequest<{
    kpis: Record<string, number>;
    layerStats: Array<{ id: string; layerCode: string; layerName: string; featureCount: number }>;
    recentGeoEvents: unknown[];
    aiReadiness: Record<string, boolean>;
  }>('/gis/dashboard');
}

export function getGisTimeline(from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return apiRequest<unknown[]>(`/gis/timeline${qs ? `?${qs}` : ''}`);
}

export function listGisLayers(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<GisLayer[]>(`/gis/layers${q}`);
}

export function createGisLayer(data: Record<string, unknown>) {
  return apiRequest<GisLayer>('/gis/layers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateGisLayer(id: string, data: Record<string, unknown>) {
  return apiRequest<GisLayer>(`/gis/layers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function publishGisLayer(id: string) {
  return apiRequest<GisLayer>(`/gis/layers/${id}/publish`, { method: 'POST' });
}

export function refreshGisLayer(id: string) {
  return apiRequest<{ featureCount: number }>(`/gis/layers/${id}/refresh`, { method: 'POST' });
}

export function refreshAllGisLayers() {
  return apiRequest<unknown>('/gis/layers/refresh-all', { method: 'POST' });
}

export function getLayerFeatures(
  layerId: string,
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number },
) {
  const q = new URLSearchParams({
    minLat: String(bbox.minLat),
    minLng: String(bbox.minLng),
    maxLat: String(bbox.maxLat),
    maxLng: String(bbox.maxLng),
  });
  return apiRequest<GeoJsonFeatureCollection>(`/gis/layers/${layerId}/features?${q}`);
}

export function listBasemaps() {
  return apiRequest<GisBasemap[]>('/gis/basemaps');
}

export function measureArea(geometry: Record<string, unknown>) {
  return apiRequest<{ areaHa: number }>('/gis/measure/area', {
    method: 'POST',
    body: JSON.stringify({ geometry }),
  });
}

export function measureDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  return apiRequest<{ distanceM: number }>('/gis/measure/distance', {
    method: 'POST',
    body: JSON.stringify({ lat1, lng1, lat2, lng2 }),
  });
}

export function checkGeofence(lat: number, lng: number) {
  return apiRequest<unknown>('/gis/geofence/check', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
}

export function listGeofences() {
  return apiRequest<unknown[]>('/gis/geofences');
}

export function createGeofence(data: Record<string, unknown>) {
  return apiRequest<unknown>('/gis/geofences', { method: 'POST', body: JSON.stringify(data) });
}

export function listGeoEvents(limit = 50) {
  return apiRequest<unknown[]>(`/gis/geo-events?limit=${limit}`);
}

export function startAnalysis(analysisType: string, parameters?: Record<string, unknown>) {
  return apiRequest<{ id: string; status: string }>('/gis/analyze', {
    method: 'POST',
    body: JSON.stringify({ analysisType, parameters }),
  });
}

export function getAnalysisJob(jobId: string) {
  return apiRequest<unknown>(`/gis/analyze/${jobId}`);
}

export function importGeoData(data: { format: string; layerCode: string; content: string; fileName?: string }) {
  return apiRequest<{ importId: string; featureCount: number }>('/gis/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function exportGeoData(data: { format: string; layerCode?: string; features?: unknown[] }) {
  return apiRequest<{ format: string; mimeType: string; content: string }>('/gis/export', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getGisReport(reportCode: string, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return apiRequest<unknown>(`/gis/reports/${reportCode}${q}`);
}

export function optimizeRoute(stops: Array<{ stopName: string; lat: number; lng: number }>) {
  return apiRequest<unknown>('/gis/routes/optimize', {
    method: 'POST',
    body: JSON.stringify({ stops }),
  });
}

export function listRoutes() {
  return apiRequest<unknown[]>('/gis/routes');
}

export function createRoute(data: Record<string, unknown>) {
  return apiRequest<unknown>('/gis/routes', { method: 'POST', body: JSON.stringify(data) });
}
