import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getInventoryCosts, getInventoryKardex } from '../api/coffee';

export function CoffeeKardexPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [costs, setCosts] = useState<Array<Record<string, unknown>>>([]);
  const [lotKey, setLotKey] = useState('');

  const reload = () => {
    getInventoryKardex(lotKey || undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
    getInventoryCosts(lotKey || undefined).then((r) => setCosts(r as Array<Record<string, unknown>>));
  };

  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Kardex y costos"
        subtitle="Entradas, salidas, saldo y revalorizaciones"
        actions={
          <>
            <Link to="/compras/inventario" className="btn">Inventario</Link>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
          </>
        }
      />
      <section className="panel">
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Filtrar lotKey" value={lotKey} onChange={(e) => setLotKey(e.target.value)} />
          <button className="btn" onClick={reload}>Filtrar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Kardex</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Lote</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Saldo kg</th>
              <th>Costo unit.</th><th>Costo prom.</th><th>Saldo $</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lot = r.lot as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(lot?.lotKey ?? '')}</td>
                  <td>{String(r.movementType)}</td>
                  <td>{String(r.entryKg)}</td>
                  <td>{String(r.exitKg)}</td>
                  <td>{String(r.balanceKg)}</td>
                  <td>{Number(r.unitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(r.averageCost ?? 0).toLocaleString()}</td>
                  <td>{Number(r.balanceCost ?? 0).toLocaleString()}</td>
                  <td>{r.postedAt ? new Date(String(r.postedAt)).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Historial de costos</h3>
        <table className="data-table">
          <thead>
            <tr><th>Lote</th><th>Evento</th><th>Unit. ant.</th><th>Unit. nuevo</th><th>Prom. ant.</th><th>Prom. nuevo</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {costs.map((c, i) => {
              const lot = c.lot as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(lot?.lotKey ?? '')}</td>
                  <td>{String(c.eventType)}</td>
                  <td>{Number(c.previousUnitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.newUnitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.previousAverageCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.newAverageCost ?? 0).toLocaleString()}</td>
                  <td>{String(c.reason ?? '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
