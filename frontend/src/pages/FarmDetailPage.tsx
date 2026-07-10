import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  PageActions,
  PageState,
  EntityMetadata,
  MetadataChip,
  EntityDetailLayout,
  type EntityTab,
} from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { ProcessWorkspacePanel } from '../components/process/ProcessWorkspacePanel';
import { PinRecordButton } from '../components/guided-workspace/PinRecordButton';
import { useAuth } from '../context/AuthContext';
import { updateWorkEntityLabel } from '../lib/workEntityHistory';
import { buildRecordExplorerPath } from '../record-explorer/types';
import {
  addFarmDocument,
  addFarmLot,
  getFarm,
  getFarmTimeline,
  getFarmTwin,
  transitionFarmLifecycle,
  type FarmDigitalTwin,
  type FarmUnit,
  type TerritoryDocument,
} from '../api/ftip';
import { startFarmApprovalWorkflow } from '../lib/workflowIntegration';
import { storeDocumentFile } from '../lib/documentStorage';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_validation: 'En validación',
  active: 'Activa',
  inactive: 'Inactiva',
  abandoned: 'Abandonada',
};

const FARM_TABS: EntityTab[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'twin', label: 'Indicadores' },
  { id: 'lotes', label: 'Lotes' },
  { id: 'geometria', label: 'Geometria' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'timeline', label: 'Historial' },
  { id: 'productores', label: 'Productores' },
];

type Tab = (typeof FARM_TABS)[number]['id'];

