import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listWeighingAlerts, listWeighingHistory } from '../api/coffee';

export function CoffeeWeighingHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listWeighingHistory().then((r) => setRows(r as Array<Record<string, unknown>>));
    listWeighingAlerts(true).then((r) => setAlerts(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header
        title="Historial de pesajes"
        subtitle="Trazabilidad, lecturas y alertas"
        actions={
          <>
            <Link to="/compras/pesaje" className="btn">Pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <section className="panel">
        <h3>Alertas</h3>
        <table className="data-table">
          <thead>
            <tr><th>Código</th><th>Severidad</th><th>Mensaje</th><th>Resuelta</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr key={i}>
                <td>{String(a.code)}</td>
                <td>{String(a.severity)}</td>
                <td>{String(a.message)}</td>
                <td>{a.resolved ? 'Sí' : 'No'}</td>
                <td>{a.createdAt ? new Date(String(a.createdAt)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Pesajes registrados</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Ticket</th>
              <th>Tipo</th>
              <th>Peso</th>
              <th>Fuente</th>
              <th>Balanza</th>
              <th>Firmware</th>
              <th>Contingencia</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              const scale = r.scale as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(r.weighingNumber ?? '—')}</td>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(r.weighingType)}</td>
                  <td>{r.weightKg != null ? `${r.weightKg} kg` : '—'}</td>
                  <td>{String(r.source)}</td>
                  <td>{String(scale?.scaleKey ?? r.iotDeviceKey ?? '—')}</td>
                  <td>{String(r.firmwareVersion ?? '—')}</td>
                  <td>{r.contingency ? String(r.contingencyReason ?? 'Sí') : 'No'}</td>
                  <td>{r.recordedAt ? new Date(String(r.recordedAt)).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
