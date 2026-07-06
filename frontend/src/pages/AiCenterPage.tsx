import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getAiCenter, type AiCenter } from '../api/ai';
import { LoadingState } from '../components/ux/LoadingState';

export function AiCenterPage() {
  const [center, setCenter] = useState<AiCenter | null>(null);

  useEffect(() => { getAiCenter().then(setCenter); }, []);

  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de IA..." />;

  return (
    <>
      <Header
        title="Centro de IA — EAIDSP"
        subtitle="Plataforma empresarial de decisión asistida por IA"
        actions={
          <div className="row-actions">
            <Link to="/ia/chat" className="btn btn-primary">Asistente</Link>
            <Link to="/ia/copilotos" className="btn">Copilotos</Link>
            <Link to="/ia/modelos" className="btn">Modelos</Link>
            <Link to="/ia/prompts" className="btn">Prompts</Link>
            <Link to="/ia/metricas" className="btn">Métricas</Link>
            <Link to="/ia/conversaciones" className="btn">Historial</Link>
            <Link to="/ia/automatizaciones" className="btn">Automatizaciones</Link>
          </div>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Consultas 24h</span>
          <span className="kpi-value">{center.dashboard.kpis.requests24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Consultas mes</span>
          <span className="kpi-value">{center.dashboard.kpis.requestsMonth}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Copilotos</span>
          <span className="kpi-value">{center.copilotCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Proveedores</span>
          <span className="kpi-value">{center.providerCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Prompts</span>
          <span className="kpi-value">{center.promptCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Latencia prom.</span>
          <span className="kpi-value">{center.dashboard.kpis.avgLatencyMs}ms</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Éxito</span>
          <span className="kpi-value">{center.dashboard.kpis.successRatePct}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Costo est. mes</span>
          <span className="kpi-value">${center.dashboard.kpis.estimatedCostMonth.toFixed(2)}</span>
        </div>
      </div>

      <div className="split-layout">
        <section className="panel">
          <h3>Por servicio</h3>
          <table className="data-table data-table-compact">
            <tbody>
              {center.dashboard.byService.map((s) => (
                <tr key={s.service}><td>{s.service}</td><td>{s.count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h3>Modelos más usados</h3>
          <table className="data-table data-table-compact">
            <tbody>
              {center.dashboard.byModel.map((m) => (
                <tr key={m.model}><td>{m.model}</td><td>{m.count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