export function FarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const [farm, setFarm] = useState<FarmUnit | null>(null);
  const [twin, setTwin] = useState<FarmDigitalTwin | null>(null);
  const [timeline, setTimeline] = useState<Array<{
    type: string;
    id: string;
    occurredAt: string;
    title: string;
    detail?: string;
  }>>([]);
  const [tab, setTab] = useState<Tab>('perfil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('photo');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [lotCode, setLotCode] = useState('');
  const canLifecycle = hasPermission('farm:approve');
  const canUpdate = hasPermission('farm:update');
  const canCreateLot = hasPermission('lot:create');
  const canUploadDoc = hasPermission('document:upload');

  async function reload() {
    if (!id) return;
    const [f, tl, tw] = await Promise.all([
      getFarm(id),
      getFarmTimeline(id),
      getFarmTwin(id),
    ]);
    setFarm(f);
    setTimeline(tl.items);
    setTwin(tw.twin);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['farm', 'workflow'], id, 'Farm');

  useEffect(() => {
    if (!id || !farm) return;
    updateWorkEntityLabel(user?.id, 'farm', id, farm.farmName);
  }, [id, farm?.farmName, user?.id]);

  async function handleLifecycle(e: React.FormEvent) {
    e.preventDefault();
    if (!id || lifecycleBusy) return;
    setLifecycleBusy(true);
    try {
      await transitionFarmLifecycle(id, {
        toStatus: lifecycleStatus,
        reasonNotes: lifecycleReason,
      });
      if (lifecycleStatus === 'under_validation') {
        await startFarmApprovalWorkflow(id, {
          farmName: farm?.farmName,
          farmCode: farm?.farmCode,
        });
      }
      notifyEntityUpdated('farm', id);
      setLifecycleOpen(false);
      setActionError(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !docTitle.trim() || !docFile || !user || docUploading) return;
    setDocUploading(true);
    try {
      const stored = await storeDocumentFile(docFile, user.organizationId);
      await addFarmDocument(id, {
        title: docTitle.trim(),
        documentTypeCode: docType,
        contentId: stored.contentId,
        mediaType: stored.mimeType,
      });
      setDocTitle('');
      setDocFile(null);
      notifyEntityUpdated('document', stored.contentId);
      notifyEntityUpdated('farm', id);
      setActionError(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo agregar el documento');
    } finally {
      setDocUploading(false);
    }
  }

  async function handleAddLot(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !lotCode.trim()) return;
    try {
      await addFarmLot(id, { lotCode, lotName: `Lote ${lotCode}` });
      setLotCode('');
      notifyEntityUpdated('farm', id);
      setActionError(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo agregar el lote');
    }
  }

  if (loading) return <PageState variant="loading" message="Cargando expediente..." />;
  if (error || !farm) {
    return <PageState variant="error" message={error ?? 'Finca no encontrada'} onRetry={() => reload().catch(() => undefined)} />;
  }

  const mediaDocs = (farm.documents ?? []).filter((d) =>
    ['photo', 'video', 'image'].some((t) => d.documentTypeCode.includes(t) || d.mediaType?.includes('image') || d.mediaType?.includes('video')),
  );

  return (
    <>
      <Header
        title={farm.farmName}
        subtitle={`${farm.farmCode} · ${STATUS_LABELS[farm.status] ?? farm.status}`}
        actions={
          <PageActions>
            {id ? (
              <PinRecordButton
                kind="farm"
                id={id}
                label={farm.farmName}
                to={`/fincas/${id}`}
              />
            ) : null}
            <button type="button" className="btn" onClick={() => navigate('/fincas')}>
              Volver
            </button>
            {hasPermission('farm:read') && id ? (
              <Link to={buildRecordExplorerPath('farm', id)} className="btn">
                Expediente 360°
              </Link>
            ) : null}
            {canLifecycle ? (
              <button type="button" className="btn" onClick={() => setLifecycleOpen(true)}>
                Cambiar estado
              </button>
            ) : null}
            {canUpdate ? (
              <Link to={`/fincas/${id}/editar`} className="btn btn-primary">
                Editar
              </Link>
            ) : null}
          </PageActions>
        }
      />

      {actionError ? <div className="alert alert-error">{actionError}</div> : null}

      <FlowProgress flowId="agricultural" currentStepId="farm" />

      <ProcessWorkspacePanel
        flowId="agricultural"
        currentStepId="farm"
        entityName={farm.farmName}
      />

      {id ? (
        <FlowNextActions
          title="Continuar con…"
          subtitle="Registre lotes y consulte el expediente territorial."
          actions={[
            ...(hasPermission('lot:create')
              ? [
                  {
                    label: 'Registrar lote',
                    description: 'Siguiente paso: unidad productiva en esta finca',
                    to: `/lotes/nuevo?finca=${id}`,
                    primary: true,
                    icon: '🌱',
                  },
                ]
              : []),
            ...(hasPermission('eatp:read')
              ? [
                  {
                    label: 'Registrar cultivo',
                    description: 'Asocie variedades y stands productivos',
                    to: '/plataforma-agritech/cultivos',
                    icon: '☕',
                  },
                ]
              : []),
            ...(hasPermission('farm:read')
              ? [
                  {
                    label: 'Expediente 360°',
                    description: 'Vista unificada de la finca',
                    to: buildRecordExplorerPath('farm', id),
                    icon: '📂',
                  },
                ]
              : []),
            ...(hasPermission('farm:read')
              ? [
                  {
                    label: 'Indicadores de fincas',
                    description: 'Indicadores territoriales de la finca',
                    to: '/fincas/dashboard',
                    icon: '📊',
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      <EntityDetailLayout
        tabs={FARM_TABS}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
        metadata={
          twin ? (
            <EntityMetadata>
              <MetadataChip>Lotes: {twin.lotCount}</MetadataChip>
              <MetadataChip>Cultivos activos: {twin.activeCropStandCount}</MetadataChip>
              <MetadataChip>Docs: {twin.documentCompletenessPct}%</MetadataChip>
              {twin.productionYtdKg != null ? (
                <MetadataChip>Prod. YTD: {twin.productionYtdKg} kg</MetadataChip>
              ) : null}
            </EntityMetadata>
          ) : null
        }
      >
        {tab === 'perfil' && (
          <div className="detail-grid">
            <div className="detail-section">
              <h3>Identificación</h3>
              <dl>
                <dt>Código</dt><dd>{farm.farmCode}</dd>
                <dt>Tipo</dt><dd>{farm.farmTypeCode}</dd>
                <dt>Municipio</dt><dd>{farm.municipalityCode ?? '—'}</dd>
                <dt>Vereda</dt><dd>{farm.veredaCode ?? '—'}</dd>
                <dt>Tenencia</dt><dd>{farm.tenureTypeCode ?? '—'}</dd>
              </dl>
            </div>
            <div className="detail-section">
              <h3>Áreas</h3>
              <dl>
                <dt>Total</dt><dd>{farm.totalAreaHa != null ? `${Number(farm.totalAreaHa).toFixed(2)} ha` : '—'}</dd>
                <dt>Agrícola</dt><dd>{farm.agriculturalAreaHa != null ? `${Number(farm.agriculturalAreaHa).toFixed(2)} ha` : '—'}</dd>
                <dt>Bosque</dt><dd>{farm.forestAreaHa != null ? `${Number(farm.forestAreaHa).toFixed(2)} ha` : '—'}</dd>
                <dt>Confianza geom.</dt><dd>{farm.geometryConfidence ?? '—'}</dd>
              </dl>
            </div>
            {farm.centroidLatitude != null && (
              <div className="detail-section">
                <h3>Ubicación</h3>
                <p>{Number(farm.centroidLatitude).toFixed(5)}, {Number(farm.centroidLongitude).toFixed(5)}</p>
                <a
                  href={`https://www.google.com/maps?q=${farm.centroidLatitude},${farm.centroidLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                >
                  Ver en mapa
                </a>
              </div>
            )}
            {farm.observations && (
              <div className="detail-section">
                <h3>Observaciones</h3>
                <p>{farm.observations}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'twin' && twin && (
          <div className="detail-grid">
            <div className="detail-section">
              <h3>Indicadores temáticos</h3>
              <dl>
                {Object.entries(twin.thematicIndicators).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt><dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="detail-section">
              <h3>Proyección IA</h3>
              <dl>
                {Object.entries(twin.aiProjection).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {twin.riskFlags.length > 0 && (
              <div className="detail-section">
                <h3>Banderas de riesgo</h3>
                <ul className="link-list">
                  {twin.riskFlags.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'lotes' && (
          <div>
            {canCreateLot ? (
              <form onSubmit={handleAddLot} className="inline-form row-actions">
                <input
                  placeholder="Código lote"
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                />
                <button type="submit" className="btn btn-sm btn-primary">Agregar lote</button>
              </form>
            ) : null}
            {(farm.lots ?? []).length === 0 ? (
              <p className="muted">Sin lotes registrados</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Código</th><th>Nombre</th><th>Área (ha)</th><th>Estado</th><th>Cultivos</th><th>Lotes</th></tr>
                </thead>
                <tbody>
                  {farm.lots!.map((l) => (
                    <tr key={l.id}>
                      <td>{l.lotCode}</td>
                      <td>
                        {l.fieldLotProfile?.id ? (
                          <Link to={`/lotes/${l.fieldLotProfile.id}`}>{l.lotName ?? '—'}</Link>
                        ) : (
                          l.lotName ?? '—'
                        )}
                      </td>
                      <td>{l.areaHa != null ? Number(l.areaHa).toFixed(2) : '—'}</td>
                      <td>{l.status}</td>
                      <td>{l.cropStands?.map((c) => c.speciesCode).join(', ') || '—'}</td>
                      <td>
                        {!l.fieldLotProfile?.id && canCreateLot && id ? (
                          <Link to={`/lotes/nuevo?finca=${id}`} className="btn btn-sm">Registrar lote</Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'geometria' && (
          <div className="detail-section">
            <h3>Polígono / georreferenciación</h3>
            {farm.boundaryGeo ? (
              <>
                <pre className="code-block">{JSON.stringify(farm.boundaryGeo, null, 2)}</pre>
                {farm.centroidLatitude != null && (
                  <div className="map-embed">
                    <iframe
                      title="Mapa finca"
                      width="100%"
                      height="300"
                      style={{ border: 0, borderRadius: 8 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(farm.centroidLongitude) - 0.02}%2C${Number(farm.centroidLatitude) - 0.02}%2C${Number(farm.centroidLongitude) + 0.02}%2C${Number(farm.centroidLatitude) + 0.02}&layer=mapnik&marker=${farm.centroidLatitude}%2C${farm.centroidLongitude}`}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Sin polígono registrado. Edite la finca para cargar GeoJSON.</p>
            )}
          </div>
        )}

        {tab === 'documentos' && (
          <div>
            {canUploadDoc ? (
              <form onSubmit={handleAddDocument} className="inline-form row-actions">
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="photo">Fotografía</option>
                  <option value="video">Video</option>
                  <option value="contract">Contrato</option>
                  <option value="title_deed">Escritura</option>
                  <option value="signature">Firma</option>
                </select>
                <input
                  placeholder="Título documento"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
                <button type="submit" className="btn btn-sm btn-primary" disabled={docUploading || !docFile}>
                  {docUploading ? 'Subiendo…' : 'Registrar'}
                </button>
              </form>
            ) : null}
            {(farm.documents ?? []).length === 0 ? (
              <p className="muted">Sin documentos indexados</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Tipo</th><th>Título</th><th>Media</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {farm.documents!.map((d: TerritoryDocument) => (
                    <tr key={d.id}>
                      <td>{d.documentTypeCode}</td>
                      <td>{d.title}</td>
                      <td>{d.mediaType ?? '—'}</td>
                      <td>{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'galeria' && (
          <div className="gallery-grid">
            {mediaDocs.length === 0 ? (
              <p className="muted">Sin fotografías o videos en galería</p>
            ) : (
              mediaDocs.map((d) => (
                <div key={d.id} className="gallery-item">
                  <div className="gallery-thumb">
                    {d.mediaType?.includes('video') ? '🎬' : '📷'}
                  </div>
                  <span>{d.title}</span>
                  <small>{d.documentTypeCode}</small>
                </div>
              ))
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

        {tab === 'productores' && (
          <div>
            {(farm.producerLinks ?? []).length === 0 ? (
              <p className="muted">Sin productores vinculados</p>
            ) : (
              <ul className="link-list">
                {farm.producerLinks!.map((l) => (
                  <li key={l.id}>
                    <Link to={`/productores/${l.producerId}`}>
                      {l.producer?.legalName ?? l.producerId}
                    </Link>
                    {' — '}{l.relationshipType}
                    {l.isPrimary && ' (principal)'}
                  </li>
                ))}
              </ul>
            )}
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
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
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
