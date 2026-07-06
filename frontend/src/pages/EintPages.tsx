import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEint,
  chatEintAssistant,
  getEintAiCatalog,
  getEintAiUsage,
  getEintAssistantCatalog,
  getEintCenter,
  getEintConsumption,
  getEintDashboard,
  getEintDashboardCatalog,
  getEintMonitoring,
  listEintAssistants,
  listEintDashboards,
  listEintDimensions,
  listEintEtlJobs,
  listEintEtlRuns,
  listEintEbiapKpis,
  listEintFacts,
  listEintKpis,
  listEintNotificationRules,
  listEintProviders,
  listEintQueryLogs,
  listEintReportRuns,
  listEintReportTemplates,
  listEintSnapshots,
  type EintCenter,
} from '../api/eint';

const EINT_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-empresarial/eint" className="btn">Centro</Link>
    <Link to="/plataforma-empresarial/eint/bi" className="btn">BI</Link>
    <Link to="/plataforma-empresarial/eint/dashboards" className="btn">Dashboards</Link>
    <Link to="/plataforma-empresarial/eint/reportes" className="btn">Reportes</Link>
    <Link to="/plataforma-empresarial/eint/ia" className="btn">IA</Link>
    <Link to="/plataforma-empresarial/eint/modelos" className="btn">Modelos</Link>
    <Link to="/plataforma-empresarial/eint/etl" className="btn">ETL</Link>
    <Link to="/plataforma-empresarial/eint/consumo" className="btn">Consumo</Link>
    <Link to="/plataforma-empresarial/eint/asistentes" className="btn">Asistentes</Link>
    <Link to="/plataforma-empresarial/eint/notificaciones" className="btn">Alertas</Link>
  </div>
);

export function EintCenterPage() {
  const [center, setCenter] = useState<EintCenter | null>(null);
  const [monitoring, setMonitoring] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEintCenter().then(setCenter);
    getEintMonitoring().then((m) => setMonitoring(m as Record<string, unknown>));
  }, []);
  const dashboard = center?.dashboard as Record<string, number> | undefined;
  const indicators = monitoring?.indicators as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Centro de Inteligencia Empresarial" subtitle="Plataforma Enterprise — Sprint 3 EINT" actions={EINT_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Llamadas IA 24h</span><span className="kpi-value">{String(dashboard?.aiCalls24h ?? indicators?.aiCalls24h ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Consultas BI 24h</span><span className="kpi-value">{String(dashboard?.queries24h ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Reportes 24h</span><span className="kpi-value">{String(dashboard?.reports24h ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fiabilidad</span><span className="kpi-value">{String(dashboard?.reliabilityPct ?? indicators?.reliabilityPct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEint().then(setCenter)}>Inicializar EINT</button>
      </section>
      <section className="card">
        <h3>Componentes activos</h3>
        <p>
          Proveedores IA: {center?.providers.length ?? 0} · Asistentes: {center?.assistants.length ?? 0} ·
          Dimensiones: {center?.dimensions.length ?? 0} · Jobs ETL: {center?.etlJobs.length ?? 0} ·
          Dashboards: {center?.dashboards.length ?? 0}
        </p>
      </section>
    </>
  );
}

