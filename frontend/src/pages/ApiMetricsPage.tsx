import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getApiMetrics, type ApiMetrics } from '../api/apim';

export function ApiMetricsPage() {
  const [metrics, setMetrics] = useState<ApiMetrics | null>(null);

  useEffect(() => { getApiMetrics().then(setMetrics); }, []);

  return (
    <>
      <Header title="Métricas de APIs" subtitle="Latencia · errores · consumo" actions={<Link to="/apis" className="btn">Centro APIs</Link>} />

      {metrics && (
        <>
          <div className="kpi-grid kpi-grid-lg">
            <div className="kpi-card"><span className="kpi-label">24h</span><span className="kpi-value">{metrics.kpis.requests24h}</span></div>
            <div className="kpi-card"><span className="kpi-label">Mes</span><span className="kpi-value">{metrics.kpis.requestsMonth}</span></div>
            <div className="kpi-card"><span className="kpi-label">Latencia</span><span className="kpi-value">{metrics.kpis.avgLatencyMs}ms</span></div>
            <div className="kpi-card"><span className="kpi-label">Errores</span><span className="kpi-value">{metrics.kpis.errorRatePct}%</span></div>
          </div>

          <div className="split-layout">
            <section className="panel">
              <h3>Por módulo</h3>
              <table className="data-table data-table-compact">
                <tbody>
                  {metrics.byModule.map((m) => (
                    <tr key={m.module}><td>{m.module}</td><td>{m.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="panel">
              <h3>Endpoints más usados</h3>
              <table className="data-table data-table-compact">
                <tbody>
                  {metrics.byEndpoint.map((e, i) => (
                    <tr key={i}><td>{e.method} {e.path}</td><td>{e.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
