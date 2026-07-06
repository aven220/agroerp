import { apiRequest } from './client';
import type { AuditLog } from '../types';

export function listAuditLogs(params?: { limit?: number; entityId?: string }) {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.entityId) search.set('entityId', params.entityId);
  const q = search.toString() ? `?${search}` : '';
  return apiRequest<AuditLog[]>(`/audit${q}`);
}
