import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeeTickets, type CoffeeTicket } from '../api/coffee';

export function CoffeeHistoryPage() {
  const [tickets, setTickets] = useState<CoffeeTicket[]>([]);
  useEffect(() => { listCoffeeTickets().then(setTickets); }, []);

  return (
    <>
      <Header title="Historial de compras" subtitle="Consultas y trazabilidad" actions={<Link to="/compras" className="btn">Centro</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Ticket</th><th>Productor</th><th>Finca</th><th>Lote</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketKey}</td>
                <td>{t.producerName}</td>
                <td>{t.farmName}</td>
                <td>{t.lotCode}</td>
                <td>{t.status}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
