import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  acknowledgeEopAlert,
  listEopAlerts,
  listEopIncidents,
  openEopIncident,
  resolveEopAlert,
  updateEopIncidentStatus,
  type EopAlert,
  type EopIncident,
} from '../api/observability';

export function OpsIncidentsPage() {
  const [alerts, setAlerts] = useState<EopAlert[]>([]);
  const [incidents, setIncidents] = useState<EopIncident[]>([]);

  const reload = () => {
    listEopAlerts().then(setAlerts);
    listEopIncidents().then(setIncidents);
  };
  useEffect(() => { reload(); }, []);

  const createIncident = async () => {
    await openEopIncident({
      incidentKey: `inc-${Date.now()}`,
      title: 'Incidente operativo',
      description: 'Creado desde Operations Center',
      severity: 'warning',
      component: 'backend',
    });
    reload();
  };

  return (
    <>
      <Header
        title="Centro de incidentes"
        subtitle="Alertas e incidentes"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={createIncident}>Nuevo incidente</button>
            <Link to="/operaciones" className="btn">Centro</Link>
          </div>
        }
      />
      <section className="panel">
        <h3>Alertas abiertas</h3>
        <table className="data-table">
          <thead><tr><th>Título</th><th>Severidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.severity}</td>
                <td>{a.status}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => acknowledgeEopAlert(a.id).then(reload)}>Ack</button>
                  <button type="button" className="btn btn-sm" onClick={() => resolveEopAlert(a.id).then(reload)}>Resolver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Incidentes</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Título</th><th>Estado</th><th>Severidad</th><th></th></tr></thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td>{inc.incidentKey}</td>
                <td>{inc.title}</td>
                <td>{inc.status}</td>
                <td>{inc.severity}</td>
                <td>
                  {inc.status !== 'resolved' && (
                    <button type="button" className="btn btn-sm" onClick={() => updateEopIncidentStatus(inc.incidentKey, 'resolved').then(reload)}>
                      Resolver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
