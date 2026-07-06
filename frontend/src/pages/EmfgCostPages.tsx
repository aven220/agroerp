import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEmfgOrders } from '../api/emfg';
import {
  buildEmfgCostStandardFromOrder,
  getEmfgCostDashboard,
  getEmfgCostHistory,
  getEmfgCostWip,
  listEmfgCostStandards,
  listEmfgCostVariances,
  listEmfgCostWip,
  runEmfgCostCalculation,
  transferEmfgCostWip,
} from '../api/emfg-cost';

const COST_LINKS = (
  <div className="row-actions">
    <Link to="/manufactura/costos" className="btn">Centro Costos</Link>
    <Link to="/manufactura/costos/wip" className="btn">Panel WIP</Link>
    <Link to="/manufactura/costos/dashboard" className="btn">Dashboard</Link>
    <Link to="/manufactura/costos/variaciones" className="btn">Variaciones</Link>
    <Link to="/manufactura/costos/historial" className="btn">Historial</Link>
    <Link to="/manufactura" className="btn">Manufactura</Link>
  </div>
);

export function EmfgCostCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgCostDashboard().then(setDash); }, []);
  const ind = dash?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Costos de Producción" subtitle="Estándar, real, WIP y variaciones" actions={COST_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Costo estándar prom.</span><span className="kpi-value">{ind?.avgStandardUnitCost ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo real prom.</span><span className="kpi-value">{ind?.avgActualUnitCost ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Variación total</span><span className="kpi-value">{ind?.totalVariance ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">WIP abiertos</span><span className="kpi-value">{String(dash?.wipOpenCount ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Margen real prom.</span><span className="kpi-value">{ind?.avgMarginActual ?? '—'}</span></div>
      </div>
    </>
  );
}

export function EmfgCostWipPage() {
  const [wip, setWip] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEmfgCostWip('open').then((w) => setWip(w as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Panel WIP" subtitle="Órdenes abiertas y valor acumulado" actions={COST_LINKS} />
      <table className="data-table"><thead><tr><th>Orden</th><th>Material</th><th>MOD</th><th>CIF</th><th>Total</th><th></th></tr></thead>
        <tbody>{wip.map((w) => (
          <tr key={String(w.wipKey)}>
            <td>{String(w.orderKey)}</td><td>{String(w.materialCost)}</td><td>{String(w.laborCost)}</td>
            <td>{String(w.overheadCost)}</td><td>{String(w.totalValue)}</td>
            <td><button className="btn" onClick={() => transferEmfgCostWip(String(w.orderKey)).then(reload)}>Transferir PT</button></td>
          </tr>
        ))}</tbody></table>
    </>
  );
}

export function EmfgCostDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    getEmfgCostDashboard().then(setDash);
    listEmfgOrders('in_progress').then((o) => setOrders(o as Array<Record<string, unknown>>));
  }, []);

  const recent = (dash?.recentOrders as Array<Record<string, unknown>>) ?? [];

  const runCalc = (orderKey: string) => runEmfgCostCalculation(orderKey, 50).then(() => getEmfgCostDashboard().then(setDash));

  return (
    <>
      <Header title="Dashboard de Costos" subtitle="Rentabilidad por producto y orden" actions={COST_LINKS} />
      <section className="card">
        <h3>Órdenes en ejecución</h3>
        {orders.slice(0, 10).map((o) => (
          <div key={String(o.orderKey)} className="form-row">
            <span>{String(o.orderNumber)} — {String(o.itemKey)}</span>
            <button className="btn" onClick={() => runCalc(String(o.orderKey))}>Calcular</button>
            <button className="btn" onClick={() => buildEmfgCostStandardFromOrder(String(o.orderKey))}>Estándar</button>
          </div>
        ))}
      </section>
      <section className="card">
        <h3>Resúmenes recientes</h3>
        <table className="data-table"><thead><tr><th>Orden</th><th>Estándar</th><th>Real</th><th>Margen</th></tr></thead>
          <tbody>{recent.map((r) => (
            <tr key={String(r.orderKey)}><td>{String(r.orderKey)}</td>
              <td>{String(r.standardUnitCost)}</td><td>{String(r.actualUnitCost)}</td><td>{String(r.marginActual)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgCostVariancesPage() {
  const [variances, setVariances] = useState<Array<Record<string, unknown>>>([]);
  const [standards, setStandards] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    listEmfgCostVariances().then((v) => setVariances(v as Array<Record<string, unknown>>));
    listEmfgCostStandards().then((s) => setStandards(s as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Análisis de Variaciones" subtitle="Material, MOD, eficiencia y desperdicio" actions={COST_LINKS} />
      <p>Versiones estándar activas: {standards.filter((s) => s.isActive).length}</p>
      <table className="data-table"><thead><tr><th>Orden</th><th>Tipo</th><th>Estándar</th><th>Real</th><th>Variación</th><th>%</th></tr></thead>
        <tbody>{variances.slice(0, 50).map((v) => (
          <tr key={String(v.varianceKey)}><td>{String(v.orderKey)}</td><td>{String(v.varianceType)}</td>
            <td>{String(v.standardAmount)}</td><td>{String(v.actualAmount)}</td>
            <td>{String(v.varianceAmount)}</td><td>{String(v.variancePct)}%</td></tr>
        ))}</tbody></table>
    </>
  );
}

export function EmfgCostHistoryPage() {
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getEmfgCostHistory().then((h) => setHistory(h as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Historial de Costos" subtitle="Cálculos y cambios de versiones" actions={COST_LINKS} />
      <table className="data-table"><thead><tr><th>Clave</th><th>Orden</th><th>Trigger</th><th>Estándar</th><th>Real</th><th>Variación</th><th>Fecha</th></tr></thead>
        <tbody>{history.map((h) => (
          <tr key={String(h.calcKey)}><td>{String(h.calcKey)}</td><td>{String(h.orderKey ?? '—')}</td>
            <td>{String(h.trigger)}</td><td>{String(h.standardTotal)}</td><td>{String(h.actualTotal)}</td>
            <td>{String(h.varianceTotal)}</td><td>{String(h.computedAt)}</td></tr>
        ))}</tbody></table>
    </>
  );
}
