import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getTraceabilityByLot,
  getTraceabilityByQr,
  getTraceabilityByTicket,
  listInventoryLots,
} from '../api/coffee';

export function CoffeeTraceabilityPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [mode, setMode] = useState<'ticket' | 'lot' | 'qr'>('ticket');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listInventoryLots().then((r) => setLots(r as Array<Record<string, unknown>>));
    const q = searchParams.get('q');
    const m = searchParams.get('mode') as 'ticket' | 'lot' | 'qr' | null;
    if (q) {
      setQuery(q);
      if (m) setMode(m);
      lookup(q, m ?? 'ticket').catch(() => undefined);
    }
  }, [searchParams]);

  const lookup = async (value = query, kind = mode) => {
    setError('');
    try {
      if (kind === 'ticket') setData(await getTraceabilityByTicket(value));
      else if (kind === 'lot') setData(await getTraceabilityByLot(value));
      else setData(await getTraceabilityByQr(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontrado');
      setData(null);
    }
  };

  const timeline = (data?.timeline ?? []) as Array<Record<string, unknown>>;
  const map = (data?.map ?? []) as Array<Record<string, unknown>>;
  const lot = data?.lot as Record<string, unknown> | null;
  const ticket = data?.ticket as Record<string, unknown> | undefined;

  return (
    <>
      <Header
        title="Trazabilidad de café"
        subtitle="Productor → compra → pesaje → calidad → liquidación → inventario"
        actions={
          <>
            <Link to="/compras/inventario" className="btn">Inventario</Link>
            <Link to="/compras/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/compras/inventario/auditoria" className="btn">Auditoría</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'ticket' | 'lot' | 'qr')}>
            <option value="ticket">Ticket compra</option>
            <option value="lot">Lote inventario</option>
            <option value="qr">QR / barcode</option>
          </select>
          <input
            style={{ flex: 1 }}
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" onClick={() => lookup()}>Consultar</button>
        </div>
        {error ? <p className="error-panel">{error}</p> : null}
      </section>

      <section className="panel">
        <h3>Lotes en inventario</h3>
        <table className="data-table">
          <thead>
            <tr><th>Lote</th><th>Productor</th><th>Disponible</th><th>Bodega</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={String(l.id ?? l.lotKey)}>
                <td>{String(l.lotKey)}</td>
                <td>{String(l.producerName ?? '—')}</td>
                <td>{l.availableKg != null ? `${l.availableKg} kg` : '—'}</td>
                <td>{String(l.warehouse)}</td>
                <td>{String(l.status)}</td>
                <td>
                  <button className="btn" onClick={() => { setMode('lot'); setQuery(String(l.lotKey)); lookup(String(l.lotKey), 'lot'); }}>
                    Trazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data ? (
        <>
          <section className="panel">
            <h3>Resumen</h3>
            <p>
              Ticket <strong>{String(ticket?.ticketKey ?? '—')}</strong> · Productor{' '}
              <strong>{String(ticket?.producerName ?? lot?.producerName ?? '—')}</strong> · Finca{' '}
              <strong>{String(ticket?.farmName ?? lot?.farmName ?? '—')}</strong> · Lote agrícola{' '}
              <strong>{String(ticket?.lotCode ?? lot?.agriculturalLotCode ?? '—')}</strong>
            </p>
            {lot ? (
              <p>
                Lote inventario <strong>{String(lot.lotKey)}</strong> · QR <strong>{String(lot.qrCode)}</strong> ·
                Bodega <strong>{String(lot.warehouse)}</strong> · Ubicación{' '}
                <strong>{String(lot.locationLabel ?? '—')}</strong> · Costo prom.{' '}
                <strong>{Number(lot.averageCost ?? 0).toLocaleString()}</strong>
              </p>
            ) : null}
          </section>

          <section className="panel">
            <h3>Historial completo</h3>
            <ol>
              {timeline.map((t, i) => (
                <li key={i}>
                  <strong>[{String(t.stage)}]</strong> {String(t.title)} — {String(t.description ?? '')}{' '}
                  <em>{t.occurredAt ? new Date(String(t.occurredAt)).toLocaleString() : ''}</em>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <h3>Mapa de movimientos</h3>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Tipo</th><th>Cantidad</th><th>Bodega</th><th>Origen</th><th>Destino</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {map.map((m) => (
                  <tr key={String(m.sequence)}>
                    <td>{String(m.sequence)}</td>
                    <td>{String(m.movementType)}</td>
                    <td>{String(m.quantityKg)} kg</td>
                    <td>{String(m.warehouse)}</td>
                    <td>{String(m.fromWarehouse ?? '—')}</td>
                    <td>{String(m.toWarehouse ?? '—')}</td>
                    <td>{m.postedAt ? new Date(String(m.postedAt)).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}
