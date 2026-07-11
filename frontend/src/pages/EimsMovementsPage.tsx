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
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
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

type MovementRow = {
  id: string;
  movementKey: string;
  movementType: string;
  itemKey: string;
  quantity: string;
  fromWarehouseKey: string;
  toWarehouseKey: string;
  lotKey: string;
  postedBy: string;
  status: string;
  reason: string;
};

type StockRow = {
  id: string;
  itemKey: string;
  warehouseKey: string;
  onHandQty: string;
  reservedQty: string;
  blockedQty: string;
  availableQty: string;
  averageCost: string;
};

const movementColumns: GridColumnDef<MovementRow>[] = [
  { key: 'movementKey', label: 'Clave', getValue: (m) => m.movementKey },
  { key: 'movementType', label: 'Tipo', getValue: (m) => m.movementType },
  { key: 'itemKey', label: 'Artículo', getValue: (m) => m.itemKey },
  { key: 'quantity', label: 'Cant.', getValue: (m) => m.quantity },
  { key: 'fromWarehouseKey', label: 'Origen', getValue: (m) => m.fromWarehouseKey },
  { key: 'toWarehouseKey', label: 'Destino', getValue: (m) => m.toWarehouseKey },
  { key: 'lotKey', label: 'Lote', getValue: (m) => m.lotKey },
  { key: 'postedBy', label: 'Usuario', getValue: (m) => m.postedBy },
  { key: 'status', label: 'Estado', getValue: (m) => m.status },
  { key: 'reason', label: 'Motivo', getValue: (m) => m.reason },
];

const stockColumns: GridColumnDef<StockRow>[] = [
  { key: 'itemKey', label: 'Artículo', getValue: (s) => s.itemKey },
  { key: 'warehouseKey', label: 'Bodega', getValue: (s) => s.warehouseKey },
  { key: 'onHandQty', label: 'On hand', getValue: (s) => s.onHandQty },
  { key: 'reservedQty', label: 'Reservado', getValue: (s) => s.reservedQty },
  { key: 'blockedQty', label: 'Bloqueado', getValue: (s) => s.blockedQty },
  { key: 'availableQty', label: 'Disponible', getValue: (s) => s.availableQty },
  { key: 'averageCost', label: 'Costo prom.', getValue: (s) => s.averageCost },
];

function mapMovement(m: Record<string, unknown>): MovementRow {
  const item = m.item as Record<string, unknown> | undefined;
  const from = m.fromWarehouse as Record<string, unknown> | undefined;
  const to = m.toWarehouse as Record<string, unknown> | undefined;
  const movementKey = String(m.movementKey ?? m.id ?? '');
  return {
    id: movementKey,
    movementKey,
    movementType: String(m.movementType ?? ''),
    itemKey: String(item?.itemKey ?? ''),
    quantity: String(m.quantity ?? ''),
    fromWarehouseKey: String(from?.warehouseKey ?? '—'),
    toWarehouseKey: String(to?.warehouseKey ?? '—'),
    lotKey: String(m.lotKey ?? '—'),
    postedBy: String(m.postedBy ?? '—'),
    status: String(m.status ?? ''),
    reason: String(m.reason ?? '—'),
  };
}

function mapStock(s: Record<string, unknown>, index: number): StockRow {
  const item = s.item as Record<string, unknown> | undefined;
  const warehouse = s.warehouse as Record<string, unknown> | undefined;
  const itemKey = String(item?.itemKey ?? '');
  const warehouseKey = String(warehouse?.warehouseKey ?? '');
  return {
    id: String(s.id ?? `${itemKey}-${warehouseKey}-${index}`),
    itemKey,
    warehouseKey,
    onHandQty: String(s.onHandQty ?? ''),
    reservedQty: String(s.reservedQty ?? ''),
    blockedQty: String(s.blockedQty ?? ''),
    availableQty: String(s.availableQty ?? ''),
    averageCost: Number(s.averageCost ?? 0).toLocaleString(),
  };
}

export function EimsMovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
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
    setMovements((m as Array<Record<string, unknown>>).map(mapMovement));
    setStock((s as Array<Record<string, unknown>>).map(mapStock));
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

  const movementActions: RowAction<MovementRow>[] = [
    {
      id: 'void',
      label: 'Anular',
      variant: 'danger',
      hidden: (m) => m.status !== 'confirmed',
      onAction: (m) => {
        voidEimsMovement(m.movementKey, 'Anulación controlada')
          .then(() => notifyEntityUpdated('inventory', '*'))
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Movimientos de inventario"
        subtitle="Entradas, salidas, transferencias y ajustes de existencias"
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
        <EnterpriseDataGrid
          gridId="eims-movements"
          columns={movementColumns}
          data={movements}
          selectable={false}
          rowActions={movementActions}
          emptyMessage="Aún no hay movimientos"
          emptyDescription="Los movimientos aparecerán al registrar entradas, salidas o ajustes de inventario."
        />
      </PageSection>

      <PageSection title="Existencias (derivadas de movimientos)">
        <EnterpriseDataGrid
          gridId="eims-movements-stock"
          columns={stockColumns}
          data={stock}
          selectable={false}
          emptyMessage="Aún no hay existencias"
          emptyDescription="Registre bodegas, artículos y movimientos para ver el stock aquí."
        />
      </PageSection>
    </PageLayout>
  );
}
