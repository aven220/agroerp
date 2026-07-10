import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  PageToolbar,
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
import {
  captureWeighingReading,
  confirmWeighingGross,
  confirmWeighingSession,
  confirmWeighingTare,
  enableWeighingContingency,
  getWeighingMonitor,
  getWeighingSession,
  listWeighingPending,
  manualWeighingCapture,
  sendWeighingToQuality,
  startWeighingSession,
  validateWeighingSession,
  verifyWeighingScale,
  type CoffeeTicket,
} from '../api/coffee';
import { labelTicketStatus } from '../lib/productLabels';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';
import { useIsMounted } from '../hooks/useIsMounted';

export function CoffeeWeighingPage() {
  const mounted = useIsMounted();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<CoffeeTicket[]>([]);
  const [monitor, setMonitor] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [manualGross, setManualGross] = useState('');
  const [manualTare, setManualTare] = useState('');
  const [reason, setReason] = useState('Balanza desconectada — contingencia operativa');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [p, m] = await Promise.all([listWeighingPending(), getWeighingMonitor()]);
    if (!mounted.current) return;
    setPending(p);
    setMonitor(m);
  };

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase', 'inventory']);

  useEffect(() => {
    reload().catch(() => undefined);
    const ticketFromQuery = searchParams.get('ticket');
    if (ticketFromQuery) {
      startWeighingSession(ticketFromQuery)
        .then(async (s) => {
          try {
            await verifyWeighingScale(String(s.sessionKey));
          } catch {
            // allow contingency path if scale verify fails
          }
          setSession(await getWeighingSession(String(s.sessionKey)));
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo iniciar pesaje'));
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setInterval(() => {
      reload().catch(() => undefined);
      if (session?.sessionKey) {
        getWeighingSession(String(session.sessionKey))
          .then((s) => {
            if (mounted.current) setSession(s);
          })
          .catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [session?.sessionKey, mounted]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      if (result && typeof result === 'object' && 'sessionKey' in (result as object)) {
        setSession(result as Record<string, unknown>);
      }
      await reload();
      const ticketKey = String(
        (session?.ticket as Record<string, unknown> | undefined)?.ticketKey ??
          searchParams.get('ticket') ??
          '*',
      );
      notifyEntityUpdated('purchase', ticketKey);
      notifyEntityUpdated('inventory', '*');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de pesaje');
    } finally {
      setBusy(false);
    }
  };

  const start = (ticketKey: string) =>
    run(async () => {
      const s = await startWeighingSession(ticketKey);
      await verifyWeighingScale(String(s.sessionKey));
      return getWeighingSession(String(s.sessionKey));
    });

  const captureGross = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await captureWeighingReading(key, { weighingType: 'gross', freeze: true, average: true });
      await confirmWeighingGross(key);
      return getWeighingSession(key);
    });

  const captureTare = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await captureWeighingReading(key, { weighingType: 'tare', freeze: true, average: true });
      await confirmWeighingTare(key);
      return getWeighingSession(key);
    });

  const finish = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await validateWeighingSession(key);
      await confirmWeighingSession(key);
      return sendWeighingToQuality(key);
    });

  const contingencyManual = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await enableWeighingContingency(key, reason);
      await manualWeighingCapture(key, {
        weighingType: 'gross',
        weightKg: Number(manualGross),
        reason,
        photoUrl: `photo://weighing-${Date.now()}`,
      });
      await confirmWeighingGross(key);
      await manualWeighingCapture(key, {
        weighingType: 'tare',
        weightKg: Number(manualTare),
        reason,
      });
      await confirmWeighingTare(key);
      await validateWeighingSession(key);
      await confirmWeighingSession(key);
      return sendWeighingToQuality(key);
    });

  const summary = (monitor?.summary ?? {}) as Record<string, number>;
  const flow = (session?.flow ?? []) as Array<Record<string, unknown>>;
  const ticket = session?.ticket as Record<string, unknown> | undefined;
  const scale = session?.scale as Record<string, unknown> | undefined;

  const gridRows = pending.map((t) => ({ ...t, id: t.id || t.ticketKey }));

  const columns: GridColumnDef<CoffeeTicket>[] = [
    { key: 'ticketKey', label: 'Ticket', getValue: (r) => r.ticketKey },
    { key: 'producerName', label: 'Productor', getValue: (r) => r.producerName ?? '—' },
    { key: 'turnNumber', label: 'Turno', getValue: (r) => r.turnNumber ?? '—' },
    { key: 'status', label: 'Estado', render: (r) => labelTicketStatus(r.status) },
  ];

  const rowActions: RowAction<CoffeeTicket>[] = [
    {
      id: 'start-weighing',
      label: 'Iniciar pesaje',
      onAction: (r) => {
        if (busy) return;
        start(r.ticketKey);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Pesaje de café"
        subtitle="Flujo guiado, balanzas IoT y contingencia"
        actions={
          <PageActions>
            <Link to="/compras/balanzas" className="btn">Balanzas</Link>
            <Link to="/compras/pesaje/historial" className="btn">Historial</Link>
            <Link to="/compras/pesaje/monitor" className="btn">Monitor</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      <PageSummary>
        <MetricCard label="Disponibles" value={summary.availableScales ?? 0} tone="green" />
        <MetricCard label="Ocupadas" value={summary.busyScales ?? 0} tone="blue" />
        <MetricCard label="Offline" value={summary.offlineScales ?? 0} tone="coffee" />
        <MetricCard label="Alertas" value={summary.openAlerts ?? 0} />
      </PageSummary>

      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Cola de pesaje">
        {pending.length === 0 ? (
          <EmptyPanel title="Sin tickets pendientes" description="No hay tickets en cola de pesaje." />
        ) : (
          <EnterpriseDataGrid
            gridId="coffee-weighing-queue"
            columns={columns}
            data={gridRows}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="No hay tickets en cola de pesaje."
          />
        )}
      </PageSection>

      {session ? (
        <PageSection title={`Sesión ${String(session.weighingNumber ?? session.sessionKey)}`}>
          <p>
            Ticket: <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor:{' '}
            <strong>{String(ticket?.producerName ?? '')}</strong> · Balanza:{' '}
            <strong>{String(scale?.name ?? scale?.scaleKey ?? '—')}</strong> · Estado:{' '}
            <strong>{String(session.status)}</strong>
          </p>
          <div className="kpi-grid">
            {flow.map((s) => (
              <div
                key={String(s.key)}
                className={`kpi-card ${s.current ? 'kpi-blue' : s.done ? 'kpi-green' : ''}`}
              >
                <span className="kpi-label">{String(s.step)}. {String(s.label)}</span>
              </div>
            ))}
          </div>
          <div className="kpi-grid">
            <div><strong>Bruto:</strong> {session.grossWeightKg != null ? `${session.grossWeightKg} kg` : '—'}</div>
            <div><strong>Tara:</strong> {session.tareWeightKg != null ? `${session.tareWeightKg} kg` : '—'}</div>
            <div><strong>Neto:</strong> {session.netWeightKg != null ? `${session.netWeightKg} kg` : '—'}</div>
            <div><strong>Fuente:</strong> {String(session.source)}</div>
            <div><strong>Estable:</strong> {session.stabilityOk ? 'Sí' : 'No'}</div>
          </div>
          <FormActions sticky={false}>
            <button className="btn" disabled={busy} onClick={captureGross}>Capturar bruto IoT</button>
            <button className="btn" disabled={busy} onClick={captureTare}>Capturar tara IoT</button>
            <button className="btn" disabled={busy} onClick={finish}>Validar y enviar a calidad</button>
          </FormActions>
          <PageToolbar>
            <FieldGroup label="Bruto manual">
              <input value={manualGross} onChange={(e) => setManualGross(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Tara manual">
              <input value={manualTare} onChange={(e) => setManualTare(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Justificación contingencia">
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </FieldGroup>
          </PageToolbar>
          <FormActions sticky={false}>
            <button className="btn" disabled={busy} onClick={contingencyManual}>
              Pesaje contingencia
            </button>
          </FormActions>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
