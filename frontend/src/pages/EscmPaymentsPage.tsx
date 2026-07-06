import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmPayments, reconcileEscmPayment } from '../api/escm';

export function EscmPaymentsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEscmPayments().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de recaudos" subtitle="Efectivo, transferencias, cheques y pagos electrónicos" actions={<Link to="/comercial/cartera-centro" className="btn">Centro cartera</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Pago</th><th>Cliente</th><th>Método</th><th>Estado</th><th>Monto</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.paymentKey)}>
                <td>{String(r.paymentKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.paymentMethod)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.amount).toLocaleString()}</td>
                <td>
                  {r.status === 'confirmed' && (
                    <button className="btn btn-sm" onClick={() => reconcileEscmPayment(String(r.paymentKey)).then(reload)}>Conciliar</button>
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
