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
