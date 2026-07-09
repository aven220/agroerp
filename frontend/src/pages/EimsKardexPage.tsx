import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  compareEimsValuationMethods,
  getEimsCostHistory,
  getEimsFinancialReport,
  getEimsInventoryValue,
  listEimsItems,
  listEimsKardex,
  listEimsWarehouses,
} from '../api/eims';

export function EimsKardexPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [costs, setCosts] = useState<Array<Record<string, unknown>>>([]);
  const [value, setValue] = useState<Record<string, unknown> | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [compare, setCompare] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [itemKey, setItemKey] = useState('');
  const [warehouseKey, setWarehouseKey] = useState('');
  const [lotKey, setLotKey] = useState('');
  const [error, setError] = useState('');

  const reload = async () => {
    const [k, c, v, r, i, w] = await Promise.all([
      listEimsKardex({
        itemKey: itemKey || undefined,
        warehouseKey: warehouseKey || undefined,
        lotKey: lotKey || undefined,
      }),
      getEimsCostHistory(itemKey || undefined),
      getEimsInventoryValue(),
      getEimsFinancialReport(),
      listEimsItems(),
      listEimsWarehouses(),
    ]);
    setRows(k as Array<Record<string, unknown>>);
    setCosts(c as Array<Record<string, unknown>>);
    setValue(v);
    setReport(r);
    setItems(i as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  return (
    <>
      <Header
        title="Centro de Kardex y valoración"
        subtitle="Saldo permanente, costos y comparación de métodos"
        actions={
          <>
            <Link to="/inventario/cierres" className="btn">Cierres</Link>
            <Link to="/inventario/movimientos" className="btn">Movimientos</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}

      {value ? (
        <section className="panel grid-4">
          <div><strong>Valor inventario</strong><div>{Number(value.total ?? 0).toLocaleString()}</div></div>
          <div><strong>Artículos valorados</strong><div>{Object.keys((value.byItem as object) ?? {}).length}</div></div>
          <div><strong>Bodegas</strong><div>{Object.keys((value.byWarehouse as object) ?? {}).length}</div></div>
          <div><strong>Eventos de costo</strong><div>{costs.length}</div></div>
        </section>
      ) : null}

      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={itemKey} onChange={(e) => setItemKey(e.target.value)}>
            <option value="">Artículo...</option>
            {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
          </select>
          <select value={warehouseKey} onChange={(e) => setWarehouseKey(e.target.value)}>
            <option value="">Bodega...</option>
            {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
          </select>
          <input placeholder="Código de lote" value={lotKey} onChange={(e) => setLotKey(e.target.value)} />
          <button className="btn" onClick={() => reload()}>Consultar Kardex</button>
          <button
            className="btn"
            onClick={() =>
              compareEimsValuationMethods(
                itemKey || String(items[0]?.itemKey ?? ''),
                warehouseKey || String(warehouses[0]?.warehouseKey ?? ''),
              )
                .then(setCompare)
                .catch((e) => setError(e.message))
            }
          >
            Comparar métodos
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Kardex permanente</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th><th>Artículo</th><th>Bodega</th><th>Movimiento</th><th>Saldo ant.</th>
              <th>Entrada</th><th>Salida</th><th>Saldo</th><th>Costo unit.</th><th>Costo total</th>
              <th>Saldo $</th><th>Método</th><th>Documento</th><th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const item = r.item as Record<string, unknown> | undefined;
              const warehouse = r.warehouse as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{r.postedAt ? new Date(String(r.postedAt)).toLocaleString() : '—'}</td>
                  <td>{String(item?.itemKey ?? '')}</td>
                  <td>{String(warehouse?.warehouseKey ?? '')}</td>
                  <td>{String(r.movementType)}</td>
                  <td>{String(r.previousBalanceQty)}</td>
                  <td>{String(r.entryQty)}</td>
                  <td>{String(r.exitQty)}</td>
                  <td>{String(r.balanceQty)}</td>
                  <td>{Number(r.unitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(r.totalCost ?? 0).toLocaleString()}</td>
                  <td>{Number(r.balanceCost ?? 0).toLocaleString()}</td>
                  <td>{String(r.valuationMethod)}</td>
                  <td>{String(r.documentKey ?? '—')}</td>
                  <td>{String(r.postedBy ?? '—')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {compare ? (
        <section className="panel">
          <h3>Comparación de métodos de valoración</h3>
          <pre className="code-block">{JSON.stringify(compare, null, 2)}</pre>
        </section>
      ) : null}

      <section className="panel">
        <h3>Historial de costos</h3>
        <table className="data-table">
          <thead>
            <tr><th>Artículo</th><th>Evento</th><th>Método</th><th>Unit. ant.</th><th>Unit. nuevo</th><th>Prom. nuevo</th><th>Transporte</th><th>Almacenamiento</th><th>Transformación</th></tr>
          </thead>
          <tbody>
            {costs.map((c, i) => {
              const item = c.item as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(item?.itemKey ?? '')}</td>
                  <td>{String(c.eventType)}</td>
                  <td>{String(c.valuationMethod)}</td>
                  <td>{Number(c.previousUnitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.newUnitCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.newAverageCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.transportCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.storageCost ?? 0).toLocaleString()}</td>
                  <td>{Number(c.transformCost ?? 0).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {report ? (
        <section className="panel">
          <h3>Reporte financiero</h3>
          <p>Valor total: <strong>{Number(report.inventoryValue ?? 0).toLocaleString()}</strong></p>
          <pre className="code-block">{JSON.stringify({ byWarehouse: report.byWarehouse, byItem: report.byItem }, null, 2)}</pre>
        </section>
      ) : null}
    </>
  );
}
