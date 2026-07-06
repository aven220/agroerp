import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getExecutiveDashboard } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeExecutiveDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getExecutiveDashboard().then(setData); }, []);
  if (!data) return <LoadingState variant="dashboard" message="Cargando dashboard ejecutivo..." />;

  const kpis = (data.kpis ?? {}) as Record<string, unknown>;
  const statistics = (data.statistics ?? {}) as Record<string, Record<string, unknown>>;
  const analytics = (data.analytics ?? {}) as Record<string, unknown>;
  const suggestions = (data.suggestions ?? []) as Array<Record<string, unknown>>;
  const trends = (analytics.trends ?? {}) as Record<string, Array<Record<string, unknown>>>;
  const comparatives = (analytics.comparatives ?? {}) as Record<string, Record<string, number>>;

  return (
    <>
      <Header
        title="Dashboard ejecutivo"
        subtitle="KPIs, tendencias e IA"
        actions={
          <>
            <Link to="/compras/ops" className="btn">Operations Center</Link>
            <Link to="/compras/ops/analitica" className="btn">Analítica</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Kg comprados</span><span className="kpi-value">{Number(kpis.kgTotal ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Valor comprado</span><span className="kpi-value">{Number(kpis.amountTotal ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Precio promedio</span><span className="kpi-value">{Number(kpis.avgPricePerKg ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Humedad prom.</span><span className="kpi-value">{Number(kpis.avgHumidity ?? 0).toFixed(1)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Factor prom.</span><span className="kpi-value">{Number(kpis.avgFactor ?? 0).toFixed(1)}</span></div>
        <div className="kpi-card"><span className="kpi-label">% rechazo</span><span className="kpi-value">{Number(kpis.rejectRate ?? 0).toFixed(1)}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Bonificaciones</span><span className="kpi-value">{Number(kpis.bonusesTotal ?? 0).toLocaleString()}</span></div>
        <div className="kpi-card"><span className="kpi-label">Castigos</span><span className="kpi-value">{Number(kpis.penaltiesTotal ?? 0).toLocaleString()}</span></div>
      </div>

      <section className="panel">
        <h3>Comparativos hoy / semana / mes / año</h3>
        <table className="data-table">
          <thead><tr><th>Periodo</th><th>Tickets</th><th>Kg</th><th>Valor</th><th>Precio prom.</th><th>Rechazo %</th></tr></thead>
          <tbody>
            {['today', 'week', 'month', 'year'].map((p) => {
              const row = statistics[p] ?? {};
              return (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{String(row.tickets ?? 0)}</td>
                  <td>{Number(row.kgTotal ?? 0).toLocaleString()}</td>
                  <td>{Number(row.amountTotal ?? 0).toLocaleString()}</td>
                  <td>{Number(row.avgPricePerKg ?? 0).toLocaleString()}</td>
                  <td>{Number(row.rejectRate ?? 0).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Tendencia diaria (kg)</h3>
        <div style={{ display: 'flex', gap: 2, alignItems: 'end', minHeight: 140, overflowX: 'auto' }}>
          {(trends.daily ?? []).slice(-30).map((d) => (
            <div key={String(d.day)} style={{ minWidth: 18, textAlign: 'center' }} title={`${d.day}: ${d.kg}`}>
              <div style={{ background: '#2ea04388', height: Math.max(4, Number(d.kg) / 50) }} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Delta vs periodo anterior</h3>
        <table className="data-table">
          <thead><tr><th>Métrica</th><th>Actual</th><th>Anterior</th><th>Delta</th><th>Delta %</th></tr></thead>
          <tbody>
            {Object.entries(comparatives).map(([key, val]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{Number(val.current ?? 0).toLocaleString()}</td>
                <td>{Number(val.previous ?? 0).toLocaleString()}</td>
                <td>{Number(val.delta ?? 0).toLocaleString()}</td>
                <td>{Number(val.deltaPct ?? 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>IA — predicciones y recomendaciones</h3>
        <ul>
          {suggestions.map((s, i) => (
            <li key={i}><strong>{String(s.type)}</strong>: {String(s.recommendation)}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
