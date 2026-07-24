import { apiRequest } from './client';
import type { Resource } from '../types';

export function registerFile(payload: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  parentResourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  return apiRequest<Resource>('/files/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getResource(id: string) {
  return apiRequest<Resource>(`/resources/${id}`);
}

/** Descarga binaria autenticada (foto/firma) como Object URL. */
export async function fetchFileContentObjectUrl(id: string): Promise<string> {
  const token = localStorage.getItem('agroerp_token');
  const res = await fetch(`/api/v1/files/${id}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `No se pudo cargar el archivo (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function resourceHasContent(resource: Resource): boolean {
  const data = (resource.data ?? {}) as Record<string, unknown>;
  const key = String(data.storageKey ?? '');
  return Boolean(data.contentAvailable) && !!key && !key.startsWith('local://') && !key.startsWith('pending');
}

export async function uploadDocument(
  file: File,
  organizationId: string,
  parentResourceId?: string,
) {
  const storageKey = `org/${organizationId}/documents/${Date.now()}-${file.name}`;
  return registerFile({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    storageKey,
    parentResourceId,
    metadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    },
  });
}
