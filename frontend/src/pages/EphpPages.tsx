import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEphp,
  getEphpCenter,
  getEphpDashboard,
  listEphpAlerts,
  listEphpApplications,
  listEphpDiseaseCatalog,
  listEphpFrameworks,
  listEphpIpmPlans,
  listEphpMonitoring,
  listEphpPestCatalog,
  listEphpTreatments,
  type EphpCenter,
} from '../api/ephp';

const EPHP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/sanidad" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/sanidad/plagas" className="btn">Plagas</Link>
    <Link to="/plataforma-agritech/sanidad/enfermedades" className="btn">Enfermedades</Link>
    <Link to="/plataforma-agritech/sanidad/mip" className="btn">MIP</Link>
    <Link to="/plataforma-agritech/sanidad/tratamientos" className="btn">Tratamientos</Link>
    <Link to="/plataforma-agritech/sanidad/dashboard" className="btn">Dashboard</Link>
    <Link to="/plataforma-agritech/sanidad/normativo" className="btn">Normativo</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EphpCenterPage() {
  const [center, setCenter] = useState<EphpCenter | null>(null);
  useEffect(() => { getEphpCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Sanidad Vegetal" subtitle="Monitoreo de plagas, enfermedades y tratamientos" actions={EPHP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Plagas cat.</span><span className="kpi-value">{String(indicators?.pestCatalog ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Enfermedades</span><span className="kpi-value">{String(indicators?.diseaseCatalog ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Monitoreos 30d</span><span className="kpi-value">{String(indicators?.activeMonitorings30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Health Score</span><span className="kpi-value">{String(indicators?.healthScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEphp().then(setCenter)}>Inicializar Sanidad</button>
      </section>
      <section className="card">
        <p>Tratamientos: {center?.treatments.length ?? 0} · Planes MIP: {center?.ipmPlans.length ?? 0} · Alertas: {center?.activeAlerts.length ?? 0}</p>
      </section>
    </>
  );
}

export function EphpPestsPage() {
  const [catalog, setCatalog] = useState<unknown[]>([]);
  const [monitoring, setMonitoring] = useState<unknown[]>([]);
  useEffect(() => {
    listEphpPestCatalog().then(setCatalog);
    listEphpMonitoring().then(setMonitoring);
  }, []);

  return (
    <>
      <Header title="Administrador de Plagas" actions={EPHP_LINKS} />
      <section className="card"><h3>Catálogo ({catalog.length})</h3></section>
      <section className="card"><h3>Monitoreos ({monitoring.length})</h3></section>
    </>
  );
}

export function EphpDiseasesPage() {
  const [catalog, setCatalog] = useState<unknown[]>([]);
  useEffect(() => { listEphpDiseaseCatalog().then(setCatalog); }, []);

  return (
    <>
      <Header title="Administrador de Enfermedades" actions={EPHP_LINKS} />
      <section className="card"><h3>Catálogo ({catalog.length})</h3></section>
    </>
  );
}

export function EphpIpmPage() {
  const [plans, setPlans] = useState<unknown[]>([]);
  useEffect(() => { listEphpIpmPlans().then(setPlans); }, []);

  return (
    <>
      <Header title="Centro MIP" actions={EPHP_LINKS} />
      <section className="card"><h3>Planes MIP ({plans.length})</h3></section>
    </>
  );
}

export function EphpTreatmentsPage() {
  const [treatments, setTreatments] = useState<unknown[]>([]);
  const [applications, setApplications] = useState<unknown[]>([]);
  useEffect(() => {
    listEphpTreatments().then(setTreatments);
    listEphpApplications().then(setApplications);
  }, []);

  return (
    <>
      <Header title="Panel de Tratamientos" actions={EPHP_LINKS} />
      <section className="card"><h3>Tratamientos ({treatments.length})</h3></section>
      <section className="card"><h3>Aplicaciones ({applications.length})</h3></section>
    </>
  );
}

export function EphpDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  useEffect(() => {
    getEphpDashboard().then(setDashboard);
    listEphpAlerts().then(setAlerts);
  }, []);

  return (
    <>
      <Header title="Dashboard Fitosanitario" actions={EPHP_LINKS} />
      <section className="card"><pre>{JSON.stringify(dashboard, null, 2).slice(0, 5000)}</pre></section>
      <section className="card"><h3>Alertas ({alerts.length})</h3></section>
    </>
  );
}

export function EphpCompliancePage() {
  const [frameworks, setFrameworks] = useState<unknown[]>([]);
  useEffect(() => { listEphpFrameworks().then(setFrameworks); }, []);

  return (
    <>
      <Header title="Centro Normativo" subtitle="BPA · GlobalG.A.P · Orgánico" actions={EPHP_LINKS} />
      <section className="card">
        <ul>{frameworks.map((f: unknown, i) => {
          const row = f as Record<string, string>;
          return <li key={i}>{row.frameworkType} — {row.name}</li>;
        })}</ul>
      </section>
    </>
  );
}
