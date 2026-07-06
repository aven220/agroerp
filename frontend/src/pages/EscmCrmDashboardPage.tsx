import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmCrmDashboard, seedEscmPipeline } from '../api/escm';

export function EscmCrmDashboardPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);

  const reload = () => getEscmCrmDashboard().then(setDash);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Dashboard CRM"
        subtitle="Pipeline, oportunidades y actividades comerciales"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => seedEscmPipeline().then(reload)}>Sembrar pipeline</button>
            <Link to="/comercial/pipeline" className="btn">Pipeline</Link>
            <Link to="/comercial/oportunidades" className="btn">Oportunidades</Link>
            <Link to="/comercial/cotizaciones" className="btn">Cotizaciones</Link>
            <Link to="/comercial/agenda" className="btn">Agenda</Link>
            <Link to="/comercial" className="btn">ESCM</Link>
          </div>
        }
      />
      {dash ? (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card kpi-card-primary"><span className="kpi-label">Prospectos</span><span className="kpi-value">{String(dash.prospects ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Oportunidades abiertas</span><span className="kpi-value">{String(dash.openOpportunities ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Ganadas</span><span className="kpi-value">{String(dash.wonOpportunities ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Perdidas</span><span className="kpi-value">{String(dash.lostOpportunities ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Actividades pend.</span><span className="kpi-value">{String(dash.pendingActivities ?? 0)}</span></div>
            <div className="kpi-card"><span className="kpi-label">Valor pipeline</span><span className="kpi-value">{Number(dash.pipelineValue ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Pipeline ponderado</span><span className="kpi-value">{Number(dash.weightedPipeline ?? 0).toLocaleString()}</span></div>
            <div className="kpi-card"><span className="kpi-label">Cotizaciones</span><span className="kpi-value">{String(dash.quotations ?? 0)}</span></div>
          </div>
          <section className="panel">
            <h3>Interacciones recientes</h3>
            <ul>
              {((dash.recentInteractions as Array<Record<string, unknown>>) ?? []).map((i) => (
                <li key={String(i.interactionKey)}>{String(i.interactionType)} — {String(i.subject ?? '—')} ({i.occurredAt ? new Date(String(i.occurredAt)).toLocaleString() : '—'})</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
