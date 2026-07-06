import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  compareEmfgIntelligenceSimulations,
  computeEmfgIntelligenceOee,
  createEmfgIntelligenceSimulation,
  exportEmfgIntelligence,
  getEmfgIntelligenceAiCapabilities,
  getEmfgIntelligenceAlerts,
  getEmfgIntelligenceAnalytics,
  getEmfgIntelligenceDashboard,
  getEmfgIntelligenceExecutive,
  getEmfgIntelligenceExportHistory,
  getEmfgIntelligenceKpis,
  getEmfgIntelligenceOee,
  getEmfgIntelligenceOeeComparatives,
  getEmfgIntelligenceOeeHistory,
  getEmfgIntelligenceQueryHistory,
  listEmfgIntelligenceSimulations,
  runEmfgIntelligenceAggregate,
  runEmfgIntelligenceSimulation,
} from '../api/emfg-intelligence';

const INTEL_LINKS = (
  <div className="row-actions">
    <Link to="/manufactura/inteligencia" className="btn">Centro</Link>
    <Link to="/manufactura/inteligencia/ejecutivo" className="btn">Ejecutivo</Link>
    <Link to="/manufactura/inteligencia/oee" className="btn">OEE</Link>
    <Link to="/manufactura/inteligencia/analitica" className="btn">Analítica</Link>
    <Link to="/manufactura/inteligencia/simulacion" className="btn">Simulación</Link>
    <Link to="/manufactura" className="btn">Manufactura</Link>
  </div>
);

