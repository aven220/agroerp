import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEamReliability,
  computeEamAnalytics,
  computeEamReliabilityIndicators,
  getEamAnalytics,
  getEamEnergyDashboard,
  getEamExecutiveDashboard,
  getEamIndicatorsPanel,
  getEamIotPanel,
  getEamReliabilityCenter,
  listEamConditionReadings,
  listEamPredictiveSlots,
  listEamRelAlerts,
  listEamSimulations,
} from '../api/eam-reliability';

const REL_LINKS = (
  <div className="row-actions">
    <Link to="/gestion-activos/confiabilidad" className="btn">Centro</Link>
    <Link to="/gestion-activos/confiabilidad/ejecutivo" className="btn">Ejecutivo</Link>
    <Link to="/gestion-activos/confiabilidad/energia" className="btn">Energía</Link>
    <Link to="/gestion-activos/confiabilidad/indicadores" className="btn">Indicadores</Link>
    <Link to="/gestion-activos/confiabilidad/analitica" className="btn">Analítica</Link>
    <Link to="/gestion-activos/confiabilidad/simulacion" className="btn">Simulación</Link>
    <Link to="/gestion-activos/confiabilidad/iot" className="btn">IoT</Link>
  </div>
);

export function EamReliabilityCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamReliabilityCenter().then(setCenter); }, []);
  const indicators = center?.indicators as Record<string, unknown> | undefined;
  const reliability = indicators?.reliability as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Confiabilidad" subtitle="Monitoreo, analítica y simulación" actions={REL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Disponibilidad</span><span className="kpi-value">{String(reliability?.availability ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">MTBF</span><span className="kpi-value">{String(reliability?.mtbf ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">MTTR</span><span className="kpi-value">{String(reliability?.mttr ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas</span><span className="kpi-value">{String(indicators?.unreadAlerts ?? 0)}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEamReliability().then(() => getEamReliabilityCenter().then(setCenter))}>Inicializar Confiabilidad</button>
      </section>
    </>
  );
}

export function EamExecutiveDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamExecutiveDashboard().then(setDash); }, []);
  const reliability = dash?.reliability as Record<string, number> | undefined;
  const analytics = dash?.analytics as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Dashboard Ejecutivo de Activos" subtitle="Vista consolidada" actions={REL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Confiabilidad</span><span className="kpi-value">{String(reliability?.reliability ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Mantenibilidad</span><span className="kpi-value">{String(reliability?.maintainability ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallas</span><span className="kpi-value">{String(reliability?.failureCount ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento PM</span><span className="kpi-value">{String(analytics?.maintenanceCompliance ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn" onClick={() => computeEamReliabilityIndicators().then(() => getEamExecutiveDashboard().then(setDash))}>Recalcular</button>
      </section>
    </>
  );
}

export function EamEnergyDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamEnergyDashboard().then(setDash); }, []);
  const indicators = dash?.indicators as Record<string, { cost?: number; quantity?: number }> | undefined;
  const byType = indicators?.byType as Record<string, { cost: number; quantity: number }> | undefined;

  return (
    <>
      <Header title="Dashboard Energético" subtitle="Consumo y costos" actions={REL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Costo total</span><span className="kpi-value">{String(indicators?.totalCost ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Electricidad</span><span className="kpi-value">{String(byType?.electricity?.cost ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Combustible</span><span className="kpi-value">{String(byType?.fuel?.cost ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Agua / Gas</span><span className="kpi-value">{String((byType?.water?.cost ?? 0) + (byType?.gas?.cost ?? 0))}</span></div>
      </div>
      <section className="card">
        <p>Lecturas registradas: {((dash?.readings as unknown[]) ?? []).length}</p>
      </section>
    </>
  );
}

export function EamIndicatorsPanelPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamIndicatorsPanel().then(setPanel); }, []);
  const reliability = panel?.reliability as Record<string, number> | undefined;

  return (
    <>
      <Header title="Panel de Indicadores" subtitle="MTBF, MTTR, disponibilidad" actions={REL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Tiempo operativo</span><span className="kpi-value">{String(reliability?.operatingHours ?? '—')} h</span></div>
        <div className="kpi-card"><span className="kpi-label">Tiempo detenido</span><span className="kpi-value">{String(reliability?.downtimeHours ?? '—')} h</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo indisponibilidad</span><span className="kpi-value">{String(reliability?.unavailabilityCost ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Snapshots</span><span className="kpi-value">{((panel?.snapshots as unknown[]) ?? []).length}</span></div>
      </div>
    </>
  );
}

export function EamAnalyticsCenterPage() {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEamAnalytics().then(setAnalytics); }, []);
  const mostCostly = (analytics?.mostCostly as unknown[]) ?? [];

  return (
    <>
      <Header title="Centro de Analítica" subtitle="Activos, costos y tendencias" actions={REL_LINKS} />
      <section className="card">
        <h3>Activos más costosos</h3>
        <ul>{mostCostly.slice(0, 5).map((a, i) => {
          const row = a as { assetKey: string; totalCost: number };
          return <li key={i}>{row.assetKey}: {row.totalCost}</li>;
        })}</ul>
        <button className="btn" onClick={() => computeEamAnalytics().then(() => getEamAnalytics().then(setAnalytics))}>Recalcular analítica</button>
      </section>
    </>
  );
}

export function EamSimulationCenterPage() {
  const [sims, setSims] = useState<unknown[]>([]);
  useEffect(() => { listEamSimulations().then(setSims); }, []);

  return (
    <>
      <Header title="Centro de Simulación" subtitle="Escenarios e impacto económico" actions={REL_LINKS} />
      <section className="card">
        <p>Simulaciones: {sims.length}</p>
        <ul>{sims.slice(0, 10).map((s, i) => {
          const row = s as { name: string; simulationType: string; status: string };
          return <li key={i}>{row.name} — {row.simulationType} ({row.status})</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EamIotPanelPage() {
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const [predictive, setPredictive] = useState<unknown[]>([]);
  const [readings, setReadings] = useState<unknown[]>([]);
  useEffect(() => {
    getEamIotPanel().then(setPanel);
    listEamPredictiveSlots().then(setPredictive);
    listEamConditionReadings().then(setReadings);
  }, []);

  return (
    <>
      <Header title="Panel IoT" subtitle="Integraciones y mantenimiento predictivo" actions={REL_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Slots IoT</span><span className="kpi-value">{((panel?.slots as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Eventos en cola</span><span className="kpi-value">{((panel?.queuedEvents as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Slots predictivos</span><span className="kpi-value">{predictive.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Lecturas</span><span className="kpi-value">{readings.length}</span></div>
      </div>
    </>
  );
}

export function EamReliabilityAlertsPage() {
  const [alerts, setAlerts] = useState<unknown[]>([]);
  useEffect(() => { listEamRelAlerts(true).then(setAlerts); }, []);

  return (
    <>
      <Header title="Alertas de Confiabilidad" actions={REL_LINKS} />
      <section className="card">
        <ul>{alerts.map((a, i) => {
          const row = a as { title: string; severity: string; assetKey?: string };
          return <li key={i}>[{row.severity}] {row.title} {row.assetKey ?? ''}</li>;
        })}</ul>
      </section>
    </>
  );
}
