import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  classifyEpscmInventory,
  compareEpscmForecast,
  computeEpscmForecast,
  createEpscmForecast,
  createEpscmSupplyPlan,
  getEpscmDashboard,
  getEpscmDemandPanel,
  getEpscmInventoryIndicators,
  getEpscmSupplyCalendar,
  listEpscmAlerts,
  listEpscmClassifications,
  listEpscmForecasts,
  listEpscmReplenishmentPolicies,
  listEpscmReplenishmentProposals,
  listEpscmSupplyPlans,
  runEpscmPlanningCycle,
  runEpscmReplenishment,
  seedEpscm,
} from '../api/epscm';

const SCM_LINKS = (
  <div className="row-actions">
    <Link to="/cadena-suministro" className="btn">Centro SCM</Link>
    <Link to="/cadena-suministro/demanda" className="btn">Demanda</Link>
    <Link to="/cadena-suministro/reabastecimiento" className="btn">Reabastecimiento</Link>
    <Link to="/cadena-suministro/inventarios" className="btn">Inventarios</Link>
    <Link to="/cadena-suministro/planificacion" className="btn">Planificación</Link>
    <Link to="/cadena-suministro/wms" className="btn">Almacén</Link>
    <Link to="/cadena-suministro/tms" className="btn">TMS</Link>
    <Link to="/cadena-suministro/colaboracion" className="btn">Colaboración</Link>
  </div>
);

export function EpscmCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpscmDashboard().then(setDash); }, []);
  const ind = dash?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro SCM" subtitle="Planificación de cadena de suministro" actions={SCM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Pronósticos activos</span><span className="kpi-value">{ind?.forecastCount ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Propuestas abiertas</span><span className="kpi-value">{ind?.openProposals ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas</span><span className="kpi-value">{ind?.openAlerts ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Items críticos</span><span className="kpi-value">{ind?.criticalItems ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cobertura prom.</span><span className="kpi-value">{ind?.avgCoverageDays ?? '—'} d</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => seedEpscm().then(() => getEpscmDashboard().then(setDash))}>Cargar configuración inicial</button>
      </section>
    </>
  );
}

