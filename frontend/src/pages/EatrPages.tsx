import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEatr,
  getEatrCenter,
  getEatrDashboard,
  listEatrCommercialLots,
  listEatrCustody,
  listEatrHarvestSchedules,
  listEatrPackaging,
  listEatrPostharvest,
  listEatrProductionLots,
  listEatrQuality,
  listEatrTraceEvents,
  listEatrWeighings,
  type EatrCenter,
} from '../api/eatr';

const EATR_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/trazabilidad" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/trazabilidad/cosecha" className="btn">Cosecha</Link>
    <Link to="/plataforma-agritech/trazabilidad/poscosecha" className="btn">Poscosecha</Link>
    <Link to="/plataforma-agritech/trazabilidad/calidad" className="btn">Calidad</Link>
    <Link to="/plataforma-agritech/trazabilidad/lotes" className="btn">Lotes Comerciales</Link>
    <Link to="/plataforma-agritech/trazabilidad/dashboard-produccion" className="btn">Dashboard Producción</Link>
    <Link to="/plataforma-agritech/trazabilidad/dashboard-calidad" className="btn">Dashboard Calidad</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EatrCenterPage() {
  const [center, setCenter] = useState<EatrCenter | null>(null);
  useEffect(() => { getEatrCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro de Trazabilidad" subtitle="Trazabilidad desde origen hasta destino" actions={EATR_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Lotes prod.</span><span className="kpi-value">{String(indicators?.productionLots ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Lotes comerciales</span><span className="kpi-value">{String(indicators?.commercialLots ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Eventos 30d</span><span className="kpi-value">{String(indicators?.traceEvents30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Trace Score</span><span className="kpi-value">{String(indicators?.traceScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEatr().then(setCenter)}>Inicializar Trazabilidad</button>
      </section>
      <section className="card">
        <p>Lotes producción: {center?.productionLots.length ?? 0} · Comerciales: {center?.commercialLots.length ?? 0} · Custodia: {center?.custodyTransfers.length ?? 0}</p>
      </section>
    </>
  );
}

export function EatrHarvestPage() {
  const [schedules, setSchedules] = useState<unknown[]>([]);
  const [weighings, setWeighings] = useState<unknown[]>([]);
  const [lots, setLots] = useState<unknown[]>([]);
  useEffect(() => {
    listEatrHarvestSchedules().then(setSchedules);
    listEatrWeighings().then(setWeighings);
    listEatrProductionLots().then(setLots);
  }, []);

  return (
    <>
      <Header title="Centro de Cosecha" actions={EATR_LINKS} />
      <section className="card"><h3>Programación ({schedules.length})</h3></section>
      <section className="card"><h3>Pesajes ({weighings.length})</h3></section>
      <section className="card"><h3>Lotes producción ({lots.length})</h3></section>
    </>
  );
}

export function EatrPostharvestPage() {
  const [steps, setSteps] = useState<unknown[]>([]);
  const [packaging, setPackaging] = useState<unknown[]>([]);
  useEffect(() => {
    listEatrPostharvest().then(setSteps);
    listEatrPackaging().then(setPackaging);
  }, []);

  return (
    <>
      <Header title="Centro de Poscosecha" actions={EATR_LINKS} />
      <section className="card"><h3>Procesos ({steps.length})</h3></section>
      <section className="card"><h3>Empaque ({packaging.length})</h3></section>
    </>
  );
}

export function EatrQualityPage() {
  const [inspections, setInspections] = useState<unknown[]>([]);
  useEffect(() => { listEatrQuality().then(setInspections); }, []);

  return (
    <>
      <Header title="Control de Calidad" actions={EATR_LINKS} />
      <section className="card"><h3>Inspecciones ({inspections.length})</h3></section>
    </>
  );
}

export function EatrCommercialLotsPage() {
  const [commercial, setCommercial] = useState<unknown[]>([]);
  const [custody, setCustody] = useState<unknown[]>([]);
  const [events, setEvents] = useState<unknown[]>([]);
  useEffect(() => {
    listEatrCommercialLots().then(setCommercial);
    listEatrCustody().then(setCustody);
    listEatrTraceEvents().then(setEvents);
  }, []);

  return (
    <>
      <Header title="Administrador de Lotes Comerciales" actions={EATR_LINKS} />
      <section className="card"><h3>Lotes comerciales ({commercial.length})</h3></section>
      <section className="card"><h3>Cadena de custodia ({custody.length})</h3></section>
      <section className="card"><h3>Eventos trazabilidad ({events.length})</h3></section>
    </>
  );
}

export function EatrProductionDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [lots, setLots] = useState<unknown[]>([]);
  useEffect(() => {
    getEatrDashboard().then(setDashboard);
    listEatrProductionLots().then(setLots);
  }, []);
  const indicators = (dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Dashboard de Producción" actions={EATR_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Cosechas</span><span className="kpi-value">{String(indicators?.harvestLots ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Custodia 30d</span><span className="kpi-value">{String(indicators?.custodyTransfers30d ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Embarques</span><span className="kpi-value">{String(indicators?.shipments ?? '—')}</span></div>
      </div>
      <section className="card"><h3>Lotes ({lots.length})</h3></section>
    </>
  );
}

export function EatrQualityDashboardPage() {
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [inspections, setInspections] = useState<unknown[]>([]);
  useEffect(() => {
    getEatrDashboard().then(setDashboard);
    listEatrQuality().then(setInspections);
  }, []);
  const indicators = (dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Dashboard de Calidad" actions={EATR_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Inspecciones</span><span className="kpi-value">{String(indicators?.qualityInspections ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Conformidad</span><span className="kpi-value">{String(indicators?.conformityRate ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">No conformidades</span><span className="kpi-value">{String(indicators?.nonConformities ?? '—')}</span></div>
      </div>
      <section className="card"><h3>Inspecciones ({inspections.length})</h3></section>
    </>
  );
}
