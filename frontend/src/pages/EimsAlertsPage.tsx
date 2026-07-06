import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  acknowledgeEimsAlert,
  listEimsExpiryAlerts,
  refreshEimsExpiryAlerts,
} from '../api/eims';

export function EimsAlertsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = () =>
    listEimsExpiryAlerts(false)
      .then((r) => setRows(r as Array<Record<string, unknown>>))
      .catch((e) => setError(e.message));

  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Panel de alertas de vencimiento"
        subtitle="Alertas configurables y acuse de recibo"
        actions={
          <>
            <button
              className="btn"
              onClick={() => refreshEimsExpiryAlerts().then(reload).catch((e) => setError(e.message))}
            >
              Regenerar alertas
            </button>
            <Link to="/inventario/lotes/vencimientos" className="btn">Vencimientos</Link>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Alerta</th>
              <th>Lote</th>
              <th>Días</th>
              <th>Vence</th>
              <th>Severidad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.alertKey)}</td>
                <td>
                  <Link to={`/inventario/lotes/${encodeURIComponent(String(r.lotKey))}`}>
                    {String(r.lotKey)}
                  </Link>
                </td>
                <td>{String(r.daysToExpiry)}</td>
                <td>{String(r.expiryDate).slice(0, 10)}</td>
                <td>{String(r.severity)}</td>
                <td>
                  <button
                    className="btn"
                    onClick={() =>
                      acknowledgeEimsAlert(String(r.alertKey))
                        .then(reload)
                        .catch((e) => setError(e.message))
                    }
                  >
                    Acusar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
