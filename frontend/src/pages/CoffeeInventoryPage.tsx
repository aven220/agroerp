import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getInventoryLot,
  listInventoryLots,
  registerInventoryMovement,
  revalueInventoryLot,
} from '../api/coffee';

export function CoffeeInventoryPage() {
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [qty, setQty] = useState('100');
  const [movementType, setMovementType] = useState('transfer');
  const [toWarehouse, setToWarehouse] = useState('Bodega secundaria');
  const [error, setError] = useState('');

  const reload = () => listInventoryLots().then((r) => setLots(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const openLot = async (lotKey: string) => {
    setSelected(await getInventoryLot(lotKey));
  };

  return (
    <>
      <Header
        title="Inventario generado por compras"
        subtitle="Lotes, existencias, costos y movimientos"
        actions={
          <>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
            <Link to="/compras/inventario/kardex" className="btn">Kardex</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lote</th><th>QR</th><th>Productor</th><th>Calidad</th><th>Disponible</th>
              <th>Reservado</th><th>Costo prom.</th><th>Bodega</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => (
              <tr key={String(l.id)}>
                <td>{String(l.lotKey)}</td>
                <td>{String(l.qrCode ?? '—')}</td>
                <td>{String(l.producerName ?? '—')}</td>
                <td>{String(l.qualityGrade ?? '—')}</td>
                <td>{String(l.availableKg)} kg</td>
                <td>{String(l.reservedKg ?? 0)} kg</td>
                <td>{Number(l.averageCost ?? 0).toLocaleString()}</td>
                <td>{String(l.warehouse)}</td>
                <td>{String(l.status)}</td>
                <td><button className="btn" onClick={() => openLot(String(l.lotKey))}>Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <section className="panel">
          <h3>Detalle {String(selected.lotKey)}</h3>
          <p>
            Ubicación {String(selected.locationLabel ?? '—')} · Neto {String(selected.netWeightKg)} kg ·
            Unitario {Number(selected.unitCost ?? 0).toLocaleString()} · Total{' '}
            {Number(selected.totalCost ?? 0).toLocaleString()}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              <option value="transfer">Traslado</option>
              <option value="adjustment">Ajuste</option>
              <option value="reservation">Reserva</option>
              <option value="block">Bloqueo</option>
              <option value="release">Liberación</option>
              <option value="transformation">Transformación</option>
              <option value="exit">Salida</option>
            </select>
            <input value={qty} onChange={(e) => setQty(e.target.value)} />
            <input value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)} placeholder="Bodega destino" />
            <button
              className="btn"
              onClick={() =>
                registerInventoryMovement(String(selected.lotKey), {
                  movementType,
                  quantityKg: Number(qty),
                  toWarehouse: movementType === 'transfer' ? toWarehouse : undefined,
                  reason: `Movimiento ${movementType}`,
                })
                  .then(() => openLot(String(selected.lotKey)))
                  .then(reload)
                  .catch((e) => setError(e.message))
              }
            >
              Registrar movimiento
            </button>
            <button
              className="btn"
              onClick={() =>
                revalueInventoryLot(String(selected.lotKey), Number(selected.unitCost) * 1.02, 'Revalorización operativa')
                  .then(() => openLot(String(selected.lotKey)))
                  .then(reload)
                  .catch((e) => setError(e.message))
              }
            >
              Revalorizar +2%
            </button>
            <Link className="btn" to={`/compras/trazabilidad?mode=lot&q=${encodeURIComponent(String(selected.lotKey))}`}>
              Ver trazabilidad
            </Link>
          </div>
          <h4>Movimientos</h4>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(selected.movements ?? [], null, 2)}
          </pre>
        </section>
      ) : null}
    </>
  );
}
