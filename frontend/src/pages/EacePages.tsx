import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEace,
  createEaceContract,
  createEaceCooperative,
  getEaceCenter,
  getEaceDashboard,
  getEaceExecutive,
  getEaceProducer,
  listEaceAdvisors,
  listEaceContracts,
  listEaceContractors,
  listEaceCooperatives,
  listEaceKnowledge,
  listEaceMarketplace,
  listEaceNotifications,
  listEaceProducers,
  listEaceVisits,
  scheduleEaceVisit,
  type EaceCenter,
} from '../api/eace';

const EACE_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech/ecosistema" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/ecosistema/productores" className="btn">Productores</Link>
    <Link to="/plataforma-agritech/ecosistema/cooperativas" className="btn">Cooperativas</Link>
    <Link to="/plataforma-agritech/ecosistema/contratistas" className="btn">Contratistas</Link>
    <Link to="/plataforma-agritech/ecosistema/asesores" className="btn">Asesores</Link>
    <Link to="/plataforma-agritech/ecosistema/conocimiento" className="btn">Conocimiento</Link>
    <Link to="/plataforma-agritech/ecosistema/marketplace" className="btn">Marketplace</Link>
    <Link to="/plataforma-agritech/ecosistema/ejecutivo" className="btn">Panel Ejecutivo</Link>
    <Link to="/plataforma-agritech" className="btn">AgriTech</Link>
  </div>
);

