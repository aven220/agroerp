import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeePurchasesToday, type CoffeeTicket } from '../api/coffee';

export function CoffeeDayPage() {
  const [rows, setRows] = useState<CoffeeTicket[]>([]);
  useEffect(() => { getCoffeePurchasesToday().then(setRows); }, []);

  const kg = rows.reduce((s, r) => s + (r.netWeightKg ?? 0), 0);

  return (
    <>
      <Header title="Compras del día" subtitle="Operación diaria de recepción" actions={<Link to="/compras" className="btn">Centro</Link>} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Tickets</span><span className="kpi-value">{rows.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Kg netos</span><span className="kpi-value">{kg.toFixed(0)}</span></div>
      </div>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Ticket</th><th>Productor</th><th>Turno</th><th>Estado</th><th>Neto kg</th><th>Hora</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketKey}</td>
                <td>{t.producerName}</td>
                <td>{t.turnNumber ?? '—'}</td>
                <td>{t.status}</td>
                <td>{t.netWeightKg ?? '—'}</td>
                <td>{new Date(t.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
