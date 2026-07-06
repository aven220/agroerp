import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getBreCenter, type BreCenter } from '../api/bre';
import { LoadingState } from '../components/ux/LoadingState';

export function RulesCenterPage() {
  const [center, setCenter] = useState<BreCenter | null>(null);
  useEffect(() => { getBreCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de Reglas..." />;

  return (
    <>
      <Header
        title="Centro de Reglas — EBRE"
        subtitle="Enterprise Business Rules Engine"
        actions={
          <div className="row-actions">
            <Link to="/reglas/catalogo" className="btn">Catálogo</Link>
            <Link to="/reglas/disenar" className="btn btn-primary">Diseñador</Link>
            <Link to="/reglas/simulador" className="btn">Simulador</Link>
            <Link to="/reglas/versiones" className="btn">Versiones</Link>
            <Link to="/reglas/auditoria" className="btn">Auditoría</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Reglas totales</span><span className="kpi-value">{center.dashboard.totalRules}</span></div>
        <div className="kpi-card"><span className="kpi-label">Publicadas</span><span className="kpi-value">{center.dashboard.publishedRules}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ejecuciones 24h</span><span className="kpi-value">{center.dashboard.executions24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallos 24h</span><span className="kpi-value">{center.dashboard.failures24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Éxito</span><span className="kpi-value">{center.dashboard.successRatePct}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Latencia prom.</span><span className="kpi-value">{center.dashboard.avgDurationMs}ms</span></div>
        <div className="kpi-card"><span className="kpi-label">Simulaciones</span><span className="kpi-value">{center.dashboard.simulations24h}</span></div>
      </div>
      {center.suggestions.length > 0 && (
        <section className="panel">
          <h3>Sugerencias IA</h3>
          <table className="data-table data-table-compact">
            <tbody>
              {center.suggestions.map((s, i) => (
                <tr key={i}>
                  <td>{String((s as { type?: string }).type ?? '')}</td>
                  <td>{String((s as { recommendation?: string }).recommendation ?? JSON.stringify(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {center.dashboard.topRules.length > 0 && (
        <section className="panel">
          <h3>Reglas más ejecutadas (24h)</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Regla</th><th>Ejecuciones</th></tr></thead>
            <tbody>
              {center.dashboard.topRules.map((r) => (
                <tr key={r.ruleKey}><td>{r.ruleKey}</td><td>{r.count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
