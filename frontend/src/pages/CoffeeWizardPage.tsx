import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
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

type ProducerRow = Record<string, unknown> & { id: string };
type FarmRow = Record<string, unknown> & { id: string };
type LotRow = Record<string, unknown> & { id: string };

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
    setMessage(`Recepción iniciada — ticket ${ticket.ticketKey}`);
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

  const producerData = producers.map((p) => withRowId(p, 'id', 'producerCode'));
  const farmData = farms.map((f) => withRowId(f, 'id', 'farmCode'));
  const lotData = lots.map((l) => withRowId(l, 'id', 'lotCode'));

  const producerActions: RowAction<ProducerRow>[] = [
    {
      id: 'select',
      label: 'Seleccionar',
      onAction: (r) => {
        selectProducer(String(r.id));
      },
    },
  ];

  const farmActions: RowAction<FarmRow>[] = [
    {
      id: 'lots',
      label: 'Ver lotes',
      onAction: (r) => {
        selectFarm(String(r.id));
      },
    },
  ];

  const lotActions: RowAction<LotRow>[] = [
    {
      id: 'use',
      label: 'Usar',
      onAction: (r) => {
        selectLot(String(r.id), String(r.lotCode));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Asistente de recepción de café"
        subtitle="Siga los pasos: llegada → productor → origen → pesaje → confirmación"
        actions={
          <PageActions>
            <Link to="/compras/cola" className="btn">Ver cola</Link>
          </PageActions>
        }
      />

      <FlowProgress flowId="purchases" currentStepId="wizard" />

      <FlowNextActions
        title="Después de la recepción"
        subtitle="Continúe el flujo de compra sin volver al menú."
        actions={[
          { label: 'Ir a pesaje', description: 'Registre el peso del café recibido', to: '/compras/pesaje', icon: '⚖️' },
          { label: 'Control de calidad', description: 'Evalúe muestras y fotos', to: '/compras/calidad', icon: '🔬' },
          { label: 'Liquidaciones', description: 'Cierre la compra con el productor', to: '/compras/liquidaciones', icon: '💰' },
        ]}
      />
      <PageSection>
        <div className="row-actions">
          {STEPS.map((s, i) => (
            <span key={s} className={`badge${i === step ? ' badge-primary' : ''}`}>{i + 1}. {s}</span>
          ))}
        </div>
        {message && <p>{message}</p>}
        {ticketKey && <p><strong>Ticket:</strong> {ticketKey}</p>}
      </PageSection>

      {step === 0 && (
        <PageSection>
          <FormActions>
            <button type="button" className="btn btn-primary" onClick={start}>1. Registrar llegada</button>
          </FormActions>
        </PageSection>
      )}

      {step >= 1 && step < 4 && (
        <PageSection title="2-4. Búsqueda y validación">
          <PageToolbar>
            <FieldGroup label="Método">
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="document">Documento</option>
                <option value="code">Código</option>
                <option value="qr">QR</option>
                <option value="barcode">Barcode</option>
                <option value="nfc">NFC</option>
                <option value="name">Nombre</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Buscar">
              <input placeholder="Buscar productor" value={query} onChange={(e) => setQuery(e.target.value)} />
            </FieldGroup>
          </PageToolbar>
          <FormActions>
            <button type="button" className="btn" onClick={search}>Buscar</button>
          </FormActions>
          <SimpleRecordsTable
            gridId="coffee-wizard-producers"
            selectable={false}
            data={producerData}
            columns={[
              { key: 'producerCode', label: 'Código', getValue: (r) => String(r.producerCode) },
              { key: 'producerName', label: 'Nombre', getValue: (r) => String(r.producerName) },
              { key: 'identityDoc', label: 'Documento', getValue: (r) => String(r.identityDoc ?? '') },
            ]}
            rowActions={producerActions}
          />
          {gate && (
            <div>
              <strong>{gate.allowed ? 'Permisos OK' : 'Bloqueos detectados'}</strong>
              <ul>
                {((gate.checks as Array<Record<string, unknown>>) ?? []).map((c, i) => (
                  <li key={i}>{String(c.message)} [{String(c.severity)}]</li>
                ))}
              </ul>
            </div>
          )}
        </PageSection>
      )}

      {step >= 4 && step < 6 && (
        <PageSection title="5. Finca y lote">
          <SimpleRecordsTable
            gridId="coffee-wizard-farms"
            selectable={false}
            data={farmData}
            columns={[
              { key: 'farmName', label: 'Finca', getValue: (r) => String(r.farmName) },
            ]}
            rowActions={farmActions}
          />
          <SimpleRecordsTable
            gridId="coffee-wizard-lots"
            selectable={false}
            data={lotData}
            columns={[
              {
                key: 'lot',
                label: 'Lote',
                getValue: (r) => `${String(r.lotCode)} — ${String(r.lotName)}`,
              },
            ]}
            rowActions={lotActions}
          />
        </PageSection>
      )}

      {step >= 5 && step < 8 && (
        <PageSection title="6-8. Vehículo, fotos y turno">
          <PageToolbar>
            <FieldGroup label="Placa">
              <input placeholder="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Conductor">
              <input placeholder="Conductor" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </FieldGroup>
          </PageToolbar>
          <FormActions>
            <button type="button" className="btn" onClick={() => wizardSetVehicle(ticketKey, { plate, driverName, vehicleType: 'camion' }).then(() => setStep(6))}>Registrar vehículo</button>
            <button type="button" className="btn" onClick={() => wizardAddPhoto(ticketKey, { photoKey: `photo-${Date.now()}`, caption: 'Ingreso' }).then(() => setStep(7))}>Foto</button>
            <button type="button" className="btn" onClick={() => wizardAssignTurn(ticketKey).then(() => { setStep(8); setMessage('Turno asignado'); })}>Asignar turno auto</button>
            <button type="button" className="btn" onClick={() => wizardAssignTurn(ticketKey, { preferential: true, priority: 1 }).then(() => setStep(8))}>Turno preferencial</button>
          </FormActions>
        </PageSection>
      )}

      {step >= 8 && (
        <PageSection title="9-10. Confirmación y pesaje">
          <FormActions>
            <button type="button" className="btn" onClick={() => wizardConfirm(ticketKey, { signerName: 'Productor', signatureData: 'signed' }).then(() => setStep(9))}>Confirmar ingreso</button>
            <button type="button" className="btn" onClick={() => wizardToWeighing(ticketKey).then(() => { setStep(9); setMessage('Enviado a pesaje'); refreshState(); })}>Enviar a pesaje</button>
          </FormActions>
        </PageSection>
      )}
    </PageLayout>
  );
}
