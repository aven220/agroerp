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
  EmptyPanel,
} from '../components/page';
import {
  createEimsReservation,
  expireEimsReservations,
  listEimsItems,
  listEimsReservations,
  listEimsWarehouses,
  releaseEimsReservation,
} from '../api/eims';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

export function EimsReservationsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
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
    setRows(r as Array<Record<string, unknown>>);
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
          <EmptyPanel title="Sin reservas" description="No hay reservas registradas en el sistema." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Clave</th><th>Tipo</th><th>Artículo</th><th>Bodega</th><th>Cantidad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.id)}>
                    <td>{String(r.reservationKey)}</td>
                    <td>{String(r.reservationType)}</td>
                    <td>{String((r.item as Record<string, unknown>)?.itemKey ?? '')}</td>
                    <td>{String((r.warehouse as Record<string, unknown>)?.warehouseKey ?? '')}</td>
                    <td>{String(r.quantity)}</td>
                    <td>{String(r.status)}</td>
                    <td>
                      {r.status === 'active' ? (
                        <button
                          className="btn"
                          onClick={() =>
                            releaseEimsReservation(String(r.reservationKey))
                              .then(() => notifyEntityUpdated('inventory', '*'))
                              .then(reload)
                              .catch((e) => setError(e.message))
                          }
                        >
                          Liberar
                        </button>
                      ) : null}
                    </td>
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
