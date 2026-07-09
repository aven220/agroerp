import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { LoadingState } from '../components/ux/LoadingState';
import { useAuth } from '../context/AuthContext';
import { buildRecordExplorerPath } from '../record-explorer/types';
import {
  addFieldOperation,
  addLotDocument,
  getLot,
  getLotTimeline,
  getLotTwin,
  listOperationTypes,
  transitionLotLifecycle,
  type FieldLotProfile,
  type LotDigitalTwin,
} from '../api/fmdt';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  fallow: 'Barbecho',
  renovation: 'Renovación',
  inactive: 'Inactivo',
  abandoned: 'Abandonado',
};

type Tab = 'perfil' | 'twin' | 'labores' | 'costos' | 'cosechas' | 'geometria' | 'documentos' | 'galeria' | 'timeline';

export function LotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [lot, setLot] = useState<FieldLotProfile | null>(null);
  const [twin, setTwin] = useState<LotDigitalTwin | null>(null);
  const [timeline, setTimeline] = useState<Array<{
    type: string;
    id: string;
    occurredAt: string;
    title: string;
    detail?: string;
  }>>([]);
  const [operationTypes, setOperationTypes] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('perfil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('photo');
  const [opType, setOpType] = useState('fertilization');
  const [opArea, setOpArea] = useState('');

  async function reload() {
    if (!id) return;
    const [l, tl, tw] = await Promise.all([
      getLot(id),
      getLotTimeline(id),
      getLotTwin(id),
    ]);
    setLot(l);
    setTimeline(tl.items);
    setTwin(tw.twin);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([reload(), listOperationTypes().then((r) => setOperationTypes(r.items))])
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLifecycle(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    await transitionLotLifecycle(id, {
      toStatus: lifecycleStatus,
      reasonNotes: lifecycleReason,
    });
    setLifecycleOpen(false);
    await reload();
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !docTitle.trim()) return;
    await addLotDocument(id, {
      title: docTitle,
      documentTypeCode: docType,
      contentId: crypto.randomUUID(),
      mediaType: docType === 'video' ? 'video/mp4' : 'image/jpeg',
    });
    setDocTitle('');
    await reload();
  }

  async function handleAddOperation(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !opArea) return;
    await addFieldOperation(id, {
      operationTypeCode: opType,
      operationDate: new Date().toISOString().slice(0, 10),
      performedByType: 'technician',
      areaTreatedHa: Number(opArea),
    });
    setOpArea('');
    await reload();
  }

  if (loading) return <LoadingState variant="page" message="Cargando expediente..." />;
  if (error || !lot) return <div className="alert alert-error">{error ?? 'No encontrado'}</div>;

  const mediaDocs = (lot.documents ?? []).filter((d) =>
    ['photo', 'video', 'image'].some((t) => d.documentTypeCode.includes(t) || d.mediaType?.includes('image') || d.mediaType?.includes('video')),
  );

  return (
    <>
      <Header
        title={lot.lotName}
        subtitle={`${lot.lotCode} · ${STATUS_LABELS[lot.status] ?? lot.status}`}
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => navigate('/lotes')}>
              Volver
            </button>
            {lot.farmUnit && (
              <Link to={`/fincas/${lot.farmUnitId}`} className="btn">
                Ver finca
              </Link>
            )}
            {hasPermission('lot:read') && id ? (
              <Link to={buildRecordExplorerPath('lot', id)} className="btn">
                Expediente 360°
              </Link>
            ) : null}
            <button type="button" className="btn" onClick={() => setLifecycleOpen(true)}>
              Cambiar estado
            </button>
            {hasPermission('lot:update') ? (
              <Link to={`/lotes/${id}/editar`} className="btn btn-primary">
                Editar
              </Link>
            ) : null}
          </div>
        }
      />

      <FlowProgress flowId="agricultural" currentStepId="lot" />

      {id ? (
        <FlowNextActions
          title="Continuar con…"
          subtitle="Consulte el expediente completo y los indicadores del lote."
          actions={[
            ...(hasPermission('lot:read')
              ? [
                  {
                    label: 'Expediente 360°',
                    description: 'Vista unificada del lote productivo',
                    to: buildRecordExplorerPath('lot', id),
                    primary: true,
                    icon: '📂',
                  },
                ]
              : []),
            {
              label: 'Indicadores de lotes',
              description: 'Dashboard agronómico FMDT',
              to: '/lotes/dashboard',
              icon: '📊',
            },
            ...(lot.farmUnitId
              ? [
                  {
                    label: 'Ver finca asociada',
                    description: lot.farmUnit?.farmName ?? 'Regreso al contexto territorial',
                    to: `/fincas/${lot.farmUnitId}`,
                    icon: '🏡',
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      {twin && (
        <div className="detail-scores">
          <div className="score-chip">Prod. YTD: {twin.productionYtdKg ?? 0} kg</div>
          <div className="score-chip">Rend.: {twin.avgYieldKgHa ?? 0} kg/ha</div>
          <div className="score-chip">Calidad: {twin.qualityAvgScore ?? '—'}</div>
          <div className="score-chip">Labores YTD: {twin.operationsCountYtd}</div>
          {twin.riskFlags.length > 0 && (
            <div className="score-chip score-warn">Riesgos: {twin.riskFlags.length}</div>
          )}
        </div>
      )}

      <nav className="tab-nav">
        {(['perfil', 'twin', 'labores', 'costos', 'cosechas', 'geometria', 'documentos', 'galeria', 'timeline'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'twin' ? 'Indicadores' : t === 'timeline' ? 'Historial' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {tab === 'perfil' && (
          <div className="detail-grid">
            <div className="detail-section">
              <h3>Identificación</h3>
              <dl>
                <dt>Código</dt><dd>{lot.lotCode}</dd>
                <dt>Tipo</dt><dd>{lot.lotTypeCode}</dd>
                <dt>Finca</dt>
                <dd>
                  {lot.farmUnit ? (
                    <Link to={`/fincas/${lot.farmUnitId}`}>{lot.farmUnit.farmName}</Link>
                  ) : '—'}
                </dd>
                <dt>Productor</dt>
                <dd>{lot.responsibleProducer?.legalName ?? '—'}</dd>
                <dt>Cultivo</dt>
                <dd>{lot.agronomicStates?.[0]?.primaryCropCode ?? '—'}</dd>
                <dt>Variedades</dt>
                <dd>{lot.agronomicStates?.[0]?.varietyCodes?.join(', ') || '—'}</dd>
              </dl>
            </div>
            <div className="detail-section">
              <h3>Áreas</h3>
              <dl>
                <dt>Total</dt><dd>{lot.totalAreaHa != null ? `${Number(lot.totalAreaHa).toFixed(2)} ha` : '—'}</dd>
                <dt>Cultivable</dt><dd>{lot.cultivableAreaHa != null ? `${Number(lot.cultivableAreaHa).toFixed(2)} ha` : '—'}</dd>
                <dt>Sembrada</dt><dd>{lot.plantedAreaHa != null ? `${Number(lot.plantedAreaHa).toFixed(2)} ha` : '—'}</dd>
              </dl>
            </div>
            {lot.centroidLatitude != null && (
              <div className="detail-section">
                <h3>Ubicación</h3>
                <p>{Number(lot.centroidLatitude).toFixed(5)}, {Number(lot.centroidLongitude).toFixed(5)}</p>
                <a
                  href={`https://www.google.com/maps?q=${lot.centroidLatitude},${lot.centroidLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                >
                  Ver en mapa
                </a>
              </div>
            )}
            {lot.observations && (
              <div className="detail-section">
                <h3>Observaciones</h3>
                <p>{lot.observations}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'twin' && twin && (
          <div className="detail-grid">
            <div className="detail-section">
              <h3>Producción y costos</h3>
              <dl>
                <dt>Producción YTD</dt><dd>{twin.productionYtdKg ?? 0} kg</dd>
                <dt>Estimada</dt><dd>{twin.expectedYieldKgHa ?? 0} kg/ha</dd>
                <dt>Costo YTD</dt><dd>${Number(twin.totalCostYtd ?? 0).toLocaleString('es-CO')}</dd>
                <dt>Costo/ha</dt><dd>${Number(twin.costPerHa ?? 0).toLocaleString('es-CO')}</dd>
                <dt>Margen</dt><dd>{twin.marginPct != null ? `${twin.marginPct}%` : '—'}</dd>
              </dl>
            </div>
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

        {tab === 'labores' && (
          <div>
            <form onSubmit={handleAddOperation} className="inline-form row-actions">
              <select value={opType} onChange={(e) => setOpType(e.target.value)}>
                {(operationTypes.length ? operationTypes : ['fertilization', 'harvest', 'pruning']).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                placeholder="Área tratada (ha)"
                value={opArea}
                onChange={(e) => setOpArea(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-primary">Registrar labor</button>
            </form>
            {(lot.operations ?? []).length === 0 ? (
              <p className="muted">Sin labores registradas</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Tipo</th><th>Área (ha)</th><th>Costo</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {lot.operations!.map((op) => (
                    <tr key={op.id}>
                      <td>{op.operationDate}</td>
                      <td>{op.operationTypeCode}</td>
                      <td>{Number(op.areaTreatedHa).toFixed(2)}</td>
                      <td>{op.totalCost != null ? `$${Number(op.totalCost).toLocaleString('es-CO')}` : '—'}</td>
                      <td>{op.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'costos' && (
          <div>
            {(lot.costEntries ?? []).length === 0 ? (
              <p className="muted">Sin costos registrados</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Campaña</th><th>Categoría</th><th>Monto</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {lot.costEntries!.map((c) => (
                    <tr key={c.id}>
                      <td>{c.campaignCode}</td>
                      <td>{c.costCategoryCode}</td>
                      <td>${Number(c.amount).toLocaleString('es-CO')}</td>
                      <td>{c.approvalStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'cosechas' && (
          <div>
            {(lot.harvestRecords ?? []).length === 0 ? (
              <p className="muted">Sin registros de cosecha</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Campaña</th><th>Estimado (kg)</th><th>Real (kg)</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {lot.harvestRecords!.map((h) => (
                    <tr key={h.id}>
                      <td>{h.campaignCode}</td>
                      <td>{h.estimatedKg ?? '—'}</td>
                      <td>{h.actualKg ?? '—'}</td>
                      <td>{h.status}</td>
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
            {lot.boundaryGeoRef ? (
              <>
                <pre className="code-block">{JSON.stringify(lot.boundaryGeoRef, null, 2)}</pre>
                {lot.centroidLatitude != null && (
                  <div className="map-embed">
                    <iframe
                      title="Mapa lote"
                      width="100%"
                      height="300"
                      style={{ border: 0, borderRadius: 8 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lot.centroidLongitude) - 0.02}%2C${Number(lot.centroidLatitude) - 0.02}%2C${Number(lot.centroidLongitude) + 0.02}%2C${Number(lot.centroidLatitude) + 0.02}&layer=mapnik&marker=${lot.centroidLatitude}%2C${lot.centroidLongitude}`}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Sin polígono registrado. Edite el lote para cargar GeoJSON.</p>
            )}
          </div>
        )}

        {tab === 'documentos' && (
          <div>
            <form onSubmit={handleAddDocument} className="inline-form row-actions">
              <input
                placeholder="Título documento"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="photo">Fotografía</option>
                <option value="video">Video</option>
                <option value="certificate">Certificado</option>
                <option value="report">Informe</option>
              </select>
              <button type="submit" className="btn btn-sm btn-primary">Agregar</button>
            </form>
            {(lot.documents ?? []).length === 0 ? (
              <p className="muted">Sin documentos</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Título</th><th>Tipo</th><th>Media</th></tr>
                </thead>
                <tbody>
                  {lot.documents!.map((d) => (
                    <tr key={d.id}>
                      <td>{d.title}</td>
                      <td>{d.documentTypeCode}</td>
                      <td>{d.mediaType ?? '—'}</td>
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
              <p className="muted">Sin multimedia</p>
            ) : (
              mediaDocs.map((d) => (
                <div key={d.id} className="gallery-item">
                  <strong>{d.title}</strong>
                  <span className="muted">{d.documentTypeCode}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <ul className="timeline">
            {timeline.length === 0 ? (
              <li className="muted">Sin eventos</li>
            ) : (
              timeline.map((ev) => (
                <li key={ev.id}>
                  <time>{new Date(ev.occurredAt).toLocaleString('es-CO')}</time>
                  <strong>{ev.title}</strong>
                  {ev.detail && <p>{ev.detail}</p>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {lifecycleOpen && (
        <div className="modal-overlay" onClick={() => setLifecycleOpen(false)}>
          <form className="modal-panel" onSubmit={handleLifecycle} onClick={(e) => e.stopPropagation()}>
            <h3>Cambiar estado del lote</h3>
            <select value={lifecycleStatus} onChange={(e) => setLifecycleStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <textarea
              placeholder="Motivo / observaciones"
              value={lifecycleReason}
              onChange={(e) => setLifecycleReason(e.target.value)}
            />
            <div className="row-actions">
              <button type="button" className="btn" onClick={() => setLifecycleOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Confirmar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
