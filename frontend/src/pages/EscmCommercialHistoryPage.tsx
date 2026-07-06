import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmCommercialHistory, listEscmCustomers } from '../api/escm';

export function EscmCommercialHistoryPage() {
  const [customerKey, setCustomerKey] = useState('');
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, []);

  useEffect(() => {
    getEscmCommercialHistory(customerKey || undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  }, [customerKey]);

  return (
    <>
      <Header title="Historial comercial" subtitle="Compras y transacciones por cliente" actions={<Link to="/comercial" className="btn">ESCM</Link>} />
      <section className="panel">
        <select value={customerKey} onChange={(e) => setCustomerKey(e.target.value)}>
          <option value="">Todos los clientes</option>
          {customers.map((c) => (
            <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>
          ))}
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Cliente</th><th>Documento</th><th>Fecha</th><th>Monto</th><th>Moneda</th><th>Ítems</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.historyKey)}>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.documentKey ?? '—')}</td>
                <td>{r.purchasedAt ? new Date(String(r.purchasedAt)).toLocaleDateString() : '—'}</td>
                <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
                <td>{String(r.currencyKey ?? '—')}</td>
                <td>{String(r.itemCount ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
