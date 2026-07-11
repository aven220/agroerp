import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  PageLayout,
  PageHeader,
  PageState,
  FieldGroup,
  FormActions,
} from '../components/page';
import { DataTable, type RowAction } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { listProducers, type Producer } from '../api/prm';
import {
  createCoffeeTicket,
  listCoffeeTickets,
  type CoffeeTicket,
} from '../api/coffee';
import { createBulkExportAction, createBulkCopyIdsAction } from '../lib/gridBulkActions';
import type { GridColumnDef } from '../lib/data-grid/types';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';
import { useAuth } from '../context/AuthContext';

const today = new Date().toISOString().slice(0, 10);

export function PurchasesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('coffee:receive');
  const [refresh, setRefresh] = useState(0);
  const [tickets, setTickets] = useState<CoffeeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [producersLoading, setProducersLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [producerId, setProducerId] = useState('');
  const [netWeightKg, setNetWeightKg] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTickets = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    listCoffeeTickets()
      .then(setTickets)
      .catch((e: unknown) => {
        setTickets([]);
        setLoadError(e instanceof Error ? e.message : 'Error al cargar compras');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets, refresh]);

  useOnEntityUpdated(() => setRefresh((r) => r + 1), ['purchase', 'producer']);

  useEffect(() => {
    setProducersLoading(true);
    listProducers({ limit: 200 })
      .then((res) => setProducers(res.items))
      .catch(() => setProducers([]))
      .finally(() => setProducersLoading(false));
  }, [refresh]);

  const producerMap = useMemo(() => {
    const m = new Map<string, string>();
    producers.forEach((p) => m.set(p.id, p.legalName || p.producerNumber));
    return m;
  }, [producers]);

  function openCreate() {
    setProducerId(producers[0]?.id ?? '');
    setNetWeightKg(0);
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!producerId) {
      setFormError('Seleccione un productor');
      return;
    }
    const producer = producers.find((p) => p.id === producerId);
    setSaving(true);
    setFormError(null);
    try {
      await createCoffeeTicket({
        producerId,
        producerName: producer?.legalName,
        notes: notes || (netWeightKg > 0
          ? `Registro simple ${today} · ${netWeightKg} kg indicados`
          : `Registro simple ${today}`),
      });
      setModalOpen(false);
      setRefresh((r) => r + 1);
      notifyEntityUpdated('purchase', producerId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const exportColumns = useMemo<GridColumnDef<CoffeeTicket>[]>(() => [
    { key: 'date', label: 'Fecha', getValue: (t) => t.createdAt?.slice(0, 10) ?? '' },
    { key: 'producer', label: 'Productor', getValue: (t) => t.producerName ?? producerMap.get(t.producerId ?? '') ?? '' },
    { key: 'kg', label: 'Peso (kg)', getValue: (t) => t.netWeightKg ?? '' },
    { key: 'status', label: 'Estado', getValue: (t) => t.status },
    { key: 'ticket', label: 'Ticket', getValue: (t) => t.ticketKey },
  ], [producerMap]);

  const bulkActions = useMemo(
    () => [
      createBulkExportAction(exportColumns, 'compras-cpep'),
      createBulkCopyIdsAction<CoffeeTicket>(),
    ],
    [exportColumns],
  );

  const rowActions = useMemo((): RowAction<CoffeeTicket>[] => [], []);

  const columns = useMemo(() => [
    { key: 'date', label: 'Fecha', render: (t: CoffeeTicket) => t.createdAt?.slice(0, 10) ?? '—' },
    {
      key: 'producer',
      label: 'Productor',
      render: (t: CoffeeTicket) => t.producerName ?? producerMap.get(t.producerId ?? '') ?? '—',
    },
    { key: 'kg', label: 'Peso (kg)', render: (t: CoffeeTicket) => t.netWeightKg ?? '—' },
    { key: 'status', label: 'Estado', render: (t: CoffeeTicket) => t.status },
    { key: 'ticket', label: 'Ticket', render: (t: CoffeeTicket) => t.ticketKey },
  ], [producerMap]);

  return (
    <PageLayout>
      <PageHeader
        title="Compras de café"
        subtitle="Tickets de recepción de café vinculados a productores"
        actions={
          canCreate ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
              disabled={producers.length === 0}
              title={producersLoading ? 'Cargando productores…' : producers.length === 0 ? 'Registre productores en PRM primero' : undefined}
            >
              + Nueva compra
            </button>
          ) : null
        }
      />

      {loadError ? <PageState variant="error" message={loadError} onRetry={loadTickets} /> : null}

      {loading ? (
        <PageState variant="loading" loadingVariant="table" message="Cargando compras…" />
      ) : (
        <DataTable<CoffeeTicket>
          gridId="purchases"
          data={tickets}
          bulkActions={bulkActions}
          rowActions={rowActions}
          columns={columns}
        />
      )}

      <Modal
        open={modalOpen}
        title="Nueva compra de café"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="form-grid">
          <FieldGroup label="Productor *" required>
            <select
              value={producerId}
              onChange={(e) => setProducerId(e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.legalName || p.producerNumber}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Peso neto (kg)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={netWeightKg}
              onChange={(e) => setNetWeightKg(Number(e.target.value))}
            />
          </FieldGroup>
          <FieldGroup label="Notas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FieldGroup>
          {formError ? <PageState variant="error" message={formError} loadingVariant="inline" /> : null}
          <FormActions>
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar ticket'}
            </button>
          </FormActions>
        </form>
      </Modal>
    </PageLayout>
  );
}
