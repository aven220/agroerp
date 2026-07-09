import { registerFile } from '../api/files';

export interface StoredDocumentRef {
  contentId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Encapsula /files/register sin exponer el modelo Resource al resto del ERP. */
export async function storeDocumentFile(
  file: File,
  organizationId: string,
): Promise<StoredDocumentRef> {
  const contentId = crypto.randomUUID();
  const storageKey = `org/${organizationId}/documents/${contentId}-${file.name}`;
  await registerFile({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    storageKey,
    metadata: {
      contentId,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    },
  });
  return {
    contentId,
    storageKey,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}
