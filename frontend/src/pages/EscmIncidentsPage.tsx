import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmIncidents, reportEscmIncident } from '../api/escm';

export function EscmIncidentsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEscmIncidents('open').then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Panel de incidencias" subtitle="Retrasos, daños y cambios de ruta" actions={<Link to="/comercial/logistica" className="btn">Centro logístico</Link>} />
      <section className="panel">
        <button
          className="btn"
          onClick={() =>
            reportEscmIncident({
              incidentType: 'delay',
              description: 'Retraso reportado desde panel',
            }).then(reload)
          }
        >
          Reportar incidencia
        </button>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Incidencia</th><th>Tipo</th><th>Estado</th><th>Descripción</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.incidentKey)}>
                <td>{String(r.incidentKey)}</td>
                <td>{String(r.incidentType)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.description)}</td>
                <td>{new Date(String(r.reportedAt)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
