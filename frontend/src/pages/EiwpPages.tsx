import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEiwp,
  getEiwpCenter,
  getEiwpClimateSnapshot,
  getEiwpDashboard,
  listEiwpAlerts,
  listEiwpBalances,
  listEiwpConsumption,
  listEiwpSchedules,
  listEiwpSources,
  listEiwpStations,
  type EiwpCenter,
} from '../api/eiwp';

const EIWP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/riego" className="btn">Centro Hídrico</Link>
    <Link to="/plataforma-agritech/riego/programacion" className="btn">Riego</Link>
    <Link to="/plataforma-agritech/riego/meteorologia" className="btn">Meteorología</Link>
    <Link to="/plataforma-agritech/riego/clima" className="btn">Dashboard Climático</Link>
    <Link to="/plataforma-agritech/riego/alertas" className="btn">Alertas</Link>
    <Link to="/plataforma-agritech/riego/consumo" className="btn">Consumo</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
    <Link to="/plataforma-agritech/precision" className="btn">Precisión</Link>
  </div>
);

export function EiwpCenterPage() {
  const [center, setCenter] = useState<EiwpCenter | null>(null);
  useEffect(() => { getEiwpCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Gestión Hídrica" subtitle="Sprint 3 — Riego Inteligente" actions={EIWP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Fuentes</span><span className="kpi-value">{String(indicators?.waterSources ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Sectores</span><span className="kpi-value">{String(indicators?.activeSectors ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Riegos prog.</span><span className="kpi-value">{String(indicators?.scheduledIrrigations ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Water Score</span><span className="kpi-value">{String(indicators?.waterScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEiwp().then(setCenter)}>Inicializar Gestión Hídrica</button>
      </section>
      <section className="card">
        <p>Fuentes: {center?.sources.length ?? 0} · Estaciones: {center?.stations.length ?? 0} · Alertas: {center?.activeAlerts.length ?? 0}</p>
      </section>
    </>
  );
}

export function EiwpIrrigationPage() {
  const [schedules, setSchedules] = useState<unknown[]>([]);
  const [sectors, setSectors] = useState<unknown[]>([]);
  useEffect(() => {
    listEiwpSchedules().then(setSchedules);
    listEiwpSources().then(setSectors);
  }, []);

  return (
    <>
      <Header title="Administrador de Riego" actions={EIWP_LINKS} />
      <section className="card"><h3>Programaciones ({schedules.length})</h3></section>
      <section className="card"><h3>Fuentes ({sectors.length})</h3></section>
    </>
  );
}

export function EiwpWeatherPage() {
  const [stations, setStations] = useState<unknown[]>([]);
  const [snapshot, setSnapshot] = useState<unknown>(null);
  useEffect(() => {
    listEiwpStations().then(setStations);
    getEiwpClimateSnapshot().then(setSnapshot);
  }, []);

  return (
    <>
      <Header title="Panel Meteorológico" actions={EIWP_LINKS} />
      <section className="card"><h3>Estaciones ({stations.length})</h3></section>
      <section className="card"><pre>{JSON.stringify(snapshot, null, 2).slice(0, 4000)}</pre></section>
    </>
  );
}

export function EiwpClimateDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [balances, setBalances] = useState<unknown[]>([]);
  useEffect(() => {
    getEiwpDashboard().then(setDashboard);
    listEiwpBalances().then(setBalances);
  }, []);

  return (
    <>
      <Header title="Dashboard Climático" actions={EIWP_LINKS} />
      <section className="card"><pre>{JSON.stringify(dashboard, null, 2).slice(0, 5000)}</pre></section>
      <section className="card"><h3>Balances hídricos ({balances.length})</h3></section>
    </>
  );
}

export function EiwpAlertsPage() {
  const [alerts, setAlerts] = useState<unknown[]>([]);
  useEffect(() => { listEiwpAlerts().then(setAlerts); }, []);

  return (
    <>
      <Header title="Centro de Alertas" actions={EIWP_LINKS} />
      <section className="card">
        <ul>{alerts.slice(0, 30).map((a: unknown, i) => {
          const row = a as Record<string, string>;
          return <li key={i}>{row.alertType} — {row.title} — {row.severity}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EiwpConsumptionPage() {
  const [consumption, setConsumption] = useState<unknown[]>([]);
  useEffect(() => { listEiwpConsumption().then(setConsumption); }, []);

  return (
    <>
      <Header title="Dashboard de Consumo de Agua" actions={EIWP_LINKS} />
      <section className="card">
        <h3>Registros ({consumption.length})</h3>
        <ul>{consumption.slice(0, 20).map((c: unknown, i) => {
          const row = c as Record<string, string | number>;
          return <li key={i}>{row.consumptionKey} — {row.volumeM3} m³</li>;
        })}</ul>
      </section>
    </>
  );
}
