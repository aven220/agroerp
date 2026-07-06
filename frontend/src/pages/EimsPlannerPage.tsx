import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  generateEimsForecasts,
  getEimsPlanner,
  listEimsForecasts,
  refreshEimsAiInsights,
} from '../api/eims';

export function EimsPlannerPage() {
  const [planner, setPlanner] = useState<Record<string, unknown> | null>(null);
  const [forecasts, setForecasts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [p, f] = await Promise.all([getEimsPlanner(), listEimsForecasts()]);
    setPlanner(p);
    setForecasts(f as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const insights = (planner?.insights as Array<Record<string, unknown>>) ?? [];
  const scenarios = (planner?.scenarios as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <Header
        title="Planificador de inventario"
        subtitle="Pronósticos de consumo, compras y rotación"
        actions={
          <>
            <button className="btn" onClick={() => generateEimsForecasts().then(reload).catch((e) => setError(e.message))}>
              Generar pronósticos
            </button>
            <button className="btn" onClick={() => refreshEimsAiInsights().then(reload).catch((e) => setError(e.message))}>
              Actualizar IA
            </button>
            <Link to="/inventario/simulador" className="btn">Simulador</Link>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <h3>Pronósticos de demanda</h3>
        <table className="data-table">
          <thead><tr><th>Artículo</th><th>Bodega</th><th>Período</th><th>Cantidad</th><th>Rotación</th><th>IA score</th></tr></thead>
          <tbody>
            {forecasts.slice(0, 50).map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.itemKey)}</td>
                <td>{String(r.warehouseKey ?? '—')}</td>
                <td>{String(r.periodStart).slice(0, 10)} — {String(r.periodEnd).slice(0, 10)}</td>
                <td>{String(r.forecastQty)}</td>
                <td>{String(r.rotationRate ?? '—')}</td>
                <td>{String(r.aiScore ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Escenarios recientes</h3>
        <ul>{scenarios.map((s) => <li key={String(s.id)}>{String(s.name)} — {String(s.status)}</li>)}</ul>
      </section>
      <section className="panel">
        <h3>Insights IA</h3>
        <ul>{insights.map((i) => <li key={String(i.id)}><strong>{String(i.insightType)}</strong> {String(i.title)}</li>)}</ul>
      </section>
    </>
  );
}
