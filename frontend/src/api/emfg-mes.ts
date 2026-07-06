import { apiRequest } from './client';

export function getEmfgMesMonitor(centerKey?: string) {
  const q = centerKey ? `?centerKey=${encodeURIComponent(centerKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/emfg/mes/monitor${q}`);
}

export function getEmfgMesTracking(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/tracking`);
}

export function executeEmfgOrder(orderKey: string, body: { action: string; reason?: string; operatorKey?: string }) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/execute`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEmfgMesConsumptions(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/consumptions`);
}

export function consumeEmfgMaterial(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/consumptions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function consumeEmfgAutomatic(orderKey: string) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/consumptions/automatic`, {
    method: 'POST',
    body: '{}',
  });
}

export function listEmfgMesOutputs(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/outputs`);
}

export function recordEmfgMesOutput(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/outputs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEmfgMesLots(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/lots`);
}

export function createEmfgMesLot(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/lots`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEmfgMesSerials(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/serials`);
}

export function createEmfgMesSerial(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/serials`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getEmfgMesTraceability(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/traceability`);
}

export function getEmfgMesLotTraceability(lotKey: string) {
  return apiRequest<unknown[]>(`/emfg/mes/lots/${encodeURIComponent(lotKey)}/traceability`);
}

export function startEmfgOperation(orderKey: string, orderOpKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(
    `/emfg/mes/orders/${encodeURIComponent(orderKey)}/operations/${encodeURIComponent(orderOpKey)}/start`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function finishEmfgOperation(orderKey: string, orderOpKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(
    `/emfg/mes/orders/${encodeURIComponent(orderKey)}/operations/${encodeURIComponent(orderOpKey)}/finish`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function captureEmfgMes(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/mes/orders/${encodeURIComponent(orderKey)}/captures`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function syncEmfgMesOffline(body: { deviceId?: string; actions: unknown[] }) {
  return apiRequest<unknown>('/emfg/mes/offline/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
