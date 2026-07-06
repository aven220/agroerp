import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEopIncidentTimeline, type EopIncident } from '../api/observability';

export function OpsTimelinePage() {
  const [items, setItems] = useState<EopIncident[]>([]);
  useEffect(() => { getEopIncidentTimeline().then(setItems); }, []);

  return (
    <>
      <Header title="Timeline operativo" subtitle="Eventos e incidentes" actions={<Link to="/operaciones" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Incidente</th><th>Estado</th><th>Severidad</th><th>Actualizado</th><th>Timeline</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.incidentKey}>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>{item.severity}</td>
                <td>{new Date(item.updatedAt).toLocaleString()}</td>
                <td><pre className="code-block">{JSON.stringify(item.timeline, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
