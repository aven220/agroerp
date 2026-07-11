import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  PageLayout,
  PageHeader,
  PageState,
  FieldGroup,
  FormActions,
} from '../components/page';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { listEimsStock, postEimsMovement, listEimsWarehouses } from '../api/eims';
import { createBulkExportAction, createBulkCopyIdsAction } from '../lib/gridBulkActions';
import type { GridColumnDef } from '../lib/data-grid/types';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';
import { useAuth } from '../context/AuthContext';

interface EimsStockRow {
  id: string;
  itemKey: string;
  itemName: string;
  warehouseKey: string;
  warehouseName: string;
  onHandQty: number;
  uomKey: string;
}

function mapStockRow(raw: Record<string, unknown>): EimsStockRow {
  const item = raw.item as Record<string, unknown> | undefined;
  const warehouse = raw.warehouse as Record<string, unknown> | undefined;
  const itemKey = String(item?.itemKey ?? raw.itemKey ?? '');
  const warehouseKey = String(warehouse?.warehouseKey ?? raw.warehouseKey ?? '');
  return {
    id: `${itemKey}:${warehouseKey}`,
    itemKey,
    itemName: String(item?.name ?? itemKey),
    warehouseKey,
    warehouseName: String(warehouse?.name ?? warehouseKey),
    onHandQty: Number(raw.onHandQty ?? raw.availableQty ?? 0),
    uomKey: String(item?.uomKey ?? ''),
  };
}

export function InventoryPage() {
  const { hasPermission } = useAuth();
  const canCreateMovement = hasPermission('inventory:item');
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<EimsStockRow[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ warehouseKey: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ itemKey: '', warehouseKey: '', quantity: 0, notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listEimsStock(), listEimsWarehouses()])
      .then(([stock, wh]) => {
        setItems((stock as Array<Record<string, unknown>>).map(mapStockRow));
        setWarehouses(
          (wh as Array<Record<string, unknown>>).map((w) => ({
            warehouseKey: String(w.warehouseKey ?? ''),
            name: String(w.name ?? w.warehouseKey ?? ''),
          })),
        );
      })
      .catch((e: unknown) => {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Error al cargar inventario');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refresh]);

  useOnEntityUpdated(() => setRefresh((r) => r + 1), ['inventory', 'purchase']);

  const totalStock = items.reduce((s, i) => s + i.onHandQty, 0);

  function openCreate() {
    setForm({
      itemKey: '',
      warehouseKey: warehouses[0]?.warehouseKey ?? '',
      quantity: 0,
      notes: '',
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemKey.trim() || !form.warehouseKey) return;
    setSaving(true);
    try {
      await postEimsMovement({
        movementType: 'entry',
        itemKey: form.itemKey.trim(),
        toWarehouseKey: form.warehouseKey,
        quantity: form.quantity,
        reason: form.notes || 'Entrada desde vista de inventario',
      });
      setModalOpen(false);
      setRefresh((r) => r + 1);
      notifyEntityUpdated('inventory', form.itemKey);
    } finally {
      setSaving(false);
    }
  }

  const exportColumns = useMemo<GridColumnDef<EimsStockRow>[]>(() => [
    { key: 'name', label: 'Artículo', getValue: (r) => r.itemName },
    { key: 'warehouse', label: 'Bodega', getValue: (r) => r.warehouseName },
    { key: 'qty', label: 'Existencia', getValue: (r) => r.onHandQty },
    { key: 'uom', label: 'UOM', getValue: (r) => r.uomKey },
  ], []);

  const bulkActions = useMemo(
    () => [
      createBulkExportAction(exportColumns, 'inventario-eims'),
      createBulkCopyIdsAction<EimsStockRow>(),
    ],
    [exportColumns],
  );

  const columns = useMemo(() => [
    { key: 'name', label: 'Artículo', render: (r: EimsStockRow) => r.itemName },
    { key: 'warehouse', label: 'Bodega', render: (r: EimsStockRow) => r.warehouseName },
    { key: 'qty', label: 'Existencia', render: (r: EimsStockRow) => r.onHandQty.toLocaleString('es-CO') },
    { key: 'uom', label: 'UOM', render: (r: EimsStockRow) => r.uomKey || '—' },
  ], []);

  return (
    <PageLayout>
      <PageHeader
        title="Inventario"
        subtitle={`Existencias · ${totalStock.toLocaleString('es-CO')} unidades en vista`}
        actions={
          canCreateMovement ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Entrada de inventario
            </button>
          ) : null
        }
      />

      {error ? <PageState variant="error" message={error} onRetry={load} /> : null}

      {loading ? (
        <PageState variant="loading" loadingVariant="table" message="Cargando inventario…" />
      ) : (
        <DataTable<EimsStockRow>
          gridId="inventory"
          data={items}
          bulkActions={bulkActions}
          columns={columns}
        />
      )}

      <Modal open={modalOpen} title="Registrar entrada" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="form-grid">
          <FieldGroup label="Código de artículo *" required>
            <input
              value={form.itemKey}
              onChange={(e) => setForm({ ...form, itemKey: e.target.value })}
              required
            />
          </FieldGroup>
          <FieldGroup label="Bodega *" required>
            <select
              value={form.warehouseKey}
              onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}
              required
            >
              {warehouses.map((w) => (
                <option key={w.warehouseKey} value={w.warehouseKey}>{w.name}</option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Cantidad *" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
          </FieldGroup>
          <FieldGroup label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </FieldGroup>
          <FormActions>
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </FormActions>
        </form>
      </Modal>
    </PageLayout>
  );
}
