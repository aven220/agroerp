import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEimsWarehouseMap, listEimsOpsAlerts, refreshEimsOpsAlerts, acknowledgeEimsOpsAlert } from '../api/eims';

export function EimsWarehouseMapPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [m, a] = await Promise.all([getEimsWarehouseMap(), listEimsOpsAlerts(false)]);
    setRows(m as Array<Record<string, unknown>>);
    setAlerts(a as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Mapa de ocupación de bodegas"
        subtitle="Capacidad utilizada, saturación y alertas operativas"
        actions={
          <>
            <button className="btn" onClick={() => refreshEimsOpsAlerts().then(reload).catch((e) => setError(e.message))}>
              Refrescar alertas
            </button>
            <Link to="/inventario/ops" className="btn">Ops Center</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bodega</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Usado</th>
              <th>Capacidad</th>
              <th>Ocupación</th>
              <th>Disponible</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.warehouseKey)}>
                <td>{String(r.name)}</td>
                <td>{String(r.latitude ?? '—')}</td>
                <td>{String(r.longitude ?? '—')}</td>
                <td>{String(r.usedCapacity)}</td>
                <td>{String(r.totalCapacity)}</td>
                <td>
                  <div style={{ background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Number(r.occupancyPct) || 0)}%`,
                        background: r.saturated ? '#c0392b' : '#2980b9',
                        color: '#fff',
                        padding: '2px 6px',
                      }}
                    >
                      {String(r.occupancyPct)}%
                    </div>
                  </div>
                </td>
                <td>{String(r.availableCapacity)}</td>
                <td>{r.saturated ? 'Saturada' : 'OK'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Panel de alertas operativas</h3>
        <table className="data-table">
          <thead>
            <tr><th>Tipo</th><th>Severidad</th><th>Mensaje</th><th></th></tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={String(a.id)}>
                <td>{String(a.alertType)}</td>
                <td>{String(a.severity)}</td>
                <td>{String(a.message)}</td>
                <td>
                  <button className="btn" onClick={() => acknowledgeEimsOpsAlert(String(a.alertKey)).then(reload).catch((e) => setError(e.message))}>
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
