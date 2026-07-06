import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmAudit } from '../api/escm';

export function EscmAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    getEscmAudit().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Auditoría ESCM" subtitle="Creación, edición, precios y condiciones" actions={<Link to="/comercial" className="btn">ESCM</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Usuario</th><th>Fecha</th><th>Detalle</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{String(r.entityType)}</td>
                <td>{String(r.entityKey)}</td>
                <td>{String(r.action)}</td>
                <td>{String(r.userId ?? '—')}</td>
                <td>{r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'}</td>
                <td><code>{r.changes ? JSON.stringify(r.changes).slice(0, 80) : '—'}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
