import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getEimsCountsCenter,
  listEimsCounts,
  listEimsItems,
  listEimsWarehouses,
  planEimsCount,
  startEimsCount,
} from '../api/eims';

export function EimsCountsPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: 'Conteo físico',
    countType: 'warehouse',
    warehouseKey: '',
    itemKey: '',
    toleranceQtyPct: '0',
    approvalLevels: '1',
    requireSecondCount: true,
    assigneeId: '',
    assigneeName: '',
  });

  const reload = async () => {
    const [c, list, w, i] = await Promise.all([
      getEimsCountsCenter(),
      listEimsCounts(),
      listEimsWarehouses(),
      listEimsItems(),
    ]);
    setCenter(c);
    setRows(list as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
    setItems(i as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const plan = async () => {
    await planEimsCount({
      name: form.name,
      countType: form.countType,
      warehouseKeys: form.warehouseKey ? [form.warehouseKey] : undefined,
      itemKeys: form.itemKey ? [form.itemKey] : undefined,
      toleranceQtyPct: Number(form.toleranceQtyPct) || 0,
      approvalLevels: Number(form.approvalLevels) || 1,
      requireSecondCount: form.requireSecondCount,
      scheduledStart: new Date().toISOString(),
      assignees: form.assigneeId
        ? [{ userId: form.assigneeId, userName: form.assigneeName || 'Responsable', roleKey: 'counter' }]
        : undefined,
    });
    await reload();
  };

  return (
    <>
      <Header
        title="Centro de conteos físicos"
        subtitle="Planificación, ejecución, conciliación y actas"
        actions={
          <>
            <Link to="/inventario/conteos/historial" className="btn">Historial</Link>
            <Link to="/inventario/conteos/actas" className="btn">Actas</Link>
            <Link to="/inventario" className="btn">EIMS</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Sesiones</span><span className="kpi-value">{String(center.sessionsCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Abiertos</span><span className="kpi-value">{String(center.openCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Pend. aprobación</span><span className="kpi-value">{String(center.pendingApprovalCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cerrados</span><span className="kpi-value">{String(center.closedCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Variaciones</span><span className="kpi-value">{String(center.openVariances ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Ajustes pend.</span><span className="kpi-value">{String(center.pendingAdjustments ?? 0)}</span></div>
        </div>
      ) : null}
      <section className="panel">
        <h3>Programar conteo</h3>
        <div className="row-actions">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.countType} onChange={(e) => setForm({ ...form, countType: e.target.value })}>
            <option value="general">general</option>
            <option value="cyclic">cyclic</option>
            <option value="partial">partial</option>
            <option value="warehouse">warehouse</option>
            <option value="location">location</option>
            <option value="category">category</option>
            <option value="lot">lot</option>
            <option value="item">item</option>
            <option value="extraordinary">extraordinary</option>
          </select>
          <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
            <option value="">Bodega</option>
            {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
          </select>
          <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
            <option value="">Artículo</option>
            {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
          </select>
          <input placeholder="Tolerancia %" value={form.toleranceQtyPct} onChange={(e) => setForm({ ...form, toleranceQtyPct: e.target.value })} />
          <input placeholder="Niveles aprobación" value={form.approvalLevels} onChange={(e) => setForm({ ...form, approvalLevels: e.target.value })} />
          <input placeholder="User ID responsable" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} />
          <input placeholder="Nombre responsable" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} />
          <label>
            <input type="checkbox" checked={form.requireSecondCount} onChange={(e) => setForm({ ...form, requireSecondCount: e.target.checked })} />
            2º conteo
          </label>
          <button className="btn btn-primary" onClick={() => plan().catch((e) => setError(e.message))}>Programar</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Líneas</th>
              <th>Capturas</th>
              <th>Variaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const counts = (r._count as Record<string, number>) ?? {};
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.countKey)}</td>
                  <td>{String(r.name)}</td>
                  <td>{String(r.countType)}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(counts.lines ?? 0)}</td>
                  <td>{String(counts.captures ?? 0)}</td>
                  <td>{String(counts.variances ?? 0)}</td>
                  <td className="row-actions">
                    {['draft', 'scheduled'].includes(String(r.status)) ? (
                      <button className="btn" onClick={() => startEimsCount(String(r.countKey)).then(reload).catch((e) => setError(e.message))}>
                        Iniciar
                      </button>
                    ) : null}
                    <Link to={`/inventario/conteos/${encodeURIComponent(String(r.countKey))}`}>Abrir</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
