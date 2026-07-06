import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { approveEscmWarranty, listEscmWarranties } from '../api/escm';

export function EscmWarrantiesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => listEscmWarranties(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, [status]);

  return (
    <>
      <Header title="Centro de garantías" subtitle="Solicitudes, aprobaciones, reposiciones y reparaciones" actions={<Link to="/comercial/facturacion" className="btn">Centro facturación</Link>} />
      <section className="panel">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pending_approval">Pendiente</option>
          <option value="in_repair">En reparación</option>
          <option value="replacement">Reposición</option>
          <option value="closed">Cerrada</option>
          <option value="rejected">Rechazada</option>
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Reclamo</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.claimKey)}>
                <td>{String(r.claimKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.claimType)}</td>
                <td>{String(r.status)}</td>
                <td className="row-actions">
                  {r.status === 'pending_approval' && (
                    <>
                      <button className="btn btn-sm" onClick={() => approveEscmWarranty(String(r.claimKey), 'replacement').then(reload)}>Reposición</button>
                      <button className="btn btn-sm" onClick={() => approveEscmWarranty(String(r.claimKey), 'repair').then(reload)}>Reparación</button>
                    </>
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
