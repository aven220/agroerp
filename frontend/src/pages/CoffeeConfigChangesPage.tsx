import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeeConfigChanges } from '../api/coffee';

export function CoffeeConfigChangesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listCoffeeConfigChanges().then((r) => setRows(r as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header title="Historial de cambios de configuración" subtitle="Quién, cuándo, versión, valor anterior/nuevo" actions={<Link to="/compras/config" className="btn">Config</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Entidad</th><th>Clave</th><th>Acción</th><th>Versión</th><th>Motivo</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.entityType)}</td>
                <td>{String(r.entityKey)}</td>
                <td>{String(r.action)}</td>
                <td>{String(r.version)}</td>
                <td>{String(r.reason ?? '—')}</td>
                <td>{new Date(String(r.createdAt)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
