import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEffm,
  getEffmCenter,
  getEffmDashboard,
  getEffmFleetPerformance,
  listEffmAssignments,
  listEffmCouplingHistory,
  listEffmFuel,
  listEffmImplements,
  listEffmMachines,
  listEffmOperations,
  listEffmTelemetryAlarms,
  listEffmTelemetryReadings,
  type EffmCenter,
} from '../api/effm';

const EFFM_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/maquinaria" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/maquinaria/implementos" className="btn">Implementos</Link>
    <Link to="/plataforma-agritech/maquinaria/operaciones" className="btn">Operaciones</Link>
    <Link to="/plataforma-agritech/maquinaria/flota" className="btn">Dashboard Flota</Link>
    <Link to="/plataforma-agritech/maquinaria/rendimiento" className="btn">Dashboard Rendimiento</Link>
    <Link to="/plataforma-agritech/maquinaria/telemetria" className="btn">Telemetría</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EffmCenterPage() {
  const [center, setCenter] = useState<EffmCenter | null>(null);
  useEffect(() => { getEffmCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Maquinaria" subtitle="Sprint 7 — EFFM" actions={EFFM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Máquinas</span><span className="kpi-value">{String(indicators?.activeMachines ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Implementos</span><span className="kpi-value">{String(indicators?.activeImplements ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Operaciones 30d</span><span className="kpi-value">{String(indicators?.operations30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fleet Score</span><span className="kpi-value">{String(indicators?.fleetScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEffm().then(setCenter)}>Inicializar Flota</button>
      </section>
      <section className="card">
        <p>Máquinas: {center?.machines.length ?? 0} · Implementos: {center?.implements.length ?? 0} · Alarmas: {center?.activeAlarms.length ?? 0}</p>
      </section>
    </>
  );
}

export function EffmImplementsPage() {
  const [implements_, setImplements] = useState<unknown[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  useEffect(() => {
    listEffmImplements().then(setImplements);
    listEffmCouplingHistory().then(setHistory);
  }, []);

  return (
    <>
      <Header title="Administrador de Implementos" actions={EFFM_LINKS} />
      <section className="card"><h3>Catálogo ({implements_.length})</h3></section>
      <section className="card"><h3>Historial acoples ({history.length})</h3></section>
    </>
  );
}

export function EffmOperationsPage() {
  const [operations, setOperations] = useState<unknown[]>([]);
  const [assignments, setAssignments] = useState<unknown[]>([]);
  const [fuel, setFuel] = useState<unknown[]>([]);
  useEffect(() => {
    listEffmOperations().then(setOperations);
    listEffmAssignments().then(setAssignments);
    listEffmFuel().then(setFuel);
  }, []);

  return (
    <>
      <Header title="Centro de Operaciones" actions={EFFM_LINKS} />
      <section className="card"><h3>Labores ({operations.length})</h3></section>
      <section className="card"><h3>Asignaciones ({assignments.length})</h3></section>
      <section className="card"><h3>Combustible ({fuel.length})</h3></section>
    </>
  );
}

export function EffmFleetDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [machines, setMachines] = useState<unknown[]>([]);
  useEffect(() => {
    getEffmDashboard().then(setDashboard);
    listEffmMachines().then(setMachines);
  }, []);
  const indicators = (dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Dashboard de Flota" actions={EFFM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Combustible 30d</span><span className="kpi-value">{String(indicators?.fuelLiters30d ?? '—')} L</span></div>
        <div className="kpi-card"><span className="kpi-label">Telemetría 30d</span><span className="kpi-value">{String(indicators?.telemetryReadings30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alarmas</span><span className="kpi-value">{String(indicators?.activeAlarms ?? '—')}</span></div>
      </div>
      <section className="card"><h3>Máquinas ({machines.length})</h3></section>
    </>
  );
}

export function EffmPerformanceDashboardPage() {
  const [performance, setPerformance] = useState<unknown>(null);
  const [dashboard, setDashboard] = useState<unknown>(null);
  useEffect(() => {
    getEffmFleetPerformance().then(setPerformance);
    getEffmDashboard().then(setDashboard);
  }, []);
  const perf = performance as Record<string, unknown>;
  const indicators = (dashboard as { performance?: Record<string, unknown> })?.performance;

  return (
    <>
      <Header title="Dashboard de Rendimiento" actions={EFFM_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Utilización</span><span className="kpi-value">{String(perf?.utilizationPct ?? indicators?.utilizationPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Disponibilidad</span><span className="kpi-value">{String(perf?.availabilityPct ?? indicators?.availabilityPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Costo/ha</span><span className="kpi-value">{String(perf?.costPerHa ?? indicators?.costPerHa ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">L/ha</span><span className="kpi-value">{String(perf?.litersPerHa ?? indicators?.litersPerHa ?? '—')}</span></div>
      </div>
    </>
  );
}

export function EffmTelemetryPage() {
  const [readings, setReadings] = useState<unknown[]>([]);
  const [alarms, setAlarms] = useState<unknown[]>([]);
  useEffect(() => {
    listEffmTelemetryReadings().then(setReadings);
    listEffmTelemetryAlarms().then(setAlarms);
  }, []);

  return (
    <>
      <Header title="Panel de Telemetría" actions={EFFM_LINKS} />
      <section className="card"><h3>Lecturas ({readings.length})</h3></section>
      <section className="card"><h3>Alarmas activas ({alarms.length})</h3></section>
    </>
  );
}
