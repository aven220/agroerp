import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  createEimsLot,
  listEimsItems,
  listEimsLots,
  listEimsWarehouses,
} from '../api/eims';

export function EimsLotsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [q, setQ] = useState('');
  const [producer, setProducer] = useState('');
  const [farm, setFarm] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    itemKey: '',
    warehouseKey: '',
    lotKey: '',
    initialQty: '0',
    unitCost: '0',
    expiryDate: '',
    producerName: '',
    farmName: '',
    agriculturalLotCode: '',
  });

  const reload = async () => {
    const [lots, i, w] = await Promise.all([
      listEimsLots({
        q: q || undefined,
        producer: producer || undefined,
        farm: farm || undefined,
        status: status || undefined,
      }),
      listEimsItems(),
      listEimsWarehouses(),
    ]);
    setRows(lots as Array<Record<string, unknown>>);
    setItems(i as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const create = async () => {
    await createEimsLot({
      itemKey: form.itemKey,
      warehouseKey: form.warehouseKey,
      lotKey: form.lotKey || undefined,
      initialQty: Number(form.initialQty) || 0,
      unitCost: Number(form.unitCost) || 0,
      expiryDate: form.expiryDate || undefined,
      producerName: form.producerName || undefined,
      farmName: form.farmName || undefined,
      agriculturalLotCode: form.agriculturalLotCode || undefined,
      sourceType: 'manual',
    });
    setForm({ ...form, lotKey: '', initialQty: '0' });
    await reload();
  };

  return (
    <>
      <Header
        title="Lotes y trazabilidad"
        subtitle="Gestión de lotes, códigos QR/barras y consulta avanzada"
        actions={
          <>
            <Link to="/inventario/lotes/vencimientos" className="btn">Vencimientos</Link>
            <Link to="/inventario/lotes/alertas" className="btn">Alertas</Link>
            <Link to="/inventario/lotes/transformaciones" className="btn">Transformaciones</Link>
            <Link to="/inventario" className="btn">EIMS</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <div className="row-actions">
          <input placeholder="Buscar código/QR/productor/artículo" value={q} onChange={(e) => setQ(e.target.value)} />
          <input placeholder="Productor" value={producer} onChange={(e) => setProducer(e.target.value)} />
          <input placeholder="Finca" value={farm} onChange={(e) => setFarm(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Estado</option>
            <option value="available">available</option>
            <option value="blocked">blocked</option>
            <option value="expired">expired</option>
            <option value="transformed">transformed</option>
            <option value="dispatched">dispatched</option>
            <option value="sold">sold</option>
          </select>
          <button className="btn" onClick={() => reload().catch((e) => setError(e.message))}>Buscar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Crear lote manual</h3>
        <div className="row-actions">
          <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
            <option value="">Artículo</option>
            {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
          </select>
          <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
            <option value="">Bodega</option>
            {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
          </select>
          <input placeholder="Lot key (auto)" value={form.lotKey} onChange={(e) => setForm({ ...form, lotKey: e.target.value })} />
          <input placeholder="Cantidad" value={form.initialQty} onChange={(e) => setForm({ ...form, initialQty: e.target.value })} />
          <input placeholder="Costo" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <input placeholder="Productor" value={form.producerName} onChange={(e) => setForm({ ...form, producerName: e.target.value })} />
          <input placeholder="Finca" value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
          <input placeholder="Lote agrícola" value={form.agriculturalLotCode} onChange={(e) => setForm({ ...form, agriculturalLotCode: e.target.value })} />
          <button className="btn btn-primary" onClick={() => create().catch((e) => setError(e.message))}>Crear</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Artículo</th>
              <th>Bodega</th>
              <th>Disponible</th>
              <th>Costo acum.</th>
              <th>Estado</th>
              <th>Vence</th>
              <th>Productor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.lotKey)}</td>
                <td>{String((r.item as Record<string, unknown>)?.itemKey ?? '')}</td>
                <td>{String((r.warehouse as Record<string, unknown>)?.warehouseKey ?? '')}</td>
                <td>{String(r.onHandQty)}</td>
                <td>{String(r.accumulatedCost)}</td>
                <td>{String(r.status)}</td>
                <td>{r.expiryDate ? String(r.expiryDate).slice(0, 10) : '—'}</td>
                <td>{String(r.producerName ?? '—')}</td>
                <td><Link to={`/inventario/lotes/${encodeURIComponent(String(r.lotKey))}`}>360°</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
