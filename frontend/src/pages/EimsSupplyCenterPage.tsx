import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  generateEimsSupplySuggestions,
  getEimsSupplyCenter,
  listEimsSupplySuggestions,
  refreshEimsPlanningAlerts,
} from '../api/eims';

export function EimsSupplyCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [c, s] = await Promise.all([getEimsSupplyCenter(), listEimsSupplySuggestions('proposed')]);
    setCenter(c);
    setSuggestions(s as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Centro de abastecimiento"
        subtitle="Reservas, niveles, sugerencias y alertas de planificación"
        actions={
          <>
            <button className="btn" onClick={() => generateEimsSupplySuggestions().then(reload).catch((e) => setError(e.message))}>
              Generar sugerencias
            </button>
            <button className="btn" onClick={() => refreshEimsPlanningAlerts().then(reload).catch((e) => setError(e.message))}>
              Evaluar alertas
            </button>
            <Link to="/inventario/reservas" className="btn">Reservas</Link>
            <Link to="/inventario/planificador" className="btn">Planificador</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Reservas activas</span><span className="kpi-value">{String(center.activeReservations ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Sugerencias abiertas</span><span className="kpi-value">{String(center.openSuggestions ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Alertas</span><span className="kpi-value">{String(center.openAlerts ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Reglas activas</span><span className="kpi-value">{String(center.activeRules ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Perfiles de nivel</span><span className="kpi-value">{String(center.levelProfiles ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Eventos calendario</span><span className="kpi-value">{String(center.upcomingCalendarEvents ?? 0)}</span></div>
        </div>
      ) : null}
      <section className="panel">
        <h3>Sugerencias recientes</h3>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Artículo</th><th>Bodega</th><th>Cantidad</th><th>Razón</th></tr></thead>
          <tbody>
            {suggestions.slice(0, 20).map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.suggestionType)}</td>
                <td>{String(r.itemKey)}</td>
                <td>{String(r.warehouseKey)}</td>
                <td>{String(r.suggestedQty)}</td>
                <td>{String(r.reason ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
