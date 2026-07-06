import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  callCoffeeTurn,
  callNextCoffeeTurn,
  getCoffeeTurnHistory,
  getCoffeeTurnMetrics,
  listCoffeeTurnsQueue,
  setCoffeeTurnPriority,
  type CoffeeTicket,
} from '../api/coffee';

export function CoffeeQueuePage() {
  const [queue, setQueue] = useState<CoffeeTicket[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => {
    listCoffeeTurnsQueue().then(setQueue);
    getCoffeeTurnMetrics().then(setMetrics);
    getCoffeeTurnHistory().then((h) => setHistory(h as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Cola de espera y turnos"
        subtitle="Asignación, prioridades y llamado"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => callNextCoffeeTurn().then(reload)}>Llamar siguiente</button>
            <Link to="/compras/wizard" className="btn">Wizard</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </div>
        }
      />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">En cola</span><span className="kpi-value">{queue.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Espera avg</span><span className="kpi-value">{metrics ? `${Math.round(Number(metrics.avgWaitMs) / 1000)}s` : '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Atención avg</span><span className="kpi-value">{metrics ? `${Math.round(Number(metrics.avgAttentionMs) / 1000)}s` : '—'}</span></div>
      </div>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Turno</th><th>Ticket</th><th>Productor</th><th>Vehículo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {queue.map((t) => (
              <tr key={t.id}>
                <td>{String((t as { displayLabel?: string }).displayLabel ?? t.turnNumber ?? '—')}</td>
                <td>{t.ticketKey}</td>
                <td>{t.producerName}</td>
                <td>{t.vehiclePlate}</td>
                <td>{t.status}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => callCoffeeTurn(t.ticketKey).then(reload)}>Llamar</button>
                  <button type="button" className="btn btn-sm" onClick={() => setCoffeeTurnPriority(t.ticketKey, 1, true).then(reload)}>Preferencial</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Historial de atención</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Evento</th><th>Ticket</th><th>Productor</th><th>Fecha</th></tr></thead>
          <tbody>
            {history.slice(0, 20).map((h, i) => {
              const ticket = h.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(h.eventType)}</td>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{new Date(String(h.createdAt)).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
