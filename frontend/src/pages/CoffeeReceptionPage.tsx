import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  assignCoffeeTurn,
  createCoffeeTicket,
  listCoffeeScales,
  listCoffeeTickets,
  postCoffeeInventory,
  recordCoffeeQuality,
  searchCoffeeProducers,
  settleCoffeeTicket,
  validateCoffeeIdentity,
  weighCoffeeIot,
  weighCoffeeTicket,
  type CoffeeTicket,
} from '../api/coffee';

export function CoffeeReceptionPage() {
  const [tickets, setTickets] = useState<CoffeeTicket[]>([]);
  const [producerName, setProducerName] = useState('');
  const [identityDoc, setIdentityDoc] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [producerId, setProducerId] = useState('');
  const [scales, setScales] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => listCoffeeTickets().then(setTickets);
  useEffect(() => {
    reload();
    listCoffeeScales().then((s) => setScales(s as Array<Record<string, unknown>>)).catch(() => setScales([]));
  }, []);

  const create = async () => {
    let resolvedProducerId = producerId;
    let resolvedName = producerName;
    let resolvedDoc = identityDoc;
    if (!resolvedProducerId && producerName) {
      const found = await searchCoffeeProducers(producerName) as Array<Record<string, unknown>>;
      if (found[0]) {
        resolvedProducerId = String(found[0].id);
        resolvedName = String(found[0].producerName ?? producerName);
        resolvedDoc = String(found[0].identityDoc ?? identityDoc);
        setProducerId(resolvedProducerId);
      }
    }
    await createCoffeeTicket({
      producerId: resolvedProducerId || undefined,
      producerName: resolvedName || 'Productor demo',
      identityDoc: resolvedDoc || 'CC-000',
      vehiclePlate: vehiclePlate || 'ABC123',
      farmName: 'Finca demo',
      lotCode: `LOT-${Date.now().toString().slice(-6)}`,
    });
    setProducerName('');
    reload();
  };

  const runFlow = async (t: CoffeeTicket) => {
    await validateCoffeeIdentity(t.ticketKey);
    await assignCoffeeTurn(t.ticketKey);
    const scaleKey = scales[0] ? String(scales[0].deviceKey) : null;
    if (scaleKey) {
      await weighCoffeeIot(t.ticketKey, scaleKey, 'gross');
      await weighCoffeeTicket(t.ticketKey, { tareWeightKg: 250, source: 'manual' });
    } else {
      await weighCoffeeTicket(t.ticketKey, { grossWeightKg: 1250, tareWeightKg: 250, source: 'manual' });
    }
    await recordCoffeeQuality(t.ticketKey, {
      humidityPct: 11.5, factor: 92, pasillaPct: 1.2, brocaPct: 0.4, defectsPct: 2, grade: 'premium', color: 'verde', odor: 'limpio',
    });
    await settleCoffeeTicket(t.ticketKey, { basePricePerKg: 12000, transportTotal: 50000, paidAmount: 0 });
    await postCoffeeInventory(t.ticketKey);
    reload();
  };

  return (
    <>
      <Header title="Recepción de café" subtitle="Llegada, identidad, pesaje, calidad, liquidación" actions={<Link to="/compras" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Nueva recepción</h3>
        <div className="row-actions">
          <input placeholder="Productor" value={producerName} onChange={(e) => setProducerName(e.target.value)} />
          <input placeholder="Documento" value={identityDoc} onChange={(e) => setIdentityDoc(e.target.value)} />
          <input placeholder="Placa" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
          <button type="button" className="btn" onClick={create}>Registrar llegada</button>
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
                    <button type="button" className="btn btn-sm" onClick={() => runFlow(t)}>Procesar flujo</button>
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
