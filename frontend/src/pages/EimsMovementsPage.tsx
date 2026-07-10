import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  TableToolbar,
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import {
  getEimsMovementMonitor,
  importEimsMovementsCsv,
  listEimsItems,
  listEimsMovements,
  listEimsStock,
  listEimsWarehouses,
  postEimsMovement,
  postEimsMovementBatch,
  voidEimsMovement,
} from '../api/eims';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

const MOVEMENT_TYPES = [
  'entry', 'exit', 'transfer', 'adjustment_positive', 'adjustment_negative',
  'reservation', 'release', 'block', 'unblock', 'transformation',
  'consumption', 'production', 'return', 'shrinkage', 'loss', 'donation', 'intercompany_transfer',
];

export function EimsMovementsPage() {
  const [movements, setMovements] = useState<Array<Record<string, unknown>>>([]);
  const [stock, setStock] = useState<Array<Record<string, unknown>>>([]);
  const [monitor, setMonitor] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [filters, setFilters] = useState({ itemKey: '', warehouseKey: '', lotKey: '', movementType: '' });
  const [form, setForm] = useState({
    movementType: 'entry',
    itemKey: '',
    quantity: '10',
    fromWarehouseKey: '',
    toWarehouseKey: '',
    lotKey: '',
    unitCost: '0',
    transportCost: '0',
    storageCost: '0',
    transformCost: '0',
    reason: '',
  });
  const [csv, setCsv] = useState('movementType,itemKey,quantity,toWarehouseKey,fromWarehouseKey,lotKey,unitCost,reason\nentry,,,,,,');
  const [error, setError] = useState('');

  const reload = async () => {
    const [m, s, mon, i, w] = await Promise.all([
      listEimsMovements({
        itemKey: filters.itemKey || undefined,
        warehouseKey: filters.warehouseKey || undefined,
        lotKey: filters.lotKey || undefined,
        movementType: filters.movementType || undefined,
      }),
      listEimsStock({
        itemKey: filters.itemKey || undefined,
        warehouseKey: filters.warehouseKey || undefined,
      }),
      getEimsMovementMonitor(),
      listEimsItems(),
      listEimsWarehouses(),
    ]);
    setMovements(m as Array<Record<string, unknown>>);
    setStock(s as Array<Record<string, unknown>>);
    setMonitor(mon);
    setItems(i as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  useOnEntityUpdated(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Error al recargar'));
  }, ['inventory', 'purchase']);

  const post = async () => {
    setError('');
    try {
      const payload: Record<string, unknown> = {
        movementType: form.movementType,
        itemKey: form.itemKey || String(items[0]?.itemKey ?? ''),
        quantity: Number(form.quantity),
        lotKey: form.lotKey || undefined,
        unitCost: Number(form.unitCost),
        transportCost: Number(form.transportCost) || undefined,
        storageCost: Number(form.storageCost) || undefined,
        transformCost: Number(form.transformCost) || undefined,
        reason: form.reason || `Movimiento ${form.movementType}`,
        source: 'manual',
      };
      if (['entry', 'adjustment_positive', 'production', 'return'].includes(form.movementType)) {
        payload.toWarehouseKey = form.toWarehouseKey || String(warehouses[0]?.warehouseKey ?? 'WH-MAIN');
      } else if (['transfer', 'intercompany_transfer'].includes(form.movementType)) {
        payload.fromWarehouseKey = form.fromWarehouseKey || String(warehouses[0]?.warehouseKey ?? 'WH-MAIN');
        payload.toWarehouseKey = form.toWarehouseKey || String(warehouses[1]?.warehouseKey ?? warehouses[0]?.warehouseKey ?? 'WH-MAIN');
      } else {
        payload.fromWarehouseKey = form.fromWarehouseKey || String(warehouses[0]?.warehouseKey ?? 'WH-MAIN');
      }
      await postEimsMovement(payload);
      notifyEntityUpdated('inventory', '*');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de movimiento');
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Centro de movimientos de inventario"
        subtitle="Motor de transacciones basado en eventos"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
            <Link to="/inventario/articulos" className="btn">Artículos</Link>
            <Link to="/inventario/bodegas" className="btn">Bodegas</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      {monitor ? (
        <PageSummary>
          <MetricCard label="Hoy" value={String(monitor.today ?? 0)} tone="blue" />
          <MetricCard label="Confirmados" value={String(monitor.confirmed ?? 0)} tone="green" />
          <MetricCard label="Anulados" value={String(monitor.voided ?? 0)} />
          <MetricCard label="Disponible" value={Number((monitor.stock as Record<string, number>)?.availableQty ?? 0).toLocaleString()} />
        </PageSummary>
      ) : null}

      <PageSection title="Operación rápida">
        <div className="form-grid">
          <FieldGroup label="Tipo">
            <select value={form.movementType} onChange={(e) => setForm({ ...form, movementType: e.target.value })}>
              {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Artículo">
            <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
              <option value="">Artículo...</option>
              {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.itemKey)} — {String(i.name)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cantidad">
            <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Cantidad" />
          </FieldGroup>
          <FieldGroup label="Origen">
            <select value={form.fromWarehouseKey} onChange={(e) => setForm({ ...form, fromWarehouseKey: e.target.value })}>
              <option value="">Origen...</option>
              {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Destino">
            <select value={form.toWarehouseKey} onChange={(e) => setForm({ ...form, toWarehouseKey: e.target.value })}>
              <option value="">Destino...</option>
              {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Lote">
            <input value={form.lotKey} onChange={(e) => setForm({ ...form, lotKey: e.target.value })} placeholder="Lote" />
          </FieldGroup>
          <FieldGroup label="Costo unit.">
            <input value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} placeholder="Costo unit." />
          </FieldGroup>
          <FieldGroup label="Costo transporte">
            <input value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} placeholder="Costo transporte" />
          </FieldGroup>
          <FieldGroup label="Costo almacenamiento">
            <input value={form.storageCost} onChange={(e) => setForm({ ...form, storageCost: e.target.value })} placeholder="Costo almacenamiento" />
          </FieldGroup>
          <FieldGroup label="Costo transformación">
            <input value={form.transformCost} onChange={(e) => setForm({ ...form, transformCost: e.target.value })} placeholder="Costo transformación" />
          </FieldGroup>
          <FieldGroup label="Motivo">
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Motivo" />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn" onClick={post}>Registrar movimiento</button>
          <button
            className="btn"
            onClick={() =>
              postEimsMovementBatch([
                {
                  movementType: 'entry',
                  itemKey: form.itemKey || String(items[0]?.itemKey ?? ''),
                  quantity: Number(form.quantity),
                  toWarehouseKey: form.toWarehouseKey || String(warehouses[0]?.warehouseKey ?? 'WH-MAIN'),
                  unitCost: Number(form.unitCost),
                  reason: 'Lote masivo 1',
                },
                {
                  movementType: 'entry',
                  itemKey: form.itemKey || String(items[0]?.itemKey ?? ''),
                  quantity: Number(form.quantity),
                  toWarehouseKey: form.toWarehouseKey || String(warehouses[0]?.warehouseKey ?? 'WH-MAIN'),
                  unitCost: Number(form.unitCost),
                  reason: 'Lote masivo 2',
                },
              ]).then(() => {
                notifyEntityUpdated('inventory', '*');
              }).then(reload).catch((e) => setError(e.message))
            }
          >
            Movimiento masivo (2)
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Importación CSV / Excel">
        <FieldGroup label="Contenido CSV">
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={4} className="full-width" />
        </FieldGroup>
        <FormActions sticky={false}>
          <button className="btn" onClick={() => importEimsMovementsCsv(csv).then(() => notifyEntityUpdated('inventory', '*')).then(reload).catch((e) => setError(e.message))}>
            Importar
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Filtros / historial">
        <TableToolbar>
          <input placeholder="Código del artículo" value={filters.itemKey} onChange={(e) => setFilters({ ...filters, itemKey: e.target.value })} />
          <input placeholder="Código de bodega" value={filters.warehouseKey} onChange={(e) => setFilters({ ...filters, warehouseKey: e.target.value })} />
          <input placeholder="Código de lote" value={filters.lotKey} onChange={(e) => setFilters({ ...filters, lotKey: e.target.value })} />
          <select value={filters.movementType} onChange={(e) => setFilters({ ...filters, movementType: e.target.value })}>
            <option value="">Tipo...</option>
            {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn" onClick={() => reload()}>Consultar</button>
        </TableToolbar>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Clave</th><th>Tipo</th><th>Artículo</th><th>Cant.</th><th>Origen</th><th>Destino</th>
                <th>Lote</th><th>Usuario</th><th>Estado</th><th>Motivo</th><th></th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const item = m.item as Record<string, unknown> | undefined;
                const from = m.fromWarehouse as Record<string, unknown> | undefined;
                const to = m.toWarehouse as Record<string, unknown> | undefined;
                return (
                  <tr key={String(m.id)}>
                    <td>{String(m.movementKey)}</td>
                    <td>{String(m.movementType)}</td>
                    <td>{String(item?.itemKey ?? '')}</td>
                    <td>{String(m.quantity)}</td>
                    <td>{String(from?.warehouseKey ?? '—')}</td>
                    <td>{String(to?.warehouseKey ?? '—')}</td>
                    <td>{String(m.lotKey ?? '—')}</td>
                    <td>{String(m.postedBy ?? '—')}</td>
                    <td>{String(m.status)}</td>
                    <td>{String(m.reason ?? '—')}</td>
                    <td>
                      {m.status === 'confirmed' ? (
                        <button
                          className="btn"
                          onClick={() =>
                            voidEimsMovement(String(m.movementKey), 'Anulación controlada')
                              .then(() => notifyEntityUpdated('inventory', '*'))
                              .then(reload)
                              .catch((e) => setError(e.message))
                          }
                        >
                          Anular
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection title="Existencias (derivadas de movimientos)">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Artículo</th><th>Bodega</th><th>On hand</th><th>Reservado</th><th>Bloqueado</th><th>Disponible</th><th>Costo prom.</th></tr>
            </thead>
            <tbody>
              {stock.map((s) => {
                const item = s.item as Record<string, unknown> | undefined;
                const warehouse = s.warehouse as Record<string, unknown> | undefined;
                return (
                  <tr key={String(s.id)}>
                    <td>{String(item?.itemKey ?? '')}</td>
                    <td>{String(warehouse?.warehouseKey ?? '')}</td>
                    <td>{String(s.onHandQty)}</td>
                    <td>{String(s.reservedQty)}</td>
                    <td>{String(s.blockedQty)}</td>
                    <td>{String(s.availableQty)}</td>
                    <td>{Number(s.averageCost ?? 0).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageSection>
    </PageLayout>
  );
}
