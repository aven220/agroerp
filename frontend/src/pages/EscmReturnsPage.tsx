import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { approveEscmReturn, listEscmReturns, processEscmReturn } from '../api/escm';

export function EscmReturnsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => listEscmReturns(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, [status]);

  return (
    <>
      <Header title="Gestor de devoluciones" subtitle="Totales, parciales, garantía y calidad" actions={<Link to="/comercial/facturacion" className="btn">Centro facturación</Link>} />
      <section className="panel">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="submitted">Enviada</option>
          <option value="approved">Aprobada</option>
          <option value="processed">Procesada</option>
          <option value="rejected">Rechazada</option>
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Devolución</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.returnKey)}>
                <td>{String(r.returnKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.returnType)}</td>
                <td>{String(r.status)}</td>
                <td className="row-actions">
                  {r.status === 'submitted' && (
                    <button className="btn btn-sm" onClick={() => approveEscmReturn(String(r.returnKey)).then(reload)}>Aprobar</button>
                  )}
                  {r.status === 'approved' && (
                    <button className="btn btn-sm" onClick={() => processEscmReturn(String(r.returnKey)).then(reload)}>Procesar</button>
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
