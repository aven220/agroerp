import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { ProcessWorkspacePanel } from '../components/process/ProcessWorkspacePanel';
import {
  bootstrapEatp,
  getEatpCalendar,
  getEatpCenter,
  getEatpDashboard,
  getEatpLaborCatalog,
  listEatpCampaigns,
  listEatpCropRegistry,
  listEatpCropStands,
  listEatpFarms,
  listEatpLaborTasks,
  listEatpLots,
  type EatpCenter,
} from '../api/eatp';

const EATP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-agritech" className="btn">Centro</Link>
    <Link to="/plataforma-agritech/fincas" className="btn">Fincas</Link>
    <Link to="/plataforma-agritech/lotes" className="btn">Lotes</Link>
    <Link to="/plataforma-agritech/cultivos" className="btn">Cultivos</Link>
    <Link to="/plataforma-agritech/campanas" className="btn">Campañas</Link>
    <Link to="/plataforma-agritech/calendario" className="btn">Calendario</Link>
    <Link to="/plataforma-agritech/dashboard" className="btn">Dashboard</Link>
    <Link to="/plataforma-agritech/precision" className="btn">Precisión</Link>
    <Link to="/plataforma-agritech/riego" className="btn">Riego</Link>
    <Link to="/plataforma-agritech/sanidad" className="btn">Sanidad</Link>
    <Link to="/plataforma-agritech/trazabilidad" className="btn">Trazabilidad</Link>
    <Link to="/plataforma-agritech/cumplimiento" className="btn">Cumplimiento</Link>
    <Link to="/plataforma-agritech/maquinaria" className="btn">Maquinaria</Link>
    <Link to="/plataforma-agritech/inteligencia" className="btn">Inteligencia</Link>
    <Link to="/plataforma-agritech/ecosistema" className="btn">Ecosistema</Link>
    <Link to="/fincas" className="btn">Fincas</Link>
    <Link to="/lotes" className="btn">Lotes</Link>
  </div>
);

export function EatpCenterPage() {
  const [center, setCenter] = useState<EatpCenter | null>(null);
  useEffect(() => { getEatpCenter().then(setCenter); }, []);
  const indicators = (center?.dashboard as { indicators?: Record<string, unknown> })?.indicators;

  return (
    <>
      <Header title="Centro Agrícola" subtitle="Planificación y seguimiento de la operación agrícola" actions={EATP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Fincas activas</span><span className="kpi-value">{String(indicators?.activeFarms ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Lotes activos</span><span className="kpi-value">{String(indicators?.activeLots ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Hectáreas</span><span className="kpi-value">{String(indicators?.hectares ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Cumplimiento</span><span className="kpi-value">{String(indicators?.completionRate ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEatp().then(setCenter)}>Configurar plataforma agrícola</button>
      </section>
      <section className="card">
        <p>Campañas: {center?.campaigns.length ?? 0} · Cultivos: {center?.crops.length ?? 0} · Labores: {center?.tasks.length ?? 0}</p>
      </section>
    </>
  );
}

export function EatpFarmsPage() {
  const [farms, setFarms] = useState<unknown>(null);
  useEffect(() => { listEatpFarms().then(setFarms); }, []);

  return (
    <>
      <Header title="Administrador de Fincas" subtitle="Gestione fincas vinculadas a productores" actions={EATP_LINKS} />
      <section className="card">
        <pre>{JSON.stringify(farms, null, 2).slice(0, 5000)}</pre>
      </section>
    </>
  );
}

export function EatpLotsPage() {
  const [lots, setLots] = useState<unknown[]>([]);
  useEffect(() => { listEatpLots().then(setLots); }, []);

  return (
    <>
      <Header title="Administrador de Lotes" subtitle="Administre lotes dentro de cada finca" actions={EATP_LINKS} />
      <section className="card">
        <h3>Lotes ({lots.length})</h3>
        <ul>{lots.slice(0, 20).map((l: unknown, i) => {
          const row = l as Record<string, string>;
          return <li key={i}>{row.lotCode} — {row.lotName} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EatpCropsPage() {
  const [stands, setStands] = useState<unknown[]>([]);
  const [registry, setRegistry] = useState<unknown[]>([]);
  useEffect(() => {
    listEatpCropStands().then(setStands);
    listEatpCropRegistry().then(setRegistry);
  }, []);

  return (
    <>
      <Header
        title="Centro de Cultivos"
        subtitle="Registre variedades y estado agronómico de sus lotes"
        actions={EATP_LINKS}
      />
      <FlowProgress flowId="agricultural" currentStepId="crop" />
      <ProcessWorkspacePanel flowId="agricultural" currentStepId="crop" showMilestone={false} />
      <FlowNextActions
        title="Después del cultivo"
        subtitle="Capture actividades de campo o consulte indicadores."
        actions={[
          { label: 'Capturar actividad', description: 'Formularios de labores en campo', to: '/formularios/recoleccion', primary: true, icon: '📋' },
          { label: 'Ver lotes', description: 'Regrese al detalle territorial', to: '/lotes', icon: '🌱' },
          { label: 'Indicadores', description: 'Dashboard agronómico', to: '/lotes/dashboard', icon: '📊' },
        ]}
      />
      <section className="card"><h3>Stands de fincas ({stands.length})</h3></section>
      <section className="card"><h3>Registro de cultivos ({registry.length})</h3></section>
    </>
  );
}

export function EatpCampaignsPage() {
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  useEffect(() => { listEatpCampaigns().then(setCampaigns); }, []);

  return (
    <>
      <Header title="Centro de Campañas" actions={EATP_LINKS} />
      <section className="card">
        <ul>{campaigns.map((c: unknown, i) => {
          const row = c as Record<string, string>;
          return <li key={i}>{row.name ?? row.campaignKey} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EatpCalendarPage() {
  const [calendar, setCalendar] = useState<unknown[]>([]);
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [catalog, setCatalog] = useState<unknown[]>([]);
  useEffect(() => {
    getEatpCalendar().then(setCalendar);
    listEatpLaborTasks().then(setTasks);
    getEatpLaborCatalog().then(setCatalog);
  }, []);

  return (
    <>
      <Header title="Calendario Agrícola" actions={EATP_LINKS} />
      <section className="card"><h3>Entradas ({calendar.length})</h3></section>
      <section className="card"><h3>Labores programadas ({tasks.length})</h3></section>
      <section className="card"><h3>Tipos de labor ({catalog.length})</h3></section>
    </>
  );
}

export function EatpDashboardPage() {
  const [dash, setDash] = useState<unknown>(null);
  useEffect(() => { getEatpDashboard().then(setDash); }, []);

  return (
    <>
      <Header title="Dashboard Agrícola" actions={EATP_LINKS} />
      <section className="card"><pre>{JSON.stringify(dash, null, 2)}</pre></section>
    </>
  );
}
