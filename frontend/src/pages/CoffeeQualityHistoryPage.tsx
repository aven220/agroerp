import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeeQuality, listQualityAlerts } from '../api/coffee';

export function CoffeeQualityHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [producerId, setProducerId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [lotCode, setLotCode] = useState('');

  const reload = () => {
    listCoffeeQuality({
      producerId: producerId || undefined,
      farmId: farmId || undefined,
      lotCode: lotCode || undefined,
    }).then((r) => setRows(r as Array<Record<string, unknown>>));
    listQualityAlerts(true).then((r) => setAlerts(r as Array<Record<string, unknown>>));
  };

  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Historial de calidad"
        subtitle="Por productor, finca y lote"
        actions={<Link to="/compras/calidad" className="btn">Panel calidad</Link>}
      />

      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="producerId" value={producerId} onChange={(e) => setProducerId(e.target.value)} />
          <input placeholder="farmId" value={farmId} onChange={(e) => setFarmId(e.target.value)} />
          <input placeholder="lotCode" value={lotCode} onChange={(e) => setLotCode(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
        </div>
      </section>

      <section className="panel">
        <h3>Alertas</h3>
        <ul>
          {alerts.map((a, i) => (
            <li key={i}>[{String(a.severity)}] {String(a.code)} — {String(a.message)}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Productor</th>
              <th>Finca</th>
              <th>Lote</th>
              <th>Humedad</th>
              <th>Factor</th>
              <th>Score</th>
              <th>Grado</th>
              <th>Decisión</th>
              <th>Bonos</th>
              <th>Castigos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{String(ticket?.farmName ?? '')}</td>
                  <td>{String(ticket?.lotCode ?? '')}</td>
                  <td>{r.humidityPct != null ? `${r.humidityPct}%` : '—'}</td>
                  <td>{String(r.factor ?? '—')}</td>
                  <td>{String(r.qualityScore ?? '—')}</td>
                  <td>{String(r.grade ?? '')}</td>
                  <td>{String(r.decision ?? '')}</td>
                  <td>{String(r.bonusesTotal ?? 0)}</td>
                  <td>{String(r.penaltiesTotal ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
