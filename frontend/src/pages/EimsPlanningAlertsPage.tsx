import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  acknowledgeEimsPlanningAlert,
  listEimsAiInsights,
  listEimsPlanningAlerts,
  refreshEimsPlanningAlerts,
} from '../api/eims';

export function EimsPlanningAlertsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [insights, setInsights] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [a, i] = await Promise.all([
      listEimsPlanningAlerts(false),
      listEimsAiInsights(),
    ]);
    setRows(a as Array<Record<string, unknown>>);
    setInsights(i as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Panel de alertas de planificación"
        subtitle="Stock bajo, sobrestock, inmovilizado, vencimientos y reservas"
        actions={
          <>
            <button className="btn" onClick={() => refreshEimsPlanningAlerts().then(reload).catch((e) => setError(e.message))}>
              Regenerar
            </button>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Severidad</th>
              <th>Artículo</th>
              <th>Bodega</th>
              <th>Mensaje</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.alertType)}</td>
                <td>{String(r.severity)}</td>
                <td>{String(r.itemKey ?? '—')}</td>
                <td>{String(r.warehouseKey ?? '—')}</td>
                <td>{String(r.message)}</td>
                <td>
                  <button className="btn" onClick={() => acknowledgeEimsPlanningAlert(String(r.alertKey)).then(reload).catch((e) => setError(e.message))}>
                    Acusar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Insights IA</h3>
        <ul>
          {insights.slice(0, 40).map((i) => (
            <li key={String(i.id)}>
              <strong>{String(i.insightType)}</strong> · {String(i.title)} — {String(i.summary)} (score={String(i.score)})
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
