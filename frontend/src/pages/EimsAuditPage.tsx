import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEimsAudit } from '../api/eims';

export function EimsAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    getEimsAudit().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Auditoría EIMS" subtitle="Creación, edición y configuración" actions={<Link to="/inventario" className="btn">EIMS</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Usuario</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{String(r.entityType)}</td>
                <td>{String(r.entityKey)}</td>
                <td>{String(r.action)}</td>
                <td>{String(r.userId ?? '—')}</td>
                <td>{r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
