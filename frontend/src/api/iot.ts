import { apiRequest } from './client';

export interface IotCenter {
  dashboard: {
    totalDevices: number;
    activeDevices: number;
    offlineDevices: number;
    readings24h: number;
    alertsOpen: number;
    gatewaysOnline: number;
    byType: Array<{ type: string; count: number }>;
    topMetrics: Array<{ metricKey: string; count: number }>;
  };
  suggestions: unknown[];
  devices: IotDevice[];
}

export interface IotDevice {
  id: string;
  deviceKey: string;
  name: string;
  deviceType: string;
  protocol: string;
  status: string;
  batteryLevel?: number;
  signalQuality?: number;
  latitude?: number;
  longitude?: number;
  lastSeenAt?: string;
  farmId?: string;
  lotId?: string;
  tags: string[];
  group?: { name: string; groupKey: string };
}

export interface IotTelemetry {
  id: string;
  deviceKey: string;
  metricKey: string;
  value?: number;
  valueText?: string;
  unit?: string;
  recordedAt: string;
}

export interface IotAlert {
  id: string;
  deviceKey?: string;
  alertKey: string;
  severity: string;
  title: string;
  message?: string;
  isAcknowledged: boolean;
  createdAt: string;
}

export function getIotCenter() {
  return apiRequest<IotCenter>('/eiesdp/center');
}

export function listIotDevices(status?: string, deviceType?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (deviceType) params.set('deviceType', deviceType);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<IotDevice[]>(`/eiesdp/devices${q}`);
}

export function getIotDeviceMap() {
  return apiRequest<IotDevice[]>('/eiesdp/devices/map');
}

export function registerIotDevice(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eiesdp/devices', { method: 'POST', body: JSON.stringify(data) });
}

export function activateIotDevice(deviceKey: string) {
  return apiRequest<unknown>(`/eiesdp/devices/${deviceKey}/activate`, { method: 'POST' });
}

export function deactivateIotDevice(deviceKey: string) {
  return apiRequest<unknown>(`/eiesdp/devices/${deviceKey}/deactivate`, { method: 'POST' });
}

export function assignIotDevice(deviceKey: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eiesdp/devices/${deviceKey}/assign`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function listIotTelemetry(deviceKey?: string) {
  const q = deviceKey ? `?deviceKey=${deviceKey}` : '';
  return apiRequest<IotTelemetry[]>(`/eiesdp/telemetry${q}`);
}

export function getTelemetryDashboard() {
  return apiRequest<unknown[]>('/eiesdp/telemetry/dashboard');
}

export function listIotAlerts(all?: boolean) {
  const q = all ? '?all=true' : '';
  return apiRequest<IotAlert[]>(`/eiesdp/alerts${q}`);
}

export function acknowledgeIotAlert(id: string) {
  return apiRequest<unknown>(`/eiesdp/alerts/${id}/acknowledge`, { method: 'POST' });
}

export function listIotEvents(deviceKey?: string) {
  const q = deviceKey ? `?deviceKey=${deviceKey}` : '';
  return apiRequest<unknown[]>(`/eiesdp/events${q}`);
}

export function listIotFirmware() {
  return apiRequest<unknown[]>('/eiesdp/firmware');
}

export function createIotFirmware(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eiesdp/firmware', { method: 'POST', body: JSON.stringify(data) });
}

export function deployIotFirmware(releaseId: string, deviceKey: string) {
  return apiRequest<unknown>(`/eiesdp/firmware/${releaseId}/deploy/${deviceKey}`, { method: 'POST' });
}

export function listIotGateways() {
  return apiRequest<unknown[]>('/eiesdp/edge/gateways');
}

export function listIotAudit(deviceKey?: string) {
  const q = deviceKey ? `?deviceKey=${deviceKey}` : '';
  return apiRequest<unknown[]>(`/eiesdp/audit${q}`);
}

export function ingestTelemetry(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eiesdp/ingest/http', { method: 'POST', body: JSON.stringify(data) });
}
