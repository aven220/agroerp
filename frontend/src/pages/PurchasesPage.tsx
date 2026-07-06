import { useMemo, useState } from 'react';
import { LoadingState } from '../components/ux/LoadingState';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { useResources } from '../hooks/useResources';
import { createResource, deleteResource } from '../api/resources';
import {
  RESOURCE_TYPES,
  resourceData,
  type ProducerData,
  type PurchaseData,
  type Resource,
} from '../types';

const today = new Date().toISOString().slice(0, 10);

export function PurchasesPage() {
  const [refresh, setRefresh] = useState(0);
  const { items: purchases, loading } = useResources(
    RESOURCE_TYPES.PURCHASE,
    refresh,
  );
  const { items: producers } = useResources(RESOURCE_TYPES.PRODUCER, refresh);
  const [modalOpen, setModalOpen] = useState(false);
  const [producerId, setProducerId] = useState('');
  const [form, setForm] = useState<PurchaseData>({
    weight_kg: 0,
    price_per_kg: 0,
    quality_score: 80,
    purchase_date: today,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const producerMap = useMemo(() => {
    const m = new Map<string, string>();
    producers.forEach((p) => m.set(p.id, resourceData<ProducerData>(p).name ?? ''));
    return m;
  }, [producers]);

  const total = form.weight_kg * form.price_per_kg;

  function openCreate() {
    setProducerId(producers[0]?.id ?? '');
    setForm({
      weight_kg: 0,
      price_per_kg: 0,
      quality_score: 80,
      purchase_date: today,
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!producerId) {
      setFormError('Seleccione un productor');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const purchaseData = {
        ...form,
        name: `Compra ${form.purchase_date}`,
        total,
      };
      const purchase = await createResource({
        resourceType: RESOURCE_TYPES.PURCHASE,
        parentId: producerId,
        data: purchaseData as unknown as Record<string, unknown>,
      });

      await createResource({
        resourceType: RESOURCE_TYPES.INVENTORY,
        parentId: purchase.id,
        data: {
          name: `Lote ${form.purchase_date}`,
          stock_kg: form.weight_kg,
          warehouse: 'Acopio principal',
          quality_grade: form.quality_score,
          purchase_id: purchase.id,
        },
      });

      setModalOpen(false);
      setRefresh((r) => r + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Resource) {
    if (!confirm('¿Eliminar esta compra?')) return;
    await deleteResource(row.id);
    setRefresh((r) => r + 1);
  }

  return (
    <>
      <Header
        title="Compras de café"
        subtitle="Registro de compras y generación de inventario"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
            disabled={producers.length === 0}
          >
            + Nueva compra
          </button>
        }
      />

      {loading ? (
        <LoadingState variant="table" />
      ) : (
        <DataTable<Resource>
          gridId="purchases"
          data={purchases}
          columns={[
            {
              key: 'date',
              label: 'Fecha',
              render: (r) => resourceData<PurchaseData>(r)?.purchase_date ?? '—',
            },
            {
              key: 'producer',
              label: 'Productor',
              render: (r) => producerMap.get(r.parentId ?? '') ?? '—',
            },
            {
              key: 'kg',
              label: 'Peso (kg)',
              render: (r) => resourceData<PurchaseData>(r)?.weight_kg ?? '—',
            },
            {
              key: 'quality',
              label: 'Calidad',
              render: (r) => resourceData<PurchaseData>(r)?.quality_score ?? '—',
            },
            {
              key: 'price',
              label: 'Precio/kg',
              render: (r) =>
                `$${Number(resourceData<PurchaseData>(r)?.price_per_kg ?? 0).toLocaleString('es-CO')}`,
            },
            {
              key: 'total',
              label: 'Total',
              render: (r) => {
                const d = resourceData<PurchaseData>(r);
                const t = (d.weight_kg ?? 0) * (d.price_per_kg ?? 0);
                return `$${t.toLocaleString('es-CO')}`;
              },
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
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
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title="Nueva compra de café"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="form-grid">
          <label>
            Productor *
            <select
              value={producerId}
              onChange={(e) => setProducerId(e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {resourceData<ProducerData>(p).name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha *
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              required
            />
          </label>
          <label>
            Peso (kg) *
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.weight_kg || ''}
              onChange={(e) =>
                setForm({ ...form, weight_kg: Number(e.target.value) })
              }
              required
            />
          </label>
          <label>
            Calidad (0-100)
            <input
              type="number"
              min="0"
              max="100"
              value={form.quality_score ?? ''}
              onChange={(e) =>
                setForm({ ...form, quality_score: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Precio por kg *
            <input
              type="number"
              min="0"
              value={form.price_per_kg || ''}
              onChange={(e) =>
                setForm({ ...form, price_per_kg: Number(e.target.value) })
              }
              required
            />
          </label>
          <div className="total-preview">
            Total estimado: <strong>${total.toLocaleString('es-CO')}</strong>
          </div>
          <p className="muted small">
            Al guardar se creará automáticamente un lote en inventario.
          </p>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
