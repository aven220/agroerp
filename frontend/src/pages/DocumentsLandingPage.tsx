import { useCallback, useEffect, useState } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { LoadingState } from '../components/ux/LoadingState';
import { listCoffeeDocuments } from '../api/coffee';
import { useAuth } from '../context/AuthContext';
import { useOnEntityUpdated } from '../lib/entitySync';
import { humanizeCopy } from '../lib/humanizeCopy';

interface DocRow {
  id: string;
  title: string;
  status?: string;
  createdAt?: string;
}

/**
 * PM-43 — Centro de Documentos (landing). Listado en /documentos/lista.
 */
export function DocumentsLandingPage() {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('document:upload');
  const [files, setFiles] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listCoffeeDocuments()
      .then((docs) => {
        const rows = (docs as Array<Record<string, unknown>>).map((raw) => {
          const id = String(raw.documentKey ?? raw.id ?? '');
          return {
            id,
            title: String(raw.title ?? raw.documentType ?? id),
            status: raw.status ? String(raw.status) : raw.signatureStatus ? String(raw.signatureStatus) : undefined,
            createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
          };
        });
        setFiles(rows);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useOnEntityUpdated(() => load(), ['document']);

  if (loading) return <LoadingState variant="page" message="Cargando centro de documentos…" />;

  const pending = files.filter((f) => {
    const s = (f.status ?? '').toLowerCase();
    return s.includes('pend') || s.includes('sign') || s.includes('wait');
  });
  const errors = files.filter((f) => {
    const s = (f.status ?? '').toLowerCase();
    return s.includes('error') || s.includes('fail') || s.includes('rechaz');
  });
  const signatures = files.filter((f) => (f.status ?? '').toLowerCase().includes('sign'));

  return (
    <DomainLanding
      title="Centro de Documentos"
      subtitle="Evidencias, firmas y archivos del proceso"
      description="Resumen del dominio. El repositorio completo está en el listado."
      metrics={[
        { label: 'Documentos', value: files.length, tone: 'coffee' },
        { label: 'Pendientes', value: pending.length },
        { label: 'Firmas', value: signatures.length, tone: 'teal' },
        { label: 'Errores', value: errors.length, tone: errors.length ? 'coffee' : 'green' },
      ]}
      quickActions={[
        { label: 'Ver repositorio', to: '/documentos/lista', primary: true },
        ...(canUpload ? [{ label: 'Subir en listado', to: '/documentos/lista' }] : []),
      ]}
      modules={[
        { id: 'all', title: 'Repositorio', description: 'Todos los documentos', to: '/documentos/lista', icon: '📄', badge: files.length || undefined },
        { id: 'pend', title: 'Pendientes', description: 'Esperan acción', to: '/documentos/lista', icon: '⏳', badge: pending.length || undefined },
        { id: 'sign', title: 'Firmas', description: 'Ciclo de firma', to: '/documentos/lista', icon: '✍', badge: signatures.length || undefined },
        { id: 'err', title: 'Errores', description: 'Fallos de carga o firma', to: '/documentos/lista', icon: '⚠', badge: errors.length || undefined },
      ]}
      pending={[
        ...pending.slice(0, 5).map((f) => ({
          id: f.id,
          label: f.title,
          meta: humanizeCopy(f.status ?? 'Pendiente'),
          to: '/documentos/lista',
        })),
        ...errors.slice(0, 3).map((f) => ({
          id: `e-${f.id}`,
          label: f.title,
          meta: 'Error',
          to: '/documentos/lista',
        })),
      ]}
      activity={files.slice(0, 6).map((f) => ({
        id: f.id,
        label: f.title,
        meta: f.createdAt ? new Date(f.createdAt).toLocaleString('es-CO') : undefined,
        to: '/documentos/lista',
      }))}
    />
  );
}
