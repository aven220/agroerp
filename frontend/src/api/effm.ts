import { apiRequest } from './client';

export interface EffmCenter {
  dashboard: Record<string, unknown>;
  machines: unknown[];
  implements: unknown[];
  activeAlarms: unknown[];
}

export function getEffmCenter() {
  return apiRequest<EffmCenter>('/effm/center');
}

export function bootstrapEffm() {
  return apiRequest<EffmCenter>('/effm/bootstrap', { method: 'POST' });
}

export function getEffmDashboard() {
  return apiRequest<unknown>('/effm/dashboard');
}

export function listEffmMachines(machineType?: string) {
  const q = machineType ? `?machineType=${machineType}` : '';
  return apiRequest<unknown[]>(`/effm/machines${q}`);
}

export function listEffmImplements() {
  return apiRequest<unknown[]>('/effm/implements');
}

export function listEffmOperations(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/effm/operations${q}`);
}

export function listEffmAssignments() {
  return apiRequest<unknown[]>('/effm/operators/assignments');
}

export function listEffmFuel() {
  return apiRequest<unknown[]>('/effm/fuel');
}

export function listEffmTelemetryReadings(machineId?: string) {
  const q = machineId ? `?machineId=${machineId}` : '';
  return apiRequest<unknown[]>(`/effm/telemetry/readings${q}`);
}

export function listEffmTelemetryAlarms() {
  return apiRequest<unknown[]>('/effm/telemetry/alarms');
}

export function getEffmFleetPerformance() {
  return apiRequest<unknown>('/effm/performance/fleet');
}

export function listEffmCouplingHistory() {
  return apiRequest<unknown[]>('/effm/couplings/history');
}

export function listEffmIncidents() {
  return apiRequest<unknown[]>('/effm/incidents');
}
