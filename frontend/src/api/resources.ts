import { apiRequest } from './client';
import type { Resource } from '../types';

export function listResources(type?: string) {
  const q = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest<Resource[]>(`/resources${q}`);
}

export function getResource(id: string) {
  return apiRequest<Resource>(`/resources/${id}`);
}

export function createResource(payload: {
  resourceType: string;
  data?: Record<string, unknown>;
  parentId?: string;
  metadata?: Record<string, unknown>;
  status?: string;
}) {
  return apiRequest<Resource>('/resources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateResource(
  id: string,
  payload: {
    data?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    status?: string;
  },
) {
  return apiRequest<Resource>(`/resources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteResource(id: string) {
  return apiRequest<{ success: boolean }>(`/resources/${id}`, {
    method: 'DELETE',
  });
}
