import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getWizardState,
  listCoffeeFarms,
  listCoffeeLots,
  wizardAddPhoto,
  wizardArrival,
  wizardAssignTurn,
  wizardConfirm,
  wizardSearchProducers,
  wizardSetOrigin,
  wizardSetProducer,
  wizardSetVehicle,
  wizardToWeighing,
} from '../api/coffee';

const STEPS = [
  'Llegada',
  'Búsqueda',
  'Estado',
  'Permisos',
  'Origen',
  'Vehículo',
  'Fotos',
  'Turno',
  'Confirmación',
  'Pesaje',
];

export function CoffeeWizardPage() {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('document');
  const [ticketKey, setTicketKey] = useState('');
  const [producers, setProducers] = useState<Array<Record<string, unknown>>>([]);
  const [farms, setFarms] = useState<Array<Record<string, unknown>>>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);
  const [gate, setGate] = useState<Record<string, unknown> | null>(null);
  const [plate, setPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [message, setMessage] = useState('');

  const refreshState = async (key = ticketKey) => {
    if (!key) return;
    const state = await getWizardState(key);
    setGate((state.gate as Record<string, unknown>) ?? null);
    setStep(Math.max(0, Number((state.ticket as { wizardStep?: number })?.wizardStep ?? 1) - 1));
  };

  const start = async () => {
    const ticket = await wizardArrival({ searchMethod: method, producerName: query || undefined });
    setTicketKey(ticket.ticketKey);
    setStep(1);
    setMessage(`Ticket ${ticket.ticketKey} creado`);
  };

  const search = async () => {
    const rows = await wizardSearchProducers(query, method);
    setProducers(rows as Array<Record<string, unknown>>);
  };

  const selectProducer = async (producerId: string) => {
    const result = await wizardSetProducer(ticketKey, producerId) as { gate?: Record<string, unknown> };
    setGate(result.gate ?? null);
    const f = await listCoffeeFarms(producerId);
    setFarms(f as Array<Record<string, unknown>>);
    setStep(4);
  };

  const selectFarm = async (farmId: string) => {
    const l = await listCoffeeLots(farmId);
    setLots(l as Array<Record<string, unknown>>);
    await wizardSetOrigin(ticketKey, { farmId });
  };

  const selectLot = async (lotId: string, lotCode: string) => {
    await wizardSetOrigin(ticketKey, { lotId, lotCode });
    setStep(5);
  };

  return (
    <>
      <Header
        title="Wizard de recepción"
        subtitle="Ingreso guiado del productor"
        actions={<Link to="/compras/cola" className="btn">Cola</Link>}
      />
      <section className="panel">
        <div className="row-actions">
          {STEPS.map((s, i) => (
            <span key={s} className={`badge${i === step ? ' badge-primary' : ''}`}>{i + 1}. {s}</span>
          ))}
        </div>
        {message && <p>{message}</p>}
        {ticketKey && <p><strong>Ticket:</strong> {ticketKey}</p>}
      </section>

      {step === 0 && (
        <section className="panel">
          <button type="button" className="btn" onClick={start}>1. Registrar llegada</button>
        </section>
      )}

      {step >= 1 && step < 4 && (
        <section className="panel">
          <h3>2-4. Búsqueda y validación</h3>
          <div className="row-actions">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="document">Documento</option>
              <option value="code">Código</option>
              <option value="qr">QR</option>
              <option value="barcode">Barcode</option>
              <option value="nfc">NFC</option>
              <option value="name">Nombre</option>
            </select>
            <input placeholder="Buscar productor" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="button" className="btn" onClick={search}>Buscar</button>
          </div>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Código</th><th>Nombre</th><th>Documento</th><th></th></tr></thead>
            <tbody>
              {producers.map((p) => (
                <tr key={String(p.id)}>
                  <td>{String(p.producerCode)}</td>
                  <td>{String(p.producerName)}</td>
                  <td>{String(p.identityDoc ?? '')}</td>
                  <td><button type="button" className="btn btn-sm" onClick={() => selectProducer(String(p.id))}>Seleccionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {gate && (
            <div style={{ marginTop: 12 }}>
              <strong>{gate.allowed ? 'Permisos OK' : 'Bloqueos detectados'}</strong>
              <ul>
                {((gate.checks as Array<Record<string, unknown>>) ?? []).map((c, i) => (
                  <li key={i}>{String(c.message)} [{String(c.severity)}]</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {step >= 4 && step < 6 && (
        <section className="panel">
          <h3>5. Finca y lote</h3>
          <table className="data-table">
            <thead><tr><th>Finca</th><th></th></tr></thead>
            <tbody>
              {farms.map((f) => (
                <tr key={String(f.id)}>
                  <td>{String(f.farmName)}</td>
                  <td><button type="button" className="btn btn-sm" onClick={() => selectFarm(String(f.id))}>Ver lotes</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Lote</th><th></th></tr></thead>
            <tbody>
              {lots.map((l) => (
                <tr key={String(l.id)}>
                  <td>{String(l.lotCode)} — {String(l.lotName)}</td>
                  <td><button type="button" className="btn btn-sm" onClick={() => selectLot(String(l.id), String(l.lotCode))}>Usar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {step >= 5 && step < 8 && (
        <section className="panel">
          <h3>6-8. Vehículo, fotos y turno</h3>
          <div className="row-actions">
            <input placeholder="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <input placeholder="Conductor" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            <button type="button" className="btn" onClick={() => wizardSetVehicle(ticketKey, { plate, driverName, vehicleType: 'camion' }).then(() => setStep(6))}>Registrar vehículo</button>
            <button type="button" className="btn" onClick={() => wizardAddPhoto(ticketKey, { photoKey: `photo-${Date.now()}`, caption: 'Ingreso' }).then(() => setStep(7))}>Foto</button>
            <button type="button" className="btn" onClick={() => wizardAssignTurn(ticketKey).then(() => { setStep(8); setMessage('Turno asignado'); })}>Asignar turno auto</button>
            <button type="button" className="btn" onClick={() => wizardAssignTurn(ticketKey, { preferential: true, priority: 1 }).then(() => setStep(8))}>Turno preferencial</button>
          </div>
        </section>
      )}

      {step >= 8 && (
        <section className="panel">
          <h3>9-10. Confirmación y pesaje</h3>
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => wizardConfirm(ticketKey, { signerName: 'Productor', signatureData: 'signed' }).then(() => setStep(9))}>Confirmar ingreso</button>
            <button type="button" className="btn" onClick={() => wizardToWeighing(ticketKey).then(() => { setStep(9); setMessage('Enviado a pesaje'); refreshState(); })}>Enviar a pesaje</button>
          </div>
        </section>
      )}
    </>
  );
}
