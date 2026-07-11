import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageToolbar,
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
import {
  createCoffeeTicket,
  listCoffeeTickets,
  searchCoffeeProducers,
  type CoffeeTicket,
} from '../api/coffee';
import { labelTicketStatus } from '../lib/productLabels';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

export function CoffeeReceptionPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<CoffeeTicket[]>([]);
  const [producerName, setProducerName] = useState('');
  const [identityDoc, setIdentityDoc] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [producerId, setProducerId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => listCoffeeTickets().then(setTickets);
  useEffect(() => {
    reload();
  }, []);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase']);

  const create = async () => {
    setError('');
    if (!producerName.trim() && !producerId.trim()) {
      setError('Indique el productor o búsquelo por nombre');
      return;
    }
    setBusy(true);
    try {
      let resolvedProducerId = producerId;
      let resolvedName = producerName.trim();
      let resolvedDoc = identityDoc.trim();
      if (!resolvedProducerId && resolvedName) {
        const found = (await searchCoffeeProducers(resolvedName)) as Array<Record<string, unknown>>;
        if (found[0]) {
          resolvedProducerId = String(found[0].id);
          resolvedName = String(found[0].producerName ?? resolvedName);
          resolvedDoc = String(found[0].identityDoc ?? resolvedDoc);
          setProducerId(resolvedProducerId);
        }
      }
      if (!resolvedProducerId && !resolvedName) {
        setError('No se encontró un productor válido para la recepción');
        return;
      }
      const ticket = await createCoffeeTicket({
        producerId: resolvedProducerId || undefined,
        producerName: resolvedName,
        identityDoc: resolvedDoc || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
      });
      notifyEntityUpdated('purchase', resolvedProducerId || ticket.ticketKey);
      setProducerName('');
      setIdentityDoc('');
      setVehiclePlate('');
      setProducerId('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la llegada');
    } finally {
      setBusy(false);
    }
  };

  const gridRows = tickets.map((t) => ({ ...t, id: t.id || t.ticketKey }));

  const columns: GridColumnDef<CoffeeTicket>[] = [
    { key: 'ticketKey', label: 'Ticket', getValue: (r) => r.ticketKey },
    { key: 'producerName', label: 'Productor', getValue: (r) => r.producerName ?? '—' },
    { key: 'status', label: 'Estado', render: (r) => labelTicketStatus(r.status) },
    { key: 'turnNumber', label: 'Turno', getValue: (r) => r.turnNumber ?? '—' },
    { key: 'netWeightKg', label: 'Neto kg', getValue: (r) => r.netWeightKg ?? '—' },
  ];

  const rowActions: RowAction<CoffeeTicket>[] = [
    {
      id: 'weigh',
      label: 'Ir a pesaje',
      hidden: (r) => r.status !== 'arrived',
      onAction: (r) => navigate(`/compras/pesaje?ticket=${encodeURIComponent(r.ticketKey)}`),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Recepción de café"
        subtitle="Llegada, identidad, pesaje, calidad, liquidación"
        actions={
          <PageActions>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Nueva recepción">
        <PageToolbar>
          <FieldGroup label="Productor">
            <input placeholder="Nombre del productor" value={producerName} onChange={(e) => setProducerName(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Documento">
            <input placeholder="Documento" value={identityDoc} onChange={(e) => setIdentityDoc(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Placa">
            <input placeholder="Placa vehículo" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
            {busy ? 'Registrando…' : 'Registrar llegada'}
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Tickets de recepción">
        {tickets.length === 0 ? (
          <EmptyPanel
            title="Sin tickets de recepción"
            description="Aún no hay llegadas registradas. Registre la primera recepción para iniciar el flujo de compra."
            hint="Después podrá continuar con pesaje, calidad y liquidación."
            action={{ label: 'Usar asistente de recepción', to: '/compras/wizard' }}
          />
        ) : (
          <EnterpriseDataGrid
            gridId="coffee-reception-tickets"
            columns={columns}
            data={gridRows}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="No hay tickets de recepción."
          />
        )}
      </PageSection>
    </PageLayout>
  );
}