export function EpscmDemandPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const [forecastName, setForecastName] = useState('Pronóstico mensual');
  useEffect(() => { getEpscmDemandPanel().then(setPanel); }, []);

  const versions = (panel?.versions as Array<Record<string, unknown>>) ?? [];
  const comparisons = (panel?.comparisons as Array<Record<string, unknown>>) ?? [];

  const createAndCompute = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86400000);
    createEpscmForecast({ name: forecastName, periodStart: now.toISOString(), periodEnd: end.toISOString() })
      .then((v) => {
        const key = String((v as Record<string, unknown>).versionKey);
        return computeEpscmForecast(key).then(() => compareEpscmForecast(key));
      })
      .then(() => getEpscmDemandPanel().then(setPanel));
  };

  return (
    <>
      <Header title="Panel de Demanda" subtitle="Pronósticos, histórico y comparación" actions={SCM_LINKS} />
      <section className="card">
        <div className="form-row">
          <input value={forecastName} onChange={(e) => setForecastName(e.target.value)} placeholder="Nombre pronóstico" />
          <button className="btn btn-primary" onClick={createAndCompute}>Generar pronóstico</button>
        </div>
      </section>
      <section className="card">
        <h3>Versiones de pronóstico</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Estado</th><th>Período</th></tr></thead>
          <tbody>{versions.map((v) => (
            <tr key={String(v.versionKey)}><td>{String(v.name)}</td><td>{String(v.status)}</td>
              <td>{String(v.periodStart)} — {String(v.periodEnd)}</td></tr>
          ))}</tbody></table>
      </section>
      <section className="card">
        <h3>Comparación real vs proyectada</h3>
        <table className="data-table"><thead><tr><th>Producto</th><th>Real</th><th>Proyectado</th><th>Variación</th><th>%</th></tr></thead>
          <tbody>{comparisons.slice(0, 30).map((c) => (
            <tr key={String(c.comparisonKey)}><td>{String(c.itemKey)}</td><td>{String(c.actualQty)}</td>
              <td>{String(c.projectedQty)}</td><td>{String(c.varianceQty)}</td><td>{String(c.variancePct)}%</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EpscmReplenishmentPage() {
  const [policies, setPolicies] = useState<unknown[]>([]);
  const [proposals, setProposals] = useState<unknown[]>([]);
  const reload = () => {
    listEpscmReplenishmentPolicies().then(setPolicies);
    listEpscmReplenishmentProposals('proposed').then(setProposals);
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Motor de Reabastecimiento" subtitle="Políticas y propuestas automáticas" actions={SCM_LINKS} />
      <button className="btn btn-primary" onClick={() => runEpscmReplenishment().then(reload)}>Ejecutar reabastecimiento</button>
      <section className="card">
        <h3>Políticas ({policies.length})</h3>
        <table className="data-table"><thead><tr><th>Producto</th><th>Min</th><th>Max</th><th>Seguridad</th><th>Reorden</th><th>Modo</th></tr></thead>
          <tbody>{(policies as Array<Record<string, unknown>>).slice(0, 30).map((p) => (
            <tr key={String(p.policyKey)}><td>{String(p.itemKey)}</td><td>{String(p.minStock)}</td>
              <td>{String(p.maxStock)}</td><td>{String(p.safetyStock)}</td><td>{String(p.reorderPoint)}</td>
              <td>{String(p.replenishmentMode)}</td></tr>
          ))}</tbody></table>
      </section>
      <section className="card">
        <h3>Propuestas</h3>
        <table className="data-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Actual</th><th>Propuesto</th><th>Estado</th></tr></thead>
          <tbody>{(proposals as Array<Record<string, unknown>>).map((p) => (
            <tr key={String(p.proposalKey)}><td>{String(p.itemKey)}</td><td>{String(p.proposalType)}</td>
              <td>{String(p.currentQty)}</td><td>{String(p.proposedQty)}</td><td>{String(p.status)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}

export function EpscmInventoryPage() {
  const [classes, setClasses] = useState<unknown[]>([]);
  const [indicators, setIndicators] = useState<Record<string, unknown>>({});
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const reload = () => {
    listEpscmClassifications().then(setClasses);
    getEpscmInventoryIndicators().then(setIndicators);
    listEpscmAlerts(true).then(setAlerts);
  };
  useEffect(() => { reload(); }, []);

  const abc = indicators.abcDistribution as Record<string, number> | undefined;

  return (
    <>
      <Header title="Dashboard de Inventarios" subtitle="ABC/XYZ, rotación y cobertura" actions={SCM_LINKS} />
      <button className="btn btn-primary" onClick={() => classifyEpscmInventory().then(reload)}>Clasificar inventario</button>
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Críticos</span><span className="kpi-value">{String(indicators.criticalItems ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Obsoletos</span><span className="kpi-value">{String(indicators.obsoleteItems ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Baja rotación</span><span className="kpi-value">{String(indicators.slowMovingItems ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cobertura prom.</span><span className="kpi-value">{String(indicators.avgCoverageDays ?? '—')} d</span></div>
      </div>
      {abc && <p>ABC: A={abc.A} B={abc.B} C={abc.C}</p>}
      <section className="card">
        <h3>Alertas activas</h3>
        <table className="data-table"><thead><tr><th>Tipo</th><th>Producto</th><th>Mensaje</th></tr></thead>
          <tbody>{(alerts as Array<Record<string, unknown>>).map((a) => (
            <tr key={String(a.alertKey)}><td>{String(a.alertType)}</td><td>{String(a.itemKey)}</td><td>{String(a.message)}</td></tr>
          ))}</tbody></table>
      </section>
      <table className="data-table"><thead><tr><th>Producto</th><th>ABC</th><th>XYZ</th><th>Rotación</th><th>Cobertura</th></tr></thead>
        <tbody>{(classes as Array<Record<string, unknown>>).slice(0, 40).map((c) => (
          <tr key={String(c.classKey)}><td>{String(c.itemKey)}</td><td>{String(c.abcClass)}</td>
            <td>{String(c.xyzClass)}</td><td>{String(c.rotationRate)}</td><td>{String(c.coverageDays)} d</td></tr>
        ))}</tbody></table>
    </>
  );
}

export function EpscmPlanningPage() {
  const [plans, setPlans] = useState<unknown[]>([]);
  const [calendar, setCalendar] = useState<unknown[]>([]);
  const [forecasts, setForecasts] = useState<unknown[]>([]);
  const [planName, setPlanName] = useState('Plan abastecimiento');

  useEffect(() => {
    listEpscmSupplyPlans().then(setPlans);
    getEpscmSupplyCalendar().then(setCalendar);
    listEpscmForecasts().then(setForecasts);
  }, []);

  const createPlan = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 86400000);
    createEpscmSupplyPlan({ name: planName, periodStart: now.toISOString(), periodEnd: end.toISOString(), priority: 80 })
      .then(() => listEpscmSupplyPlans().then(setPlans));
  };

  const runCycle = () => {
    const first = (forecasts as Array<Record<string, unknown>>)[0];
    if (!first) return;
    runEpscmPlanningCycle(String(first.versionKey));
  };

  return (
    <>
      <Header title="Centro de Planificación" subtitle="Planes, calendarios y ciclo completo" actions={SCM_LINKS} />
      <section className="card">
        <div className="form-row">
          <input value={planName} onChange={(e) => setPlanName(e.target.value)} />
          <button className="btn" onClick={createPlan}>Crear plan</button>
          <button className="btn btn-primary" onClick={runCycle}>Ciclo planificación completo</button>
        </div>
      </section>
      <section className="card">
        <h3>Planes de abastecimiento</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Estado</th><th>Prioridad</th><th>Período</th></tr></thead>
          <tbody>{(plans as Array<Record<string, unknown>>).map((p) => (
            <tr key={String(p.planKey)}><td>{String(p.name)}</td><td>{String(p.status)}</td>
              <td>{String(p.priority)}</td><td>{String(p.periodStart)} — {String(p.periodEnd)}</td></tr>
          ))}</tbody></table>
      </section>
      <section className="card">
        <h3>Calendario de abastecimiento</h3>
        <table className="data-table"><thead><tr><th>Producto</th><th>Fecha</th><th>Cantidad</th><th>Tipo</th></tr></thead>
          <tbody>{(calendar as Array<Record<string, unknown>>).slice(0, 30).map((c) => (
            <tr key={String(c.calendarKey)}><td>{String(c.itemKey)}</td><td>{String(c.scheduledAt)}</td>
              <td>{String(c.quantity)}</td><td>{String(c.eventType)}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}
