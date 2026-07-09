import { useMemo, useState, useEffect, useCallback } from 'react';
import { LoadingState } from '../components/ux/LoadingState';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { listProducers, type Producer } from '../api/prm';
import { listCoffeeDocuments } from '../api/coffee';
import { addProducerDocument } from '../api/prm';
import { storeDocumentFile } from '../lib/documentStorage';
import { useAuth } from '../context/AuthContext';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

interface DocumentRow {
  id: string;
  documentKey: string;
  title: string;
  documentType?: string;
  ticketKey?: string;
  producerId?: string;
  createdAt?: string;
}

function mapDocument(raw: Record<string, unknown>): DocumentRow {
  const documentKey = String(raw.documentKey ?? raw.id ?? '');
  return {
    id: documentKey,
    documentKey,
    title: String(raw.title ?? raw.documentType ?? documentKey),
    documentType: raw.documentType ? String(raw.documentType) : undefined,
    ticketKey: raw.ticketKey ? String(raw.ticketKey) : undefined,
    producerId: raw.producerId ? String(raw.producerId) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export function DocumentsPage() {
  const { user, hasPermission } = useAuth();
  const canUpload = hasPermission('document:upload');
  const [refresh, setRefresh] = useState(0);
  const [files, setFiles] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [producerId, setProducerId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listCoffeeDocuments()
      .then((docs) => setFiles((docs as Array<Record<string, unknown>>).map(mapDocument)))
      .catch((e: unknown) => {
        setFiles([]);
        setLoadError(e instanceof Error ? e.message : 'Error al cargar documentos');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refresh]);

  useOnEntityUpdated(() => setRefresh((r) => r + 1), ['document', 'producer']);

  useEffect(() => {
    listProducers({ limit: 200 })
      .then((res) => setProducers(res.items))
      .catch(() => setProducers([]));
  }, [refresh]);

  const producerMap = useMemo(() => {
    const m = new Map<string, string>();
    producers.forEach((p) => m.set(p.id, p.legalName || p.producerNumber));
    return m;
  }, [producers]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user || uploading) return;
    if (!producerId) {
      setError('Seleccione un productor para asociar el documento');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const stored = await storeDocumentFile(file, user.organizationId);
      await addProducerDocument(producerId, {
        title: file.name,
        documentTypeCode: file.type.startsWith('image/') ? 'foto' : 'documento',
        contentId: stored.contentId,
      });
      notifyEntityUpdated('document', stored.contentId);
      notifyEntityUpdated('producer', producerId);
      setModalOpen(false);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Header
        title="Documentos"
        subtitle="Documentos operativos CPEP y archivos asociados a productores PRM"
        actions={
          canUpload ? (
            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
              + Subir documento
            </button>
          ) : undefined
        }
      />

      <div className="alert alert-info">
        Los metadatos se registran en la API. El almacenamiento binario en MinIO
        queda referenciado por <code>storageKey</code> (consola MinIO: puerto 9001).
      </div>

      {loadError ? <div className="alert alert-error">{loadError}</div> : null}

      {loading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable<DocumentRow>
          gridId="documents"
          data={files}
          columns={[
            { key: 'title', label: 'Documento', render: (r) => r.title },
            { key: 'type', label: 'Tipo', render: (r) => r.documentType ?? '—' },
            { key: 'ticket', label: 'Ticket', render: (r) => r.ticketKey ?? '—' },
            {
              key: 'producer',
              label: 'Productor',
              render: (r) => (r.producerId ? producerMap.get(r.producerId) ?? r.producerId : '—'),
            },
            { key: 'date', label: 'Fecha', render: (r) => r.createdAt?.slice(0, 10) ?? '—' },
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
            <select value={producerId} onChange={(e) => setProducerId(e.target.value)}>
              <option value="">Sin asociar</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.legalName || p.producerNumber}
                </option>
              ))}
            </select>
          </label>
          {error ? <div className="alert alert-error">{error}</div> : null}
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
