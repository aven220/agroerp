import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeeAudit } from '../api/coffee';

export function CoffeeAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getCoffeeAudit().then((r) => setRows(r as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Auditoría de compras" subtitle="Eventos y acciones" actions={<Link to="/compras" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.entityType)}</td>
                <td>{String(r.entityKey)}</td>
                <td>{String(r.action)}</td>
                <td>{new Date(String(r.createdAt)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
