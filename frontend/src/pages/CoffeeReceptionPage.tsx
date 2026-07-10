import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import {
  createCoffeeTicket,
  listCoffeeTickets,
  searchCoffeeProducers,
  type CoffeeTicket,
} from '../api/coffee';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

export function CoffeeReceptionPage() {
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
          <EmptyPanel title="Sin tickets" description="Registre la primera llegada para iniciar el flujo CPEP." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Ticket</th><th>Productor</th><th>Estado</th><th>Turno</th><th>Neto kg</th><th></th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>{t.ticketKey}</td>
                    <td>{t.producerName}</td>
                    <td>{t.status}</td>
                    <td>{t.turnNumber ?? '—'}</td>
                    <td>{t.netWeightKg ?? '—'}</td>
                    <td>
                      {t.status === 'arrived' ? (
                        <Link to={`/compras/pesaje?ticket=${encodeURIComponent(t.ticketKey)}`} className="btn btn-sm">
                          Ir a pesaje
                        </Link>
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
