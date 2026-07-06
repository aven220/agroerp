import { useState } from 'react';
import { LoadingState } from '../components/ux/LoadingState';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { useResources } from '../hooks/useResources';
import {
  createResource,
  deleteResource,
  updateResource,
} from '../api/resources';
import { RESOURCE_TYPES, resourceData, type InventoryData, type Resource } from '../types';

export function InventoryPage() {
  const [refresh, setRefresh] = useState(0);
  const { items, loading } = useResources(RESOURCE_TYPES.INVENTORY, refresh);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<InventoryData>({
    name: '',
    stock_kg: 0,
    warehouse: 'Acopio principal',
    quality_grade: '',
  });
  const [saving, setSaving] = useState(false);

  const totalStock = items.reduce(
    (s, i) => s + Number(resourceData<InventoryData>(i).stock_kg ?? 0),
    0,
  );

  function openEdit(row: Resource) {
    const d = resourceData<InventoryData>(row);
    setEditing(row);
    setForm({
      name: d.name ?? '',
      stock_kg: d.stock_kg ?? 0,
      warehouse: d.warehouse ?? '',
      quality_grade: String(d.quality_grade ?? ''),
    });
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', stock_kg: 0, warehouse: 'Acopio principal', quality_grade: '' });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateResource(editing.id, {
          data: form as unknown as Record<string, unknown>,
        });
      } else {
        await createResource({
          resourceType: RESOURCE_TYPES.INVENTORY,
          data: form as unknown as Record<string, unknown>,
        });
      }
      setModalOpen(false);
      setRefresh((r) => r + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Resource) {
    if (!confirm('¿Eliminar lote de inventario?')) return;
    await deleteResource(row.id);
    setRefresh((r) => r + 1);
  }

  return (
    <>
      <Header
        title="Inventario"
        subtitle={`Stock total: ${totalStock.toLocaleString('es-CO')} kg`}
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Ajuste manual
          </button>
        }
      />

      {loading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable<Resource>
          gridId="inventory"
          data={items}
          columns={[
            {
              key: 'name',
              label: 'Lote',
              render: (r) => resourceData<InventoryData>(r)?.name ?? '—',
            },
            {
              key: 'stock',
              label: 'Stock (kg)',
              render: (r) => resourceData<InventoryData>(r)?.stock_kg ?? '—',
            },
            {
              key: 'warehouse',
              label: 'Bodega',
              render: (r) => resourceData<InventoryData>(r)?.warehouse ?? '—',
            },
            {
              key: 'quality',
              label: 'Calidad',
              render: (r) => resourceData<InventoryData>(r)?.quality_grade ?? '—',
            },
            {
              key: 'actions',
              label: 'Acciones',
              render: (r) => (
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(r);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar lote' : 'Nuevo lote'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="form-grid">
          <label>
            Nombre *
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Stock (kg) *
            <input
              type="number"
              min="0"
              value={form.stock_kg}
              onChange={(e) => setForm({ ...form, stock_kg: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            Bodega
            <input
              value={form.warehouse}
              onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
