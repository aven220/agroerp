import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { LoadingState } from '../components/ux/LoadingState';
import { useAuth } from '../context/AuthContext';
import { buildRecordExplorerPath } from '../record-explorer/types';
import {
  addProducerNote,
  getProducer,
  getProducerTimeline,
  transitionLifecycle,
  type Producer,
  type TimelineItem,
} from '../api/prm';

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pre_registered: 'Pre-registro',
  pending_approval: 'Pendiente aprobación',
  active: 'Activo',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

type Tab = 'perfil' | 'contactos' | 'fincas' | 'certificaciones' | 'documentos' | 'timeline' | 'notas';

export function ProducerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [producer, setProducer] = useState<Producer | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tab, setTab] = useState<Tab>('perfil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [lifecycleReason, setLifecycleReason] = useState('');

  useEffect(() => {
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
    if (!id) return;
    const destructive = ['suspended', 'inactive', 'archived'].includes(lifecycleStatus);
    if (
      destructive &&
      !confirm(
        `¿Cambiar el estado del productor a «${LIFECYCLE_LABELS[lifecycleStatus] ?? lifecycleStatus}»?`,
      )
    ) {
      return;
    }
    try {
      await transitionLifecycle(id, {
        toStatus: lifecycleStatus,
        reasonNotes: lifecycleReason,
      });
      setLifecycleOpen(false);
      const [p, tl] = await Promise.all([getProducer(id), getProducerTimeline(id)]);
      setProducer(p);
      setTimeline(tl.items);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    }
  }

  if (loading) return <LoadingState variant="page" message="Cargando expediente..." />;
  if (error || !producer) return <div className="alert alert-error">{error ?? 'No encontrado'}</div>;

  return (
    <>
      <Header
        title={producer.legalName}
        subtitle={`${producer.producerNumber} · ${LIFECYCLE_LABELS[producer.lifecycleStatus] ?? producer.lifecycleStatus}`}
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => navigate('/productores')}>
              Volver
            </button>
            {hasPermission('producer:read') && id ? (
              <Link to={buildRecordExplorerPath('producer', id)} className="btn">
                Expediente 360°
              </Link>
            ) : null}
            <button type="button" className="btn" onClick={() => setLifecycleOpen(true)}>
              Cambiar estado
            </button>
            {hasPermission('producer:update') ? (
              <Link to={`/productores/${id}/editar`} className="btn btn-primary">
                Editar
              </Link>
            ) : null}
          </div>
        }
      />

      <FlowProgress flowId="agricultural" currentStepId="producer" />

      {id ? (
        <FlowNextActions
          title="Continuar registro agrícola"
          subtitle="Complete el expediente territorial del productor."
          actions={[
            ...(hasPermission('farm:create')
              ? [
                  {
                    label: 'Registrar finca',
                    description: 'Asocie la primera unidad territorial',
                    to: `/fincas/nueva?productor=${id}`,
                    primary: true,
                    icon: '🏡',
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
            {
              label: 'Ver indicadores',
              description: 'Dashboard y métricas del módulo PRM',
              to: '/productores/dashboard',
              icon: '📊',
            },
          ]}
        />
      ) : null}

      {actionError ? <div className="alert alert-error">{actionError}</div> : null}
      <div className="detail-scores">
        <div className="score-chip">Calidad: {producer.qualityScore}</div>
        <div className="score-chip">Riesgo: {producer.riskScore}</div>
        {producer.categoryCode && <div className="score-chip">Cat. {producer.categoryCode}</div>}
      </div>

      <nav className="tab-nav">
        {(['perfil', 'contactos', 'fincas', 'certificaciones', 'documentos', 'timeline', 'notas'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {tab === 'perfil' && (
          <div className="detail-grid">
            <div className="detail-section">
              <h3>Identificación</h3>
              <dl>
                <dt>Tipo</dt><dd>{producer.producerTypeCode}</dd>
                <dt>Documento</dt><dd>{producer.documentTypeCode} {producer.documentNumber}</dd>
                <dt>Nombres</dt><dd>{producer.firstName} {producer.lastName}</dd>
                <dt>Municipio</dt><dd>{producer.municipalityCode ?? '—'}</dd>
                <dt>Vereda</dt><dd>{producer.veredaCode ?? '—'}</dd>
                <dt>Experiencia</dt><dd>{producer.yearsExperience ?? '—'} años</dd>
              </dl>
            </div>
            <div className="detail-section">
              <h3>Comercial</h3>
              <dl>
                <dt>Categoría</dt><dd>{producer.categoryCode ?? '—'}</dd>
                <dt>Origen</dt><dd>{producer.leadSourceCode ?? '—'}</dd>
                <dt>Registrado</dt><dd>{new Date(producer.registeredAt).toLocaleDateString('es-CO')}</dd>
                <dt>Activado</dt><dd>{producer.activatedAt ? new Date(producer.activatedAt).toLocaleDateString('es-CO') : '—'}</dd>
              </dl>
            </div>
            {producer.latitude != null && producer.longitude != null && (
              <div className="detail-section">
                <h3>Ubicación</h3>
                <p>{Number(producer.latitude).toFixed(5)}, {Number(producer.longitude).toFixed(5)}</p>
                <a
                  href={`https://www.google.com/maps?q=${producer.latitude},${producer.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                >
                  Ver en mapa
                </a>
              </div>
            )}
          </div>
        )}

        {tab === 'contactos' && (
          <div>
            {(producer.contacts ?? []).length === 0 ? (
              <p className="muted">Sin contactos registrados</p>
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
            <form onSubmit={handleAddNote} className="note-form">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Agregar nota..."
                rows={3}
              />
              <button type="submit" className="btn btn-primary btn-sm">Guardar nota</button>
            </form>
            {(producer.producerNotes ?? []).map((n) => (
              <div key={n.id} className="note-card">
                <p>{n.content}</p>
                <small>{new Date(n.createdAt).toLocaleString('es-CO')}</small>
              </div>
            ))}
          </div>
        )}
      </div>

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
