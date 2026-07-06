import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createEscmRoute, listEscmDispatches, listEscmRoutes, startEscmRoute } from '../api/escm';

export function EscmRoutesPage() {
  const [routes, setRoutes] = useState<Array<Record<string, unknown>>>([]);
  const [dispatches, setDispatches] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const reload = () => {
    listEscmRoutes().then((r) => setRoutes(r as Array<Record<string, unknown>>));
    listEscmDispatches({ status: 'ready' }).then((r) => setDispatches(r as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Mapa de rutas" subtitle="Planificación y asignación de transporte" actions={<Link to="/comercial/logistica" className="btn">Centro logístico</Link>} />
      <section className="panel">
        <h3>Crear ruta (auto-asignación)</h3>
        {dispatches.map((d) => (
          <label key={String(d.dispatchKey)} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selected.includes(String(d.dispatchKey))}
              onChange={(e) => {
                const key = String(d.dispatchKey);
                setSelected(e.target.checked ? [...selected, key] : selected.filter((k) => k !== key));
              }}
            />
            {String(d.dispatchKey)} — {String(d.customerKey)}
          </label>
        ))}
        <button
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() =>
            createEscmRoute({ dispatchKeys: selected, autoAssign: true }).then(() => {
              setSelected([]);
              reload();
            })
          }
        >
          Planificar ruta
        </button>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Ruta</th><th>Estado</th><th>Distancia km</th><th>ETA min</th><th>Vehículo</th><th>Acciones</th></tr></thead>
          <tbody>
            {routes.map((r) => (
              <tr key={String(r.routeKey)}>
                <td>{String(r.routeKey)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.totalDistanceKm ?? 0)}</td>
                <td>{Number(r.estimatedMinutes ?? 0)}</td>
                <td>{String(r.vehicleKey ?? '—')}</td>
                <td>
                  {r.status !== 'in_transit' ? (
                    <button className="btn-link" onClick={() => startEscmRoute(String(r.routeKey)).then(reload)}>Salida</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
