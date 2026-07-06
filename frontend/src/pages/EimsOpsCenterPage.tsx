import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  getEimsExecutiveDashboard,
  getEimsOpsCenter,
  getEimsOperationalDashboard,
  refreshEimsOpsAlerts,
} from '../api/eims';

export function EimsOpsCenterPage() {
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [executive, setExecutive] = useState<Record<string, unknown> | null>(null);
  const [operational, setOperational] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const reload = async () => {
    const [o, e, op] = await Promise.all([
      getEimsOpsCenter(),
      getEimsExecutiveDashboard(),
      getEimsOperationalDashboard(),
    ]);
    setOps(o);
    setExecutive(e);
    setOperational(op);
  };

  useEffect(() => { reload().catch((err) => setError(err.message)); }, []);

  if (!ops && !error) return <LoadingState variant="dashboard" message="Cargando Operations Center..." />;

  const critical = (ops?.criticalItems as Array<Record<string, unknown>>) ?? [];
  const byHour = (ops?.movementsByHour as Array<Record<string, unknown>>) ?? [];
  const occupancy = (ops?.warehouseOccupancy as Array<Record<string, unknown>>) ?? [];
  const alerts = ((operational?.alerts as Array<Record<string, unknown>>) ?? []).slice(0, 10);

  return (
    <>
      <Header
        title="Operations Center — Inventario"
        subtitle="Monitoreo en tiempo real, KPIs y analítica operativa"
        actions={
          <>
            <button className="btn" onClick={() => refreshEimsOpsAlerts().then(reload).catch((e) => setError(e.message))}>
              Refrescar alertas
            </button>
            <Link to="/inventario/ops/reportes" className="btn">Reportes</Link>
            <Link to="/inventario/ops/analitica" className="btn">Analítica</Link>
            <Link to="/inventario/ops/mapa" className="btn">Mapa ocupación</Link>
            <Link to="/inventario" className="btn">EIMS</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Existencias</span><span className="kpi-value">{String(ops?.totalQty ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Valor inventario</span><span className="kpi-value">{String(ops?.inventoryValue ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Disponible</span><span className="kpi-value">{String(ops?.availableQty ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Reservado</span><span className="kpi-value">{String(ops?.reservedQty ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Bloqueado</span><span className="kpi-value">{String(ops?.blockedQty ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Rotación</span><span className="kpi-value">{String(ops?.turnover ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cobertura días</span><span className="kpi-value">{String(ops?.coverageDays ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Movimientos hoy</span><span className="kpi-value">{String(ops?.movementsToday ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Capacidad usada</span><span className="kpi-value">{String(ops?.capacityUsed ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Capacidad libre</span><span className="kpi-value">{String(ops?.capacityAvailable ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Nivel servicio</span><span className="kpi-value">{String(executive?.serviceLevel ?? 0)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Exactitud</span><span className="kpi-value">{String(executive?.inventoryAccuracy ?? 0)}%</span></div>
      </div>
      <section className="panel">
        <h3>Dashboard ejecutivo</h3>
        <p>
          Valor: {String(executive?.inventoryValue ?? 0)} · Críticos: {String(executive?.criticalItems ?? 0)} ·
          Alertas: {String(executive?.openAlerts ?? 0)} · Sugerencias: {String(executive?.openSuggestions ?? 0)}
        </p>
      </section>
      <section className="panel">
        <h3>Movimientos por hora</h3>
        <div className="row-actions" style={{ flexWrap: 'wrap' }}>
          {byHour.map((h) => (
            <span key={String(h.hour)} className="kpi-card" style={{ minWidth: 64 }}>
              {String(h.hour)}h: {String(h.count)}
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Ocupación de bodegas</h3>
        <table className="data-table">
          <thead>
            <tr><th>Bodega</th><th>Usado</th><th>Total</th><th>Ocupación</th><th>Disponible</th></tr>
          </thead>
          <tbody>
            {occupancy.map((o) => (
              <tr key={String(o.warehouseKey)}>
                <td>{String(o.name)}</td>
                <td>{String(o.usedCapacity)}</td>
                <td>{String(o.totalCapacity)}</td>
                <td>{String(o.occupancyPct)}%</td>
                <td>{String(o.availableCapacity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Artículos críticos</h3>
        <ul>
          {critical.map((c) => (
            <li key={`${String(c.itemKey)}-${String(c.warehouseKey)}`}>
              {String(c.itemKey)} @ {String(c.warehouseKey)} · disponible={String(c.availableQty)}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3>Alertas operativas</h3>
        <ul>
          {alerts.map((a) => (
            <li key={String(a.id)}>[{String(a.severity)}] {String(a.title)} — {String(a.message)}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
