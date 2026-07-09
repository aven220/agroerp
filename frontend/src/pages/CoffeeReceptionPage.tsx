import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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
    <>
      <Header title="Recepción de café" subtitle="Llegada, identidad, pesaje, calidad, liquidación" actions={<Link to="/compras" className="btn">Centro</Link>} />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <h3>Nueva recepción</h3>
        <div className="row-actions">
          <input placeholder="Productor" value={producerName} onChange={(e) => setProducerName(e.target.value)} />
          <input placeholder="Documento" value={identityDoc} onChange={(e) => setIdentityDoc(e.target.value)} />
          <input placeholder="Placa" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
          <button type="button" className="btn" onClick={create} disabled={busy}>
            {busy ? 'Registrando…' : 'Registrar llegada'}
          </button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Ticket</th><th>Productor</th><th>Estado</th><th>Turno</th><th>Neto kg</th><th></th></tr></thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketKey}</td>
                <td>{t.producerName}</td>
                <td>{t.status}</td>
                <td>{t.turnNumber ?? '—'}</td>
                <td>{t.netWeightKg ?? '—'}</td>
                <td>
                  {t.status === 'arrived' && (
                    <Link to={`/compras/pesaje?ticket=${encodeURIComponent(t.ticketKey)}`} className="btn btn-sm">
                      Ir a pesaje
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
