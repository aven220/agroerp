import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getEscmPriceList,
  listEscmPriceLists,
  resolveEscmPrice,
  upsertEscmPriceList,
  upsertEscmPriceListItem,
} from '../api/escm';

export function EscmPriceListsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<string>('');
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [listForm, setListForm] = useState({ name: '', currencyKey: 'COP', isDefault: false });
  const [itemForm, setItemForm] = useState({ itemKey: '', unitPrice: 0 });
  const [resolveForm, setResolveForm] = useState({ itemKey: '', customerKey: '', quantity: 1 });
  const [resolved, setResolved] = useState<Record<string, unknown> | null>(null);

  const reload = () => listEscmPriceLists().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);
  useEffect(() => {
    if (selected) getEscmPriceList(selected).then(setDetail);
    else setDetail(null);
  }, [selected]);

  return (
    <>
      <Header title="Listas de precios" subtitle="Precios por lista, producto y cliente" actions={<Link to="/comercial" className="btn">ESCM</Link>} />
      <section className="panel">
        <h3>Nueva lista</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre" value={listForm.name} onChange={(e) => setListForm({ ...listForm, name: e.target.value })} />
          <input placeholder="Moneda" value={listForm.currencyKey} onChange={(e) => setListForm({ ...listForm, currencyKey: e.target.value })} />
          <label><input type="checkbox" checked={listForm.isDefault} onChange={(e) => setListForm({ ...listForm, isDefault: e.target.checked })} /> Default</label>
          <button className="btn" onClick={() => upsertEscmPriceList(listForm).then(reload)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Moneda</th><th>Default</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.priceListKey)}>
                <td>{String(r.priceListKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.currencyKey ?? '—')}</td>
                <td>{r.isDefault ? 'Sí' : 'No'}</td>
                <td><button className="btn-link" onClick={() => setSelected(String(r.priceListKey))}>Ítems</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail ? (
        <section className="panel">
          <h3>Ítems — {String(detail.name)}</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="itemKey" value={itemForm.itemKey} onChange={(e) => setItemForm({ ...itemForm, itemKey: e.target.value })} />
            <input type="number" placeholder="Precio" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} />
            <button className="btn" onClick={() => upsertEscmPriceListItem(selected, itemForm).then(() => getEscmPriceList(selected).then(setDetail))}>Agregar</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Producto</th><th>Precio</th><th>Min qty</th></tr></thead>
            <tbody>
              {((detail.items as Array<Record<string, unknown>>) ?? []).map((i) => (
                <tr key={String(i.itemKey)}>
                  <td>{String(i.itemKey)}</td>
                  <td>{Number(i.unitPrice).toLocaleString()}</td>
                  <td>{String(i.minQty ?? 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <section className="panel">
        <h3>Resolver precio</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="itemKey" value={resolveForm.itemKey} onChange={(e) => setResolveForm({ ...resolveForm, itemKey: e.target.value })} />
          <input placeholder="customerKey" value={resolveForm.customerKey} onChange={(e) => setResolveForm({ ...resolveForm, customerKey: e.target.value })} />
          <input type="number" placeholder="Cantidad" value={resolveForm.quantity} onChange={(e) => setResolveForm({ ...resolveForm, quantity: Number(e.target.value) })} />
          <button className="btn" onClick={() => resolveEscmPrice(resolveForm).then(setResolved)}>Resolver</button>
        </div>
        {resolved ? <pre>{JSON.stringify(resolved, null, 2)}</pre> : null}
      </section>
    </>
  );
}
