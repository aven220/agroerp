import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  TableToolbar,
  TableSearch,
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import {
  createEimsLot,
  listEimsItems,
  listEimsLots,
  listEimsWarehouses,
} from '../api/eims';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

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

  useOnEntityUpdated(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Error al recargar'));
  }, ['inventory']);

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
    notifyEntityUpdated('inventory', '*');
    setForm({ ...form, lotKey: '', initialQty: '0' });
    await reload();
  };

  return (
    <PageLayout>
      <PageHeader
        title="Lotes y trazabilidad"
        subtitle="Gestión de lotes, códigos QR/barras y consulta avanzada"
        actions={
          <PageActions>
            <Link to="/inventario/lotes/vencimientos" className="btn">Vencimientos</Link>
            <Link to="/inventario/lotes/alertas" className="btn">Alertas</Link>
            <Link to="/inventario/lotes/transformaciones" className="btn">Transformaciones</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Búsqueda">
        <TableToolbar>
          <TableSearch value={q} onChange={setQ} placeholder="Buscar código/QR/productor/artículo" aria-label="Buscar lotes" />
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
        </TableToolbar>
      </PageSection>

      <PageSection title="Crear lote manual">
        <div className="form-grid">
          <FieldGroup label="Artículo">
            <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
              <option value="">Artículo</option>
              {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Bodega">
            <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
              <option value="">Bodega</option>
              {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.warehouseKey)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Código de lote">
            <input placeholder="Código de lote (automático)" value={form.lotKey} onChange={(e) => setForm({ ...form, lotKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Cantidad">
            <input placeholder="Cantidad" value={form.initialQty} onChange={(e) => setForm({ ...form, initialQty: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Costo">
            <input placeholder="Costo" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Vencimiento">
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Productor">
            <input placeholder="Productor" value={form.producerName} onChange={(e) => setForm({ ...form, producerName: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Finca">
            <input placeholder="Finca" value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Lote agrícola">
            <input placeholder="Lote agrícola" value={form.agriculturalLotCode} onChange={(e) => setForm({ ...form, agriculturalLotCode: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => create().catch((e) => setError(e.message))}>Crear</button>
        </FormActions>
      </PageSection>

      <PageSection title="Lotes registrados">
        {rows.length === 0 ? (
          <EmptyPanel title="Sin lotes" description="Cree un lote manual o registre movimientos de entrada." />
        ) : (
          <div className="table-wrap">
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
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}
