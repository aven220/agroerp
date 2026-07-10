import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  FieldGroup,
  FormActions,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
import {
  createEimsReservation,
  expireEimsReservations,
  listEimsItems,
  listEimsReservations,
  listEimsWarehouses,
  releaseEimsReservation,
} from '../api/eims';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

type ReservationRow = {
  id: string;
  reservationKey: string;
  reservationType: string;
  itemKey: string;
  warehouseKey: string;
  quantity: string;
  status: string;
};

const columns: GridColumnDef<ReservationRow>[] = [
  { key: 'reservationKey', label: 'Clave', getValue: (r) => r.reservationKey },
  { key: 'reservationType', label: 'Tipo', getValue: (r) => r.reservationType },
  { key: 'itemKey', label: 'Artículo', getValue: (r) => r.itemKey },
  { key: 'warehouseKey', label: 'Bodega', getValue: (r) => r.warehouseKey },
  { key: 'quantity', label: 'Cantidad', getValue: (r) => r.quantity },
  { key: 'status', label: 'Estado', getValue: (r) => r.status },
];

function mapReservation(r: Record<string, unknown>): ReservationRow {
  const reservationKey = String(r.reservationKey ?? r.id ?? '');
  return {
    id: reservationKey,
    reservationKey,
    reservationType: String(r.reservationType ?? ''),
    itemKey: String((r.item as Record<string, unknown>)?.itemKey ?? ''),
    warehouseKey: String((r.warehouse as Record<string, unknown>)?.warehouseKey ?? ''),
    quantity: String(r.quantity ?? ''),
    status: String(r.status ?? ''),
  };
}

export function EimsReservationsPage() {
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reservationType: 'sales_order',
    itemKey: '',
    warehouseKey: '',
    quantity: '1',
    documentKey: '',
    customerKey: '',
    projectKey: '',
    expiresAt: '',
  });

  const reload = async () => {
    const [r, i, w] = await Promise.all([listEimsReservations(), listEimsItems(), listEimsWarehouses()]);
    setRows((r as Array<Record<string, unknown>>).map(mapReservation));
    setItems(i as Array<Record<string, unknown>>);
    setWarehouses(w as Array<Record<string, unknown>>);
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  useOnEntityUpdated(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Error al recargar'));
  }, ['inventory']);

  const create = async () => {
    await createEimsReservation({
      ...form,
      quantity: Number(form.quantity),
      expiresAt: form.expiresAt || undefined,
    });
    notifyEntityUpdated('inventory', '*');
    await reload();
  };

  const rowActions: RowAction<ReservationRow>[] = [
    {
      id: 'release',
      label: 'Liberar',
      hidden: (r) => r.status !== 'active',
      onAction: (r) => {
        releaseEimsReservation(r.reservationKey)
          .then(() => notifyEntityUpdated('inventory', '*'))
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Panel de reservas"
        subtitle="Pedidos, OT, producción, clientes, proyectos y temporales"
        actions={
          <PageActions>
            <button className="btn" onClick={() => expireEimsReservations().then(reload).catch((e) => setError(e.message))}>
              Liberar vencidas
            </button>
            <Link to="/inventario/abastecimiento" className="btn">Abastecimiento</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Nueva reserva">
        <div className="form-grid">
          <FieldGroup label="Tipo">
            <select value={form.reservationType} onChange={(e) => setForm({ ...form, reservationType: e.target.value })}>
              <option value="sales_order">Pedido</option>
              <option value="work_order">Orden de trabajo</option>
              <option value="production">Producción</option>
              <option value="customer">Cliente</option>
              <option value="project">Proyecto</option>
              <option value="temporary">Temporal</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Artículo">
            <select value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })}>
              <option value="">Artículo</option>
              {items.map((i) => <option key={String(i.itemKey)} value={String(i.itemKey)}>{String(i.name)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Bodega">
            <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
              <option value="">Bodega</option>
              {warehouses.map((w) => <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Cantidad">
            <input placeholder="Cantidad" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Documento">
            <input placeholder="Documento" value={form.documentKey} onChange={(e) => setForm({ ...form, documentKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Cliente">
            <input placeholder="Cliente" value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Proyecto">
            <input placeholder="Proyecto" value={form.projectKey} onChange={(e) => setForm({ ...form, projectKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Vence">
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button className="btn btn-primary" onClick={() => create().catch((e) => setError(e.message))}>Reservar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Reservas activas">
        {rows.length === 0 ? (
          <PageState
            variant="empty"
            title="Sin reservas"
            message="No hay reservas registradas en el sistema."
            loadingVariant="inline"
          />
        ) : (
          <EnterpriseDataGrid
            gridId="eims-reservations"
            columns={columns}
            data={rows}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="Sin reservas"
          />
        )}
      </PageSection>
    </PageLayout>
  );
}
