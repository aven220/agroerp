import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { acknowledgeIotAlert, listIotAlerts, listIotEvents, type IotAlert } from '../api/iot';

export function IoTAlertsPage() {
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [events, setEvents] = useState<unknown[]>([]);
  const reload = () => {
    listIotAlerts().then(setAlerts);
    listIotEvents().then(setEvents);
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Alertas y eventos" subtitle="Alarmas IoT" actions={<Link to="/iot" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Alertas activas</h3>
        <table className="data-table">
          <thead><tr><th>Dispositivo</th><th>Severidad</th><th>Título</th><th>Mensaje</th><th>Acción</th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.deviceKey ?? '—'}</td>
                <td>{a.severity}</td>
                <td>{a.title}</td>
                <td>{a.message ?? '—'}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => acknowledgeIotAlert(a.id).then(reload)}>Atender</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Eventos</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Dispositivo</th><th>Tipo</th><th>Severidad</th><th>Fecha</th></tr></thead>
          <tbody>
            {events.map((e) => {
              const row = e as { id: string; deviceKey: string; eventType: string; severity: string; recordedAt: string };
              return (
                <tr key={row.id}>
                  <td>{row.deviceKey}</td>
                  <td>{row.eventType}</td>
                  <td>{row.severity}</td>
                  <td>{new Date(row.recordedAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