export function EmfgIntelligenceCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [ai, setAi] = useState<unknown[]>([]);
  useEffect(() => {
    getEmfgIntelligenceDashboard().then(setDash);
    getEmfgIntelligenceAiCapabilities().then(setAi);
  }, []);
  const ind = dash?.indicators as Record<string, number> | undefined;

  const aggregate = () => runEmfgIntelligenceAggregate().then(() => getEmfgIntelligenceDashboard().then(setDash));

  return (
    <>
      <Header title="Centro de Inteligencia Industrial" subtitle="OEE, KPIs, analítica y simulación" actions={INTEL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">OEE promedio</span><span className="kpi-value">{ind?.avgOeePct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento plan</span><span className="kpi-value">{ind?.planCompliancePct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Órdenes retrasadas</span><span className="kpi-value">{ind?.delayedOrders ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Utilización capacidad</span><span className="kpi-value">{ind?.capacityUtilizationPct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas abiertas</span><span className="kpi-value">{ind?.openAlerts ?? '—'}</span></div>
      </div>
      <section className="card">
        <h3>Acciones</h3>
        <button className="btn btn-primary" onClick={aggregate}>Agregar indicadores</button>
        <button className="btn" onClick={() => computeEmfgIntelligenceOee().then(aggregate)}>Calcular OEE</button>
      </section>
      <section className="card">
        <h3>Arquitectura IA (preparada)</h3>
        <table className="data-table"><thead><tr><th>Capacidad</th><th>Estado</th></tr></thead>
          <tbody>{(ai as Array<Record<string, unknown>>).map((s) => (
            <tr key={String(s.slotKey)}><td>{String(s.capability)}</td><td>{String(s.status)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgIntelligenceExecutivePage() {
  const [exec, setExec] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  useEffect(() => {
    getEmfgIntelligenceExecutive().then(setExec);
    getEmfgIntelligenceAlerts(true).then(setAlerts);
  }, []);
  const ind = exec?.indicators as Record<string, number> | undefined;
  const kpis = exec?.kpis as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Dashboard Ejecutivo de Producción" subtitle="Indicadores consolidados" actions={INTEL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">OEE planta</span><span className="kpi-value">{ind?.avgPlantOeePct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Órdenes completadas</span><span className="kpi-value">{ind?.completedOrders ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Desperdicio</span><span className="kpi-value">{ind?.wastePct ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Reproceso</span><span className="kpi-value">{ind?.reworkPct ?? '—'}%</span></div>
      </div>
      <section className="card">
        <h3>Producción</h3>
        <p>Planificado: {String(kpis?.totalPlannedQty ?? '—')} | Producido: {String(kpis?.totalProducedQty ?? '—')}</p>
        <p>Tiempo ciclo prom.: {String(kpis?.avgCycleTimeMinutes ?? '—')} min | Setup prom.: {String(kpis?.avgSetupMinutes ?? '—')} min</p>
      </section>
      <section className="card">
        <h3>Alertas activas</h3>
        <table className="data-table"><thead><tr><th>Severidad</th><th>Título</th><th>Mensaje</th></tr></thead>
          <tbody>{(alerts as Array<Record<string, unknown>>).map((a) => (
            <tr key={String(a.alertKey)}><td>{String(a.severity)}</td><td>{String(a.title)}</td><td>{String(a.message)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgIntelligenceOeePage() {
  const [oee, setOee] = useState<unknown[]>([]);
  const [scope, setScope] = useState('');
  const [history, setHistory] = useState<unknown[]>([]);
  const reload = () => getEmfgIntelligenceOee(scope || undefined).then(setOee);

  useEffect(() => { reload(); }, [scope]);

  const loadHistory = (entityKey: string) => getEmfgIntelligenceOeeHistory(entityKey).then(setHistory);
  const exportOee = () => exportEmfgIntelligence('oee', 'csv', { snapshots: oee });

  return (
    <>
      <Header title="Dashboard OEE" subtitle="Disponibilidad, rendimiento y calidad" actions={INTEL_LINKS} />
      <div className="form-row">
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Todos los ámbitos</option>
          <option value="machine">Máquina</option>
          <option value="line">Línea</option>
          <option value="plant">Planta</option>
          <option value="work_center">Centro de trabajo</option>
        </select>
        <button className="btn" onClick={() => getEmfgIntelligenceOeeComparatives().then(setOee)}>Comparativos</button>
        <button className="btn" onClick={exportOee}>Exportar CSV</button>
      </div>
      <table className="data-table"><thead><tr><th>Ámbito</th><th>Entidad</th><th>Disp.</th><th>Rend.</th><th>Cal.</th><th>OEE</th><th></th></tr></thead>
        <tbody>{(oee as Array<Record<string, unknown>>).map((r) => (
          <tr key={String(r.snapshotKey)}>
            <td>{String(r.scope)}</td><td>{String(r.entityName ?? r.entityKey)}</td>
            <td>{String(r.availabilityPct)}%</td><td>{String(r.performancePct)}%</td>
            <td>{String(r.qualityPct)}%</td><td><strong>{String(r.oeePct)}%</strong></td>
            <td><button className="btn" onClick={() => loadHistory(String(r.entityKey))}>Histórico</button></td>
          </tr>
        ))}</tbody></table>
      {history.length > 0 && (
        <section className="card">
          <h3>Histórico OEE</h3>
          <table className="data-table"><thead><tr><th>Período</th><th>OEE</th></tr></thead>
            <tbody>{(history as Array<Record<string, unknown>>).map((h) => (
              <tr key={String(h.snapshotKey)}><td>{String(h.periodEnd)}</td><td>{String(h.oeePct)}%</td></tr>
            ))}</tbody></table>
        </section>
      )}
    </>
  );
}

export function EmfgIntelligenceAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [queries, setQueries] = useState<unknown[]>([]);
  useEffect(() => {
    getEmfgIntelligenceAnalytics().then(setData);
    getEmfgIntelligenceQueryHistory().then(setQueries);
  }, []);

  const analytics = data?.analytics as Record<string, unknown[]> | undefined;
  const exportAnalytics = () => exportEmfgIntelligence('analytics', 'json', { analytics });

  return (
    <>
      <Header title="Panel de Analítica" subtitle="Cuellos de botella, rentabilidad y eficiencia" actions={INTEL_LINKS} />
      <button className="btn" onClick={exportAnalytics}>Exportar resultados</button>
      <section className="card">
        <h3>Cuellos de botella</h3>
        <table className="data-table"><thead><tr><th>Entidad</th><th>Utilización</th></tr></thead>
          <tbody>{(analytics?.bottlenecks ?? []).map((b, i) => {
            const row = b as Record<string, unknown>;
            return <tr key={i}><td>{String(row.entityKey)}</td><td>{String(row.utilizationPct)}%</td></tr>;
          })}</tbody></table>
      </section>
      <section className="card">
        <h3>Productos más rentables</h3>
        <table className="data-table"><thead><tr><th>Producto</th><th>Margen</th></tr></thead>
          <tbody>{(analytics?.profitableProducts ?? []).map((p, i) => {
            const row = p as Record<string, unknown>;
            return <tr key={i}><td>{String(row.itemKey)}</td><td>{String(row.marginActual)}</td></tr>;
          })}</tbody></table>
      </section>
      <section className="card">
        <h3>Paradas frecuentes</h3>
        <table className="data-table"><thead><tr><th>Motivo</th><th>Minutos</th></tr></thead>
          <tbody>{(analytics?.frequentStops ?? []).map((s, i) => {
            const row = s as Record<string, unknown>;
            return <tr key={i}><td>{String(row.reason)}</td><td>{String(row.minutes)}</td></tr>;
          })}</tbody></table>
      </section>
      <section className="card">
        <h3>Historial de consultas</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Resultados</th><th>Fecha</th></tr></thead>
          <tbody>{(queries as Array<Record<string, unknown>>).slice(0, 20).map((q) => (
            <tr key={String(q.queryKey)}><td>{String(q.queryType)}</td><td>{String(q.resultCount)}</td><td>{String(q.queriedAt)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgIntelligenceSimulationPage() {
  const [sims, setSims] = useState<unknown[]>([]);
  const [exports, setExports] = useState<unknown[]>([]);
  const [simType, setSimType] = useState('demand_increase');
  const [param, setParam] = useState('10');
  const reload = () => listEmfgIntelligenceSimulations().then(setSims);

  useEffect(() => {
    reload();
    getEmfgIntelligenceExportHistory().then(setExports);
  }, []);

  const createAndRun = () => {
    const inputParams: Record<string, unknown> = {};
    if (simType === 'demand_increase') inputParams.demandIncreasePct = Number(param);
    if (simType === 'capacity_change') inputParams.additionalCapacity = Number(param);
    if (simType === 'shift_addition') inputParams.additionalShifts = Number(param);
    if (simType === 'routing_change') inputParams.runMinutesDeltaPct = Number(param);
    if (simType === 'bom_change') inputParams.quantityDeltaPct = Number(param);

    createEmfgIntelligenceSimulation({ name: `Sim ${simType}`, simulationType: simType, inputParams })
      .then((s) => runEmfgIntelligenceSimulation(String((s as Record<string, unknown>).simulationKey)))
      .then(reload);
  };

  const compare = () => {
    const keys = (sims as Array<Record<string, unknown>>)
      .filter((s) => s.status === 'completed')
      .slice(0, 3)
      .map((s) => String(s.simulationKey));
    if (keys.length >= 2) compareEmfgIntelligenceSimulations(keys).then(reload);
  };

  return (
    <>
      <Header title="Centro de Simulación" subtitle="Demanda, capacidad, turnos, rutas y BOM" actions={INTEL_LINKS} />
      <section className="card">
        <h3>Nueva simulación</h3>
        <div className="form-row">
          <select value={simType} onChange={(e) => setSimType(e.target.value)}>
            <option value="demand_increase">Aumento de demanda</option>
            <option value="capacity_change">Capacidad</option>
            <option value="shift_addition">Nuevos turnos</option>
            <option value="routing_change">Cambio de rutas</option>
            <option value="bom_change">Cambio de BOM</option>
          </select>
          <input value={param} onChange={(e) => setParam(e.target.value)} placeholder="Parámetro %" />
          <button className="btn btn-primary" onClick={createAndRun}>Ejecutar</button>
          <button className="btn" onClick={compare}>Comparar escenarios</button>
        </div>
      </section>
      <table className="data-table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Autorizada</th><th>Resultado</th></tr></thead>
        <tbody>{(sims as Array<Record<string, unknown>>).map((s) => (
          <tr key={String(s.simulationKey)}>
            <td>{String(s.name)}</td><td>{String(s.simulationType)}</td><td>{String(s.status)}</td>
            <td>{s.isAuthorized ? 'Sí' : 'No'}</td>
            <td>{JSON.stringify(s.resultScenario).slice(0, 80)}…</td>
          </tr>
        ))}</tbody></table>
      <section className="card">
        <h3>Historial de exportaciones</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Formato</th><th>Filas</th></tr></thead>
          <tbody>{(exports as Array<Record<string, unknown>>).slice(0, 10).map((e) => (
            <tr key={String(e.exportKey)}><td>{String(e.exportType)}</td><td>{String(e.format)}</td><td>{String(e.rowCount)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EmfgIntelligenceKpiPage() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEmfgIntelligenceKpis().then(setKpis); }, []);

  const byLine = (kpis?.productionByLine as Array<Record<string, unknown>>) ?? [];
  const byPlant = (kpis?.productionByPlant as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header title="KPIs de Producción" subtitle="Cumplimiento, ciclo y capacidad" actions={INTEL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(kpis?.planCompliancePct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Finalizadas</span><span className="kpi-value">{String(kpis?.completedOrders ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Retrasadas</span><span className="kpi-value">{String(kpis?.delayedOrders ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Tiempo ciclo</span><span className="kpi-value">{String(kpis?.avgCycleTimeMinutes ?? '—')}</span></div>
      </div>
      <section className="card">
        <h3>Producción por línea</h3>
        <table className="data-table"><thead><tr><th>Línea</th><th>Plan</th><th>Producido</th><th>%</th></tr></thead>
          <tbody>{byLine.map((r) => (
            <tr key={String(r.lineKey)}><td>{String(r.lineKey)}</td><td>{String(r.plannedQty)}</td><td>{String(r.producedQty)}</td><td>{String(r.compliancePct)}%</td></tr>
          ))}</tbody></table>
      </section>
      <section className="card">
        <h3>Producción por planta</h3>
        <table className="data-table"><thead><tr><th>Planta</th><th>Plan</th><th>Producido</th><th>%</th></tr></thead>
          <tbody>{byPlant.map((r) => (
            <tr key={String(r.centerKey)}><td>{String(r.centerKey)}</td><td>{String(r.plannedQty)}</td><td>{String(r.producedQty)}</td><td>{String(r.compliancePct)}%</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}
