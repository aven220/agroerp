import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageActions, PageState, EntityMetadata, MetadataChip, EntityDetailLayout, InfoGrid, InfoSection, EmptyPanel, type EntityTab } from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { ProcessWorkspacePanel } from '../components/process/ProcessWorkspacePanel';
import { PinRecordButton } from '../components/guided-workspace/PinRecordButton';
import { useAuth } from '../context/AuthContext';
import { updateWorkEntityLabel } from '../lib/workEntityHistory';
import { buildRecordExplorerPath } from '../record-explorer/types';
import {
  addProducerNote,
  getProducer,
  getProducerTimeline,
  transitionLifecycle,
  type Producer,
  type TimelineItem,
} from '../api/prm';
import { startProducerApprovalWorkflow } from '../lib/workflowIntegration';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pre_registered: 'Pre-registro',
  pending_approval: 'Pendiente aprobación',
  active: 'Activo',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

const PRODUCER_TABS: EntityTab[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'fincas', label: 'Fincas' },
  { id: 'certificaciones', label: 'Certificaciones' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notas', label: 'Notas' },
];

type Tab = (typeof PRODUCER_TABS)[number]['id'];

export function ProducerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const [producer, setProducer] = useState<Producer | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tab, setTab] = useState<Tab>('perfil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const canLifecycle = hasPermission('producer:lifecycle');
  const canUpdate = hasPermission('producer:update');

  const reload = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getProducer(id), getProducerTimeline(id)])
      .then(([p, tl]) => {
        setProducer(p);
        setTimeline(tl.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useOnEntityUpdated(reload, ['producer', 'document', 'purchase'], id, 'Producer');

  useEffect(() => {
    if (!id || !producer) return;
    updateWorkEntityLabel(user?.id, 'producer', id, producer.legalName);
  }, [id, producer?.legalName, user?.id]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !noteText.trim()) return;
    try {
      await addProducerNote(id, noteText);
      setNoteText('');
      const [p, tl] = await Promise.all([getProducer(id), getProducerTimeline(id)]);
      setProducer(p);
      setTimeline(tl.items);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo agregar la nota');
    }
  }

  async function handleLifecycle(e: React.FormEvent) {
    e.preventDefault();
    if (!id || lifecycleBusy) return;
    const destructive = ['suspended', 'inactive', 'archived'].includes(lifecycleStatus);
    if (
      destructive &&
      !confirm(
        `¿Cambiar el estado del productor a «${LIFECYCLE_LABELS[lifecycleStatus] ?? lifecycleStatus}»?`,
      )
    ) {
      return;
    }
    setLifecycleBusy(true);
    try {
      await transitionLifecycle(id, {
        toStatus: lifecycleStatus,
        reasonNotes: lifecycleReason,
      });
      if (lifecycleStatus === 'pending_approval') {
        await startProducerApprovalWorkflow(id, {
          legalName: producer?.legalName,
          producerNumber: producer?.producerNumber,
        });
      }
      notifyEntityUpdated('producer', id);
      setLifecycleOpen(false);
      const [p, tl] = await Promise.all([getProducer(id), getProducerTimeline(id)]);
      setProducer(p);
      setTimeline(tl.items);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setLifecycleBusy(false);
    }
  }

  if (loading) return <PageState variant="loading" message="Cargando expediente..." />;
  if (error || !producer) {
    return <PageState variant="error" message={error ?? 'Productor no encontrado'} onRetry={reload} />;
  }

  return (
    <>
      <Header
        title={producer.legalName}
        subtitle={`${producer.producerNumber} · ${LIFECYCLE_LABELS[producer.lifecycleStatus] ?? producer.lifecycleStatus}`}
        actions={
          <PageActions>
            {id ? (
              <PinRecordButton
                kind="producer"
                id={id}
                label={producer.legalName}
                to={`/productores/${id}`}
              />
            ) : null}
            <button type="button" className="btn" onClick={() => navigate('/productores')}>
              Volver
            </button>
            {hasPermission('producer:read') && id ? (
              <Link to={buildRecordExplorerPath('producer', id)} className="btn">
                Expediente 360°
              </Link>
            ) : null}
            {canLifecycle ? (
              <button type="button" className="btn" onClick={() => setLifecycleOpen(true)}>
                Cambiar estado
              </button>
            ) : null}
            {canUpdate ? (
              <Link to={`/productores/${id}/editar`} className="btn btn-primary">
                Editar
              </Link>
            ) : null}
          </PageActions>
        }
      />

      <FlowProgress flowId="agricultural" currentStepId="producer" />

      <ProcessWorkspacePanel
        flowId="agricultural"
        currentStepId="producer"
        entityName={producer.legalName}
      />

      {id ? (
        <FlowNextActions
          title="Continuar registro agrícola"
          subtitle="Complete el expediente territorial del productor."
          actions={[
            ...(hasPermission('farm:create')
              ? [
                  {
                    label: 'Registrar finca',
                    description: 'Siguiente paso del registro agrícola',
                    to: `/fincas/nueva?productor=${id}`,
                    primary: true,
                    icon: '🏡',
                  },
                ]
              : []),
            ...(hasPermission('form:read')
              ? [
                  {
                    label: 'Capturar actividad',
                    description: 'Registre labores de campo con formularios',
                    to: '/formularios/recoleccion',
                    icon: '📋',
                  },
                ]
              : []),
            ...(hasPermission('workflow:read')
              ? [
                  {
                    label: 'Bandeja de aprobaciones',
                    description: 'Revise solicitudes pendientes',
                    to: '/procesos/bandeja',
                    icon: '✅',
                  },
                ]
              : []),
            ...(hasPermission('producer:read')
              ? [
                  {
                    label: 'Expediente 360°',
                    description: 'Vista unificada del productor',
                    to: buildRecordExplorerPath('producer', id),
                    icon: '📂',
                  },
                ]
              : []),
            ...(hasPermission('producer:read')
              ? [
                  {
                    label: 'Ver indicadores',
                    description: 'Resumen de productores y actividad reciente',
                    to: '/productores/dashboard',
                    icon: '📊',
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      {actionError ? <div className="alert alert-error">{actionError}</div> : null}

      <EntityDetailLayout
        tabs={PRODUCER_TABS}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
        metadata={
          <EntityMetadata>
            <MetadataChip>Calidad: {producer.qualityScore}</MetadataChip>
            <MetadataChip>Riesgo: {producer.riskScore}</MetadataChip>
            {producer.categoryCode ? (
              <MetadataChip>Categoría {producer.categoryCode}</MetadataChip>
            ) : null}
          </EntityMetadata>
        }
      >
        {tab === 'perfil' && (
          <InfoGrid>
            <InfoSection
              title="Identificación"
              items={[
                { term: 'Tipo', detail: producer.producerTypeCode },
                { term: 'Documento', detail: `${producer.documentTypeCode} ${producer.documentNumber}` },
                { term: 'Nombres', detail: `${producer.firstName ?? ''} ${producer.lastName ?? ''}`.trim() },
                { term: 'Municipio', detail: producer.municipalityCode },
                { term: 'Vereda', detail: producer.veredaCode },
                { term: 'Experiencia', detail: producer.yearsExperience != null ? `${producer.yearsExperience} años` : '—' },
              ]}
            />
            <InfoSection
              title="Comercial"
              items={[
                { term: 'Categoría', detail: producer.categoryCode },
                { term: 'Origen', detail: producer.leadSourceCode },
                { term: 'Registrado', detail: new Date(producer.registeredAt).toLocaleDateString('es-CO') },
                {
                  term: 'Activado',
                  detail: producer.activatedAt
                    ? new Date(producer.activatedAt).toLocaleDateString('es-CO')
                    : '—',
                },
              ]}
            />
            {producer.latitude != null && producer.longitude != null ? (
              <InfoSection title="Ubicación">
                <p>{Number(producer.latitude).toFixed(5)}, {Number(producer.longitude).toFixed(5)}</p>
                <a
                  href={`https://www.google.com/maps?q=${producer.latitude},${producer.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                >
                  Ver en mapa
                </a>
              </InfoSection>
            ) : null}
          </InfoGrid>
        )}

        {tab === 'contactos' && (
          <div>
            {(producer.contacts ?? []).length === 0 ? (
              <EmptyPanel title="Sin contactos" description="No hay contactos registrados para este productor." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Tipo</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Principal</th></tr>
                </thead>
                <tbody>
                  {producer.contacts!.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contactTypeCode}</td>
                      <td>{c.name}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.isPrimary ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'fincas' && (
          <div>
            {(producer.territoryLinks ?? []).length === 0 && (producer.farmLinks ?? []).length === 0 ? (
              <p className="muted">Sin fincas vinculadas</p>
            ) : (
              <ul className="link-list">
                {(producer.territoryLinks ?? []).map((t) => (
                  <li key={t.id}>
                    <Link to={`/fincas/${t.farmUnitId}`}>
                      {t.farmUnit?.farmName ?? t.farmUnitId}
                    </Link>
                    {' — '}{t.relationshipType}
                    {t.isPrimary && ' (principal)'}
                    {t.farmUnit?.totalAreaHa != null && ` · ${Number(t.farmUnit.totalAreaHa).toFixed(1)} ha`}
                  </li>
                ))}
                {(producer.farmLinks ?? []).map((f) => (
                  <li key={f.id}>
                    Finca legacy {f.farmResourceId.slice(0, 8)}… — {f.roleCode}
                    {f.isPrimary && ' (principal)'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'certificaciones' && (
          <div>
            {(producer.certifications ?? []).length === 0 ? (
              <p className="muted">Sin certificaciones</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Esquema</th><th>Número</th><th>Emisión</th><th>Vence</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {producer.certifications!.map((c) => (
                    <tr key={c.id}>
                      <td>{c.schemeCode}</td>
                      <td>{c.certificateNumber ?? '—'}</td>
                      <td>{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString('es-CO') : '—'}</td>
                      <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-CO') : '—'}</td>
                      <td>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'documentos' && (
          <div>
            {(producer.documents ?? []).length === 0 ? (
              <p className="muted">Sin documentos indexados</p>
            ) : (
              <ul className="link-list">
                {producer.documents!.map((d) => (
                  <li key={d.id}>{d.title} ({d.documentTypeCode})</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="timeline">
            {timeline.map((item) => (
              <div key={`${item.type}-${item.id}`} className="timeline-item">
                <div className="timeline-date">
                  {new Date(item.occurredAt).toLocaleString('es-CO')}
                </div>
                <div className="timeline-body">
                  <strong>{item.title}</strong>
                  {item.detail && <p>{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'notas' && (
          <div>
            {canUpdate ? (
              <form onSubmit={handleAddNote} className="note-form">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Agregar nota..."
                  rows={3}
                />
                <button type="submit" className="btn btn-primary btn-sm">Guardar nota</button>
              </form>
            ) : null}
            {(producer.producerNotes ?? []).map((n) => (
              <div key={n.id} className="note-card">
                <p>{n.content}</p>
                <small>{new Date(n.createdAt).toLocaleString('es-CO')}</small>
              </div>
            ))}
          </div>
        )}
      </EntityDetailLayout>

      {lifecycleOpen && (
        <div className="modal-backdrop" onClick={() => setLifecycleOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Transición de estado</h3>
            <form onSubmit={handleLifecycle} className="form-grid">
              <label>
                Nuevo estado
                <select
                  value={lifecycleStatus}
                  onChange={(e) => setLifecycleStatus(e.target.value)}
                >
                  {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Motivo
                <textarea
                  value={lifecycleReason}
                  onChange={(e) => setLifecycleReason(e.target.value)}
                  rows={3}
                />
              </label>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setLifecycleOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