export function EaceCenterPage() {
  const [center, setCenter] = useState<EaceCenter | null>(null);
  useEffect(() => { getEaceCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Ecosistema AgriTech Colaborativo" subtitle="Cooperativas, asesores y marketplace agrícola" actions={EACE_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Productores</span><span className="kpi-value">{String(indicators?.activeProducers ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Organizaciones</span><span className="kpi-value">{String(indicators?.collaborativeOrgs ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Contratos activos</span><span className="kpi-value">{String(indicators?.activeContracts ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ecosystem Score</span><span className="kpi-value">{String(indicators?.ecosystemScore ?? '—')}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEace().then(setCenter)}>Inicializar Ecosistema</button>
      </section>
      <section className="card">
        <p>Productores: {center?.producers.length ?? 0} · Cooperativas: {center?.collaborativeOrgs.length ?? 0} · Contratos: {center?.contracts.length ?? 0}</p>
      </section>
    </>
  );
}

export function EaceProducersPage() {
  const [producers, setProducers] = useState<unknown[]>([]);
  const [selected, setSelected] = useState<unknown>(null);
  const [notifications, setNotifications] = useState<unknown[]>([]);
  useEffect(() => {
    listEaceProducers().then(setProducers);
    listEaceNotifications().then(setNotifications);
  }, []);

  const view = (key: string) => {
    getEaceProducer(key).then(setSelected);
  };

  return (
    <>
      <Header title="Portal del Productor" actions={EACE_LINKS} />
      <section className="card"><h3>Perfiles ({producers.length})</h3>
        <ul>{producers.slice(0, 10).map((p) => {
          const pr = p as Record<string, unknown>;
          return <li key={String(pr.profileKey)}><button className="btn" onClick={() => view(String(pr.profileKey))}>{String(pr.displayName)}</button></li>;
        })}</ul>
      </section>
      {selected ? <section className="card"><h3>Detalle</h3><pre>{JSON.stringify(selected, null, 2)}</pre></section> : null}
      <section className="card"><h3>Notificaciones ({notifications.length})</h3></section>
    </>
  );
}

export function EaceCooperativesPage() {
  const [orgs, setOrgs] = useState<unknown[]>([]);
  const [contracts, setContracts] = useState<unknown[]>([]);
  useEffect(() => {
    listEaceCooperatives().then(setOrgs);
    listEaceContracts().then(setContracts);
  }, []);

  const createOrg = () => {
    createEaceCooperative({ orgType: 'cooperative', name: 'Nueva Cooperativa' }).then(() => listEaceCooperatives().then(setOrgs));
  };

  const createCtr = () => {
    createEaceContract({ producerRef: 'PROD-DEMO', title: 'Contrato agrícola demo' }).then(() => listEaceContracts().then(setContracts));
  };

  return (
    <>
      <Header title="Portal de Cooperativas" actions={EACE_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={createOrg}>Registrar cooperativa</button>
        <button className="btn" onClick={createCtr}>Registrar contrato</button>
      </section>
      <section className="card"><h3>Cooperativas y asociaciones ({orgs.length})</h3></section>
      <section className="card"><h3>Agricultura por contrato ({contracts.length})</h3></section>
    </>
  );
}

export function EaceContractorsPage() {
  const [contractors, setContractors] = useState<unknown[]>([]);
  useEffect(() => { listEaceContractors().then(setContractors); }, []);

  return (
    <>
      <Header title="Portal de Contratistas" actions={EACE_LINKS} />
      <section className="card"><h3>Contratistas y prestadores ({contractors.length})</h3></section>
    </>
  );
}

export function EaceAdvisorsPage() {
  const [advisors, setAdvisors] = useState<unknown[]>([]);
  const [visits, setVisits] = useState<unknown[]>([]);
  useEffect(() => {
    listEaceAdvisors().then(setAdvisors);
    listEaceVisits().then(setVisits);
  }, []);

  const schedule = () => {
    const adv = advisors[0] as Record<string, unknown> | undefined;
    if (!adv?.advisorKey) return;
    scheduleEaceVisit(String(adv.advisorKey), {
      producerRef: 'PROD-DEMO',
      visitDate: new Date().toISOString(),
      summary: 'Visita técnica programada',
    }).then(() => listEaceVisits().then(setVisits));
  };

  return (
    <>
      <Header title="Portal de Asesores" actions={EACE_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={schedule} disabled={!advisors.length}>Programar visita</button>
      </section>
      <section className="card"><h3>Asesores ({advisors.length})</h3></section>
      <section className="card"><h3>Visitas técnicas ({visits.length})</h3></section>
    </>
  );
}

export function EaceKnowledgePage() {
  const [items, setItems] = useState<unknown[]>([]);
  useEffect(() => { listEaceKnowledge().then(setItems); }, []);

  return (
    <>
      <Header title="Centro de Conocimiento" actions={EACE_LINKS} />
      <section className="card"><h3>Biblioteca técnica ({items.length})</h3></section>
    </>
  );
}

export function EaceMarketplacePage() {
  const [listings, setListings] = useState<unknown[]>([]);
  useEffect(() => { listEaceMarketplace().then(setListings); }, []);

  return (
    <>
      <Header title="Centro Marketplace" actions={EACE_LINKS} />
      <section className="card"><h3>Ofertas y servicios ({listings.length})</h3>
        <p>Arquitectura preparada — sin pasarela comercial específica</p>
      </section>
    </>
  );
}

export function EaceExecutivePage() {
  const [executive, setExecutive] = useState<unknown>(null);
  const [dashboard, setDashboard] = useState<unknown>(null);
  useEffect(() => {
    getEaceExecutive().then(setExecutive);
    getEaceDashboard().then(setDashboard);
  }, []);
  const exec = (executive as { executive?: Record<string, unknown> })?.executive;
  const indicators = (dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Panel Ejecutivo Agrícola" actions={EACE_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Producción</span><span className="kpi-value">{String(exec?.production ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Rendimiento</span><span className="kpi-value">{String(exec?.yield ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Rentabilidad</span><span className="kpi-value">{String(exec?.profitability ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(exec?.compliance ?? indicators?.contractComplianceAvg ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">ESG</span><span className="kpi-value">{String(exec?.esg ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas críticas</span><span className="kpi-value">{String(exec?.criticalAlerts ?? '—')}</span></div>
      </div>
    </>
  );
}
