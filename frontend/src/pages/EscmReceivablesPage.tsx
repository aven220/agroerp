import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmReceivables, sendEscmReminder } from '../api/escm';

export function EscmReceivablesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => listEscmReceivables(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, [status]);

  return (
    <>
      <Header title="Cartera por cobrar" subtitle="Facturas pendientes, parciales y vencidas" actions={<Link to="/comercial/cartera-centro" className="btn">Centro cartera</Link>} />
      <section className="panel">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="open">Abierta</option>
          <option value="partial">Parcial</option>
          <option value="overdue">Vencida</option>
          <option value="paid">Pagada</option>
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Cartera</th><th>Factura</th><th>Cliente</th><th>Saldo</th><th>Vence</th><th>Riesgo</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.receivableKey)}>
                <td>{String(r.receivableKey)}</td>
                <td>{String(r.invoiceKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{Number(r.balanceAmount).toLocaleString()}</td>
                <td>{String(r.dueDate).slice(0, 10)}</td>
                <td>{String(r.riskClass)}</td>
                <td>
                  {r.status === 'overdue' && (
                    <button className="btn btn-sm" onClick={() => sendEscmReminder(String(r.receivableKey)).then(reload)}>Recordar</button>
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