export function EintBiPage() {
  const [kpis, setKpis] = useState<unknown[]>([]);
  const [ebiap, setEbiap] = useState<unknown[]>([]);
  const [queries, setQueries] = useState<unknown[]>([]);
  useEffect(() => {
    listEintKpis().then(setKpis);
    listEintEbiapKpis().then(setEbiap);
    listEintQueryLogs().then(setQueries);
  }, []);

  return (
    <>
      <Header title="Centro BI" subtitle="KPIs e indicadores corporativos" actions={EINT_LINKS} />
      <section className="card">
        <h3>KPIs EINT ({kpis.length})</h3>
        <ul>{kpis.slice(0, 12).map((k: unknown, i) => {
          const row = k as Record<string, string>;
          return <li key={i}>{row.name ?? row.kpiKey} — {row.category}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>KPIs EBIAP ({ebiap.length})</h3>
        <ul>{ebiap.slice(0, 12).map((k: unknown, i) => {
          const row = k as Record<string, string>;
          return <li key={i}>{row.name ?? row.code}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Historial de consultas ({queries.length})</h3>
        <ul>{queries.slice(0, 8).map((q: unknown, i) => {
          const row = q as Record<string, string>;
          return <li key={i}>{row.queryType ?? 'query'} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EintDashboardsPage() {
  const [catalog, setCatalog] = useState<unknown[]>([]);
  const [bindings, setBindings] = useState<unknown[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEintDashboardCatalog().then(setCatalog);
    listEintDashboards().then(setBindings);
  }, []);

  return (
    <>
      <Header title="Administrador de Dashboards" subtitle="Dashboards ejecutivos y operativos" actions={EINT_LINKS} />
      <section className="card">
        <h3>Catálogo ({catalog.length})</h3>
        <div className="row-actions">
          {catalog.map((d: unknown) => {
            const row = d as Record<string, string>;
            return (
              <button
                key={row.dashboardKey}
                className="btn"
                onClick={() => getEintDashboard(row.dashboardKey).then((d) => setSelected(d as Record<string, unknown>))}
              >
                {row.name}
              </button>
            );
          })}
        </div>
      </section>
      {selected && (
        <section className="card">
          <h3>{String(selected.name ?? selected.dashboardKey)}</h3>
          <pre>{JSON.stringify(selected.widgets ?? selected.layout ?? selected, null, 2).slice(0, 2000)}</pre>
        </section>
      )}
      <section className="card">
        <h3>Bindings activos ({bindings.length})</h3>
      </section>
    </>
  );
}

export function EintReportsPage() {
  const [templates, setTemplates] = useState<unknown[]>([]);
  const [runs, setRuns] = useState<unknown[]>([]);
  useEffect(() => {
    listEintReportTemplates().then(setTemplates);
    listEintReportRuns().then(setRuns);
  }, []);

  return (
    <>
      <Header title="Centro de Reportes" subtitle="Plantillas y ejecuciones" actions={EINT_LINKS} />
      <section className="card">
        <h3>Plantillas ({templates.length})</h3>
        <ul>{templates.map((t: unknown, i) => {
          const row = t as Record<string, string>;
          return <li key={i}>{row.name ?? row.templateKey} — {row.category} — {row.status}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Ejecuciones recientes ({runs.length})</h3>
        <ul>{runs.slice(0, 10).map((r: unknown, i) => {
          const row = r as Record<string, string>;
          return <li key={i}>{row.templateKey} — {row.format} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EintAiPage() {
  const [catalog, setCatalog] = useState<unknown>(null);
  useEffect(() => { getEintAiCatalog().then(setCatalog); }, []);

  return (
    <>
      <Header title="Centro de IA" subtitle="Servicios transversales de inteligencia artificial" actions={EINT_LINKS} />
      <section className="card">
        <h3>Catálogo de servicios</h3>
        <pre>{JSON.stringify(catalog, null, 2).slice(0, 3000)}</pre>
      </section>
    </>
  );
}

export function EintModelsPage() {
  const [providers, setProviders] = useState<unknown[]>([]);
  useEffect(() => { listEintProviders().then(setProviders); }, []);

  return (
    <>
      <Header title="Administrador de Modelos" subtitle="Proveedores y configuración IA" actions={EINT_LINKS} />
      <section className="card">
        <h3>Proveedores ({providers.length})</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Vendor</th><th>Estado</th><th>Modelo</th></tr></thead>
          <tbody>
            {providers.map((p: unknown, i) => {
              const row = p as Record<string, string>;
              return (
                <tr key={i}>
                  <td>{row.providerKey}</td>
                  <td>{row.name}</td>
                  <td>{row.vendor}</td>
                  <td>{row.status}</td>
                  <td>{row.modelDefault}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EintEtlPage() {
  const [jobs, setJobs] = useState<unknown[]>([]);
  const [runs, setRuns] = useState<unknown[]>([]);
  const [dims, setDims] = useState<unknown[]>([]);
  const [facts, setFacts] = useState<unknown[]>([]);
  const [snapshots, setSnapshots] = useState<unknown[]>([]);
  useEffect(() => {
    listEintEtlJobs().then(setJobs);
    listEintEtlRuns().then(setRuns);
    listEintDimensions().then(setDims);
    listEintFacts().then(setFacts);
    listEintSnapshots().then(setSnapshots);
  }, []);

  return (
    <>
      <Header title="Centro ETL / Data Warehouse" subtitle="Procesos ETL y modelo analítico" actions={EINT_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Dimensiones</span><span className="kpi-value">{dims.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Hechos</span><span className="kpi-value">{facts.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Snapshots</span><span className="kpi-value">{snapshots.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Jobs ETL</span><span className="kpi-value">{jobs.length}</span></div>
      </div>
      <section className="card">
        <h3>Jobs ETL</h3>
        <ul>{jobs.map((j: unknown, i) => {
          const row = j as Record<string, string>;
          return <li key={i}>{row.name ?? row.jobKey} — {row.mode} — {row.status}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Ejecuciones ({runs.length})</h3>
        <ul>{runs.slice(0, 10).map((r: unknown, i) => {
          const row = r as Record<string, string>;
          return <li key={i}>{row.jobKey} — {row.status} — {row.recordsProcessed} registros</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EintConsumptionPage() {
  const [consumption, setConsumption] = useState<unknown>(null);
  const [usage, setUsage] = useState<unknown>(null);
  useEffect(() => {
    getEintConsumption().then(setConsumption);
    getEintAiUsage().then(setUsage);
  }, []);

  return (
    <>
      <Header title="Panel de Consumo" subtitle="Costos, cuotas y uso de IA" actions={EINT_LINKS} />
      <section className="card">
        <h3>Consumo</h3>
        <pre>{JSON.stringify(consumption, null, 2)}</pre>
      </section>
      <section className="card">
        <h3>Uso detallado</h3>
        <pre>{JSON.stringify(usage, null, 2)}</pre>
      </section>
    </>
  );
}

export function EintAssistantsPage() {
  const [catalog, setCatalog] = useState<unknown[]>([]);
  const [assistants, setAssistants] = useState<unknown[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState<unknown>(null);
  useEffect(() => {
    getEintAssistantCatalog().then(setCatalog);
    listEintAssistants().then(setAssistants);
  }, []);

  return (
    <>
      <Header title="Asistentes Inteligentes" subtitle="Asistentes especializados por módulo" actions={EINT_LINKS} />
      <section className="card">
        <h3>Catálogo ({catalog.length})</h3>
        <div className="row-actions">
          {catalog.map((a: unknown) => {
            const row = a as Record<string, string>;
            return (
              <button key={row.assistantKey} className={`btn ${selected === row.assistantKey ? 'btn-primary' : ''}`} onClick={() => setSelected(row.assistantKey)}>
                {row.name}
              </button>
            );
          })}
        </div>
      </section>
      <section className="card">
        <h3>Conversar</h3>
        <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensaje al asistente" />
        <button
          className="btn btn-primary"
          disabled={!selected || !message}
          onClick={() => chatEintAssistant(selected, message).then(setReply)}
        >
          Enviar
        </button>
        {reply != null && <pre>{JSON.stringify(reply, null, 2)}</pre>}
      </section>
      <section className="card">
        <h3>Instancias ({assistants.length})</h3>
      </section>
    </>
  );
}

export function EintNotificationsPage() {
  const [rules, setRules] = useState<unknown[]>([]);
  useEffect(() => { listEintNotificationRules().then(setRules); }, []);

  return (
    <>
      <Header title="Notificaciones Inteligentes" subtitle="Alertas y reglas predictivas" actions={EINT_LINKS} />
      <section className="card">
        <h3>Reglas ({rules.length})</h3>
        <ul>{rules.map((r: unknown, i) => {
          const row = r as Record<string, string>;
          return <li key={i}>{row.name ?? row.ruleKey} — {row.eventType} — {row.priority}</li>;
        })}</ul>
      </section>
    </>
  );
}
