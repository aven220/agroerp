import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  listEimsLots,
  listEimsTransformations,
  mergeEimsLots,
  mixEimsLots,
  splitEimsLot,
} from '../api/eims';

export function EimsTransformsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [split, setSplit] = useState({ lotKey: '', qty1: '10', qty2: '10', reason: 'División operativa' });
  const [merge, setMerge] = useState({ lotA: '', qtyA: '5', lotB: '', qtyB: '5', reason: 'Unificación' });
  const [mix, setMix] = useState({ lotA: '', qtyA: '5', lotB: '', qtyB: '5', reason: 'Mezcla' });

  const reload = async () => {
    const [t, l] = await Promise.all([listEimsTransformations(), listEimsLots()]);
    setRows(t as Array<Record<string, unknown>>);
    setLots(l as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Panel de transformaciones"
        subtitle="División, unificación, mezcla y procesos industriales"
        actions={<Link to="/inventario/lotes" className="btn">Lotes</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <h3>Dividir lote</h3>
        <div className="row-actions">
          <select value={split.lotKey} onChange={(e) => setSplit({ ...split, lotKey: e.target.value })}>
            <option value="">Lote origen</option>
            {lots.map((l) => <option key={String(l.lotKey)} value={String(l.lotKey)}>{String(l.lotKey)} ({String(l.onHandQty)})</option>)}
          </select>
          <input value={split.qty1} onChange={(e) => setSplit({ ...split, qty1: e.target.value })} />
          <input value={split.qty2} onChange={(e) => setSplit({ ...split, qty2: e.target.value })} />
          <input value={split.reason} onChange={(e) => setSplit({ ...split, reason: e.target.value })} />
          <button
            className="btn btn-primary"
            onClick={() =>
              splitEimsLot({
                lotKey: split.lotKey,
                parts: [{ quantity: Number(split.qty1) }, { quantity: Number(split.qty2) }],
                reason: split.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Dividir
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Unificar lotes</h3>
        <div className="row-actions">
          <select value={merge.lotA} onChange={(e) => setMerge({ ...merge, lotA: e.target.value })}>
            <option value="">Lote A</option>
            {lots.map((l) => <option key={`ma-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
          </select>
          <input value={merge.qtyA} onChange={(e) => setMerge({ ...merge, qtyA: e.target.value })} />
          <select value={merge.lotB} onChange={(e) => setMerge({ ...merge, lotB: e.target.value })}>
            <option value="">Lote B</option>
            {lots.map((l) => <option key={`mb-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
          </select>
          <input value={merge.qtyB} onChange={(e) => setMerge({ ...merge, qtyB: e.target.value })} />
          <button
            className="btn"
            onClick={() =>
              mergeEimsLots({
                parents: [
                  { lotKey: merge.lotA, quantity: Number(merge.qtyA) },
                  { lotKey: merge.lotB, quantity: Number(merge.qtyB) },
                ],
                reason: merge.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Unificar
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Mezclar lotes</h3>
        <div className="row-actions">
          <select value={mix.lotA} onChange={(e) => setMix({ ...mix, lotA: e.target.value })}>
            <option value="">Lote A</option>
            {lots.map((l) => <option key={`xa-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
          </select>
          <input value={mix.qtyA} onChange={(e) => setMix({ ...mix, qtyA: e.target.value })} />
          <select value={mix.lotB} onChange={(e) => setMix({ ...mix, lotB: e.target.value })}>
            <option value="">Lote B</option>
            {lots.map((l) => <option key={`xb-${String(l.lotKey)}`} value={String(l.lotKey)}>{String(l.lotKey)}</option>)}
          </select>
          <input value={mix.qtyB} onChange={(e) => setMix({ ...mix, qtyB: e.target.value })} />
          <button
            className="btn"
            onClick={() =>
              mixEimsLots({
                parents: [
                  { lotKey: mix.lotA, quantity: Number(mix.qtyA) },
                  { lotKey: mix.lotB, quantity: Number(mix.qtyB) },
                ],
                reason: mix.reason,
              })
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Mezclar
          </button>
        </div>
      </section>
      <section className="panel">
        <h3>Historial de transformaciones</h3>
        <table className="data-table">
          <thead>
            <tr><th>Clave</th><th>Tipo</th><th>Origen</th><th>Destino</th><th>Cant.</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.transformationKey)}</td>
                <td>{String(r.transformType)}</td>
                <td><Link to={`/inventario/lotes/${encodeURIComponent(String(r.parentLotKey))}`}>{String(r.parentLotKey)}</Link></td>
                <td><Link to={`/inventario/lotes/${encodeURIComponent(String(r.childLotKey))}`}>{String(r.childLotKey)}</Link></td>
                <td>{String(r.quantity)}</td>
                <td>{String(r.performedAt).slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
