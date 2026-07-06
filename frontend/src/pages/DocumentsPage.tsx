import { useMemo, useState } from 'react';
import { LoadingState } from '../components/ux/LoadingState';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { useResources } from '../hooks/useResources';
import { uploadDocument } from '../api/files';
import { deleteResource } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import {
  RESOURCE_TYPES,
  resourceData,
  type ProducerData,
  type Resource,
} from '../types';

interface FileData {
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const { items: files, loading } = useResources(RESOURCE_TYPES.FILE, refresh);
  const { items: producers } = useResources(RESOURCE_TYPES.PRODUCER, refresh);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [producerId, setProducerId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const producerMap = useMemo(() => {
    const m = new Map<string, string>();
    producers.forEach((p) => m.set(p.id, resourceData<ProducerData>(p).name ?? ''));
    return m;
  }, [producers]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(
        file,
        user.organizationId,
        producerId || undefined,
      );
      setModalOpen(false);
      setFile(null);
      setRefresh((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(row: Resource) {
    if (!confirm('¿Eliminar registro de documento?')) return;
    await deleteResource(row.id);
    setRefresh((r) => r + 1);
  }

  function formatSize(bytes?: number) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <Header
        title="Documentos"
        subtitle="Archivos asociados a productores y operaciones"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Subir documento
          </button>
        }
      />

      <div className="alert alert-info">
        Los metadatos se registran en la API. El almacenamiento binario en MinIO
        queda referenciado por <code>storageKey</code> (consola MinIO: puerto 9001).
      </div>

      {loading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable<Resource>
          gridId="documents"
          data={files}
          columns={[
            {
              key: 'filename',
              label: 'Archivo',
              render: (r) => resourceData<FileData>(r)?.filename ?? '—',
            },
            {
              key: 'type',
              label: 'Tipo',
              render: (r) => resourceData<FileData>(r)?.mimeType ?? '—',
            },
            {
              key: 'size',
              label: 'Tamaño',
              render: (r) => formatSize(resourceData<FileData>(r)?.sizeBytes),
            },
            {
              key: 'storage',
              label: 'Storage Key',
              render: (r) => (
                <code className="code-sm">
                  {resourceData<FileData>(r)?.storageKey ?? '—'}
                </code>
              ),
            },
            {
              key: 'producer',
              label: 'Productor',
              render: (r) =>
                producerMap.get(r.parentId ?? '') ?? '—',
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r);
                  }}
                >
                  Eliminar
                </button>
              ),
            },
          ]}
        />
      )}

      <Modal open={modalOpen} title="Subir documento" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleUpload} className="form-grid">
          <label>
            Archivo (PDF, imagen) *
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label>
            Asociar a productor (opcional)
            <select
              value={producerId}
              onChange={(e) => setProducerId(e.target.value)}
            >
              <option value="">Sin asociar</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {resourceData<ProducerData>(p).name}
                </option>
              ))}
            </select>
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Subiendo...' : 'Registrar documento'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
