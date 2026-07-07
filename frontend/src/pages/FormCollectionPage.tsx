import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { LoadingState } from '../components/ux/LoadingState';
import { listForms, listSubmissions, type FormSubmission } from '../api/forms';
import { formatFormDate } from '../form-studio/form-lifecycle';

const SYNC_LABELS: Record<string, string> = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  failed: 'Error',
};

export function FormCollectionPage() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [formFilter, setFormFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');
  const [search, setSearch] = useState('');
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, formList] = await Promise.all([
        listSubmissions(formFilter ? { formId: formFilter } : undefined),
        listForms(),
      ]);
      setItems(subs);
      setForms(formList.map((f) => ({ id: f.id, name: f.name })));
    } finally {
      setLoading(false);
    }
  }, [formFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (syncFilter && s.syncStatus !== syncFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.form?.name?.toLowerCase().includes(q) ||
        s.form?.formKey?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [items, syncFilter, search]);

  const kpis = useMemo(() => ({
    total: filtered.length,
    synced: filtered.filter((s) => s.syncStatus === 'synced').length,
    pending: filtered.filter((s) => s.syncStatus === 'pending').length,
    failed: filtered.filter((s) => s.syncStatus === 'failed').length,
    withGps: filtered.filter((s) => s.gpsLocation || hasGpsInData(s.data)).length,
    withMedia: filtered.filter((s) => hasMediaInData(s.data)).length,
  }), [filtered]);

  return (
    <>
      <Header
        title="Recolección"
        subtitle="Cada envío es un registro independiente con trazabilidad de sync y evidencias"
      />
      <FormsPlatformNav />

      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Diligenciados</span><span className="kpi-value">{kpis.total}</span></div>
        <div className="kpi-card kpi-green"><span className="kpi-label">Sincronizados</span><span className="kpi-value">{kpis.synced}</span></div>
        <div className="kpi-card"><span className="kpi-label">Pendientes</span><span className="kpi-value">{kpis.pending}</span></div>
        <div className="kpi-card"><span className="kpi-label">Errores</span><span className="kpi-value">{kpis.failed}</span></div>
        <div className="kpi-card"><span className="kpi-label">Con GPS</span><span className="kpi-value">{kpis.withGps}</span></div>
        <div className="kpi-card"><span className="kpi-label">Con multimedia</span><span className="kpi-value">{kpis.withMedia}</span></div>
      </div>

      <div className="filter-bar">
        <input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)}>
          <option value="">Todos los formularios</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)}>
          <option value="">Todo sync</option>
          <option value="synced">Sincronizado</option>
          <option value="pending">Pendiente</option>
          <option value="failed">Error</option>
        </select>
        <button type="button" className="btn btn-sm" onClick={() => load()}>Actualizar</button>
      </div>

      <div className="form-collection-layout">
        <div className="form-collection-list">
          {loading ? <LoadingState variant="table" /> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Formulario</th>
                  <th>Estado</th>
                  <th>Sync</th>
                  <th>GPS</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="muted">Sin registros</td></tr>
                ) : filtered.map((s) => (
                  <tr
                    key={s.id}
                    className={selected?.id === s.id ? 'selected-row' : ''}
                    onClick={() => setSelected(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{s.form?.name ?? s.formId}</td>
                    <td>{s.status}</td>
                    <td><span className={`badge sync-${s.syncStatus}`}>{SYNC_LABELS[s.syncStatus] ?? s.syncStatus}</span></td>
                    <td>{s.gpsLocation || hasGpsInData(s.data) ? '📍' : '—'}</td>
                    <td>{formatFormDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="panel form-collection-detail">
          <h3 className="ds-h4">Detalle del registro</h3>
          {!selected ? (
            <p className="muted">Seleccione un envío para ver campos, GPS y evidencias.</p>
          ) : (
            <>
              <dl className="form-detail-dl">
                <div><dt>ID</dt><dd><code>{selected.id.slice(0, 8)}…</code></dd></div>
                <div><dt>Formulario</dt><dd>{selected.form?.name}</dd></div>
                <div><dt>Versión</dt><dd>v{selected.formVersion}</dd></div>
                <div><dt>Sync</dt><dd>{SYNC_LABELS[selected.syncStatus] ?? selected.syncStatus}</dd></div>
                <div><dt>Fecha</dt><dd>{formatFormDate(selected.createdAt)}</dd></div>
              </dl>
              {selected.gpsLocation ? (
                <p className="form-gps-preview">
                  📍 {selected.gpsLocation.lat?.toFixed?.(5)}, {selected.gpsLocation.lng?.toFixed?.(5)}
                </p>
              ) : null}
              <h4>Respuestas</h4>
              <dl className="form-submission-fields">
                {Object.entries(selected.data ?? {}).map(([key, val]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{formatValue(val)}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/formularios/exportar" className="btn btn-sm">Exportar datos</Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function hasGpsInData(data: Record<string, unknown>): boolean {
  return Object.values(data ?? {}).some(
    (v) => v && typeof v === 'object' && 'lat' in (v as object) && 'lng' in (v as object),
  );
}

function hasMediaInData(data: Record<string, unknown>): boolean {
  const s = JSON.stringify(data ?? {}).toLowerCase();
  return s.includes('photo') || s.includes('image') || s.includes('signature') || s.includes('file');
}

function formatValue(val: unknown): string {
  if (val == null) return '—';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
