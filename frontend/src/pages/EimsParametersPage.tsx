import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsParameters, upsertEimsParameter } from '../api/eims';

export function EimsParametersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => listEimsParameters().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const toggle = async (row: Record<string, unknown>, enabled: boolean) => {
    const value = { ...(row.value as Record<string, unknown>), enabled };
    await upsertEimsParameter({
      parameterKey: row.parameterKey,
      name: row.name,
      value,
    });
    await reload();
  };

  return (
    <>
      <Header
        title="Parámetros de inventario"
        subtitle="Lote, serie, negativo, FIFO/LIFO y valoración"
        actions={<Link to="/inventario" className="btn">Inventario</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Valor</th><th>Versión</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const value = (r.value ?? {}) as Record<string, unknown>;
              const enabled = Boolean(value.enabled);
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.parameterKey)}</td>
                  <td>{String(r.name)}</td>
                  <td><code>{JSON.stringify(value)}</code></td>
                  <td>{String(r.version)}</td>
                  <td>
                    {'enabled' in value ? (
                      <button className="btn" onClick={() => toggle(r, !enabled)}>
                        {enabled ? 'Desactivar' : 'Activar'}
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
