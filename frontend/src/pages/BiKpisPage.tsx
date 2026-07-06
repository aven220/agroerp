import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  captureBiKpi,
  createBiKpi,
  getBiKpiHistory,
  listBiKpis,
  type BiKpi,
} from '../api/bi';

export function BiKpisPage() {
  const [kpis, setKpis] = useState<BiKpi[]>([]);
  const [history, setHistory] = useState<Array<{ value: number; capturedAt: string; variancePct?: number }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ kpiKey: '', name: '', targetValue: 100, unit: '' });

  const load = () => listBiKpis().then(setKpis);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    getBiKpiHistory(selectedId).then(setHistory);
  }, [selectedId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createBiKpi({
      ...form,
      queryDef: { dataSource: 'producers', aggregations: [{ field: 'id', fn: 'count', alias: 'value' }] },
      frequency: 'daily',
    });
    setShowForm(false);
    load();
  }

  async function handleCapture(id: string) {
    await captureBiKpi(id);
    load();
    if (selectedId === id) getBiKpiHistory(id).then(setHistory);
  }

  return (
    <>
      <Header
        title="Administrador de KPIs"
        subtitle="Indicadores personalizados con alertas e historial"
        actions={
          <div className="row-actions">
            <Link to="/bi" className="btn">Centro BI</Link>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              Nuevo KPI
            </button>
          </div>
        }
      />

      {showForm && (
        <form className="panel form-panel" onSubmit={handleCreate}>
          <div className="form-row">
            <label>Clave<input required value={form.kpiKey} onChange={(e) => setForm({ ...form, kpiKey: e.target.value })} /></label>
            <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Meta<input type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })} /></label>
            <label>Unidad<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
          </div>
          <button type="submit" className="btn btn-primary">Crear KPI</button>
        </form>
      )}

      <div className="split-layout">
        <section className="panel">
          <h3>KPIs activos</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Actual</th>
                <th>Meta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr key={k.id} className={selectedId === k.id ? 'selected-row' : ''}>
                  <td>
                    <button type="button" className="link-btn" onClick={() => setSelectedId(k.id)}>
                      {k.name}
                    </button>
                    <div className="text-muted">{k.kpiKey}</div>
                  </td>
                  <td>
                    <span style={{ color: k.color ?? undefined }}>
                      {k.history?.[0] ? Number(k.history[0].value) : '—'}
                      {k.unit ? ` ${k.unit}` : ''}
                    </span>
                  </td>
                  <td>{k.targetValue ? Number(k.targetValue) : '—'}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => handleCapture(k.id)}>
                      Capturar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Historial</h3>
          {selectedId ? (
            <table className="data-table data-table-compact">
              <thead>
                <tr><th>Fecha</th><th>Valor</th><th>Var %</th></tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{new Date(h.capturedAt).toLocaleString('es-CO')}</td>
                    <td>{h.value}</td>
                    <td>{h.variancePct ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Seleccione un KPI</p>
          )}
        </section>
      </div>
    </>
  );
}
