import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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

  return (
    <>
      <Header
        title="Pesaje de café"
        subtitle="Flujo guiado, balanzas IoT y contingencia"
        actions={
          <>
            <Link to="/compras/balanzas" className="btn">Balanzas</Link>
            <Link to="/compras/pesaje/historial" className="btn">Historial</Link>
            <Link to="/compras/pesaje/monitor" className="btn">Monitor</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      <section className="panel grid-4">
        <div><strong>Disponibles</strong><div>{summary.availableScales ?? 0}</div></div>
        <div><strong>Ocupadas</strong><div>{summary.busyScales ?? 0}</div></div>
        <div><strong>Offline</strong><div>{summary.offlineScales ?? 0}</div></div>
        <div><strong>Alertas</strong><div>{summary.openAlerts ?? 0}</div></div>
      </section>

      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <h3>Cola de pesaje</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Productor</th>
              <th>Turno</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketKey}</td>
                <td>{t.producerName ?? '—'}</td>
                <td>{t.turnNumber ?? '—'}</td>
                <td>{t.status}</td>
                <td>
                  <button className="btn" disabled={busy} onClick={() => start(t.ticketKey)}>
                    Iniciar pesaje
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {session ? (
        <section className="panel">
          <h3>Sesión {String(session.weighingNumber ?? session.sessionKey)}</h3>
          <p>
            Ticket: <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor:{' '}
            <strong>{String(ticket?.producerName ?? '')}</strong> · Balanza:{' '}
            <strong>{String(scale?.name ?? scale?.scaleKey ?? '—')}</strong> · Estado:{' '}
            <strong>{String(session.status)}</strong>
          </p>
          <div className="grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
            {flow.map((s) => (
              <div
                key={String(s.key)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  background: s.current ? '#1f6feb33' : s.done ? '#2ea04333' : '#ffffff10',
                  fontSize: 12,
                }}
              >
                {String(s.step)}. {String(s.label)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div><strong>Bruto:</strong> {session.grossWeightKg != null ? `${session.grossWeightKg} kg` : '—'}</div>
            <div><strong>Tara:</strong> {session.tareWeightKg != null ? `${session.tareWeightKg} kg` : '—'}</div>
            <div><strong>Neto:</strong> {session.netWeightKg != null ? `${session.netWeightKg} kg` : '—'}</div>
            <div><strong>Fuente:</strong> {String(session.source)}</div>
            <div><strong>Estable:</strong> {session.stabilityOk ? 'Sí' : 'No'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" disabled={busy} onClick={captureGross}>Capturar bruto IoT</button>
            <button className="btn" disabled={busy} onClick={captureTare}>Capturar tara IoT</button>
            <button className="btn" disabled={busy} onClick={finish}>Validar y enviar a calidad</button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <label>
              Bruto manual
              <input value={manualGross} onChange={(e) => setManualGross(e.target.value)} />
            </label>
            <label>
              Tara manual
              <input value={manualTare} onChange={(e) => setManualTare(e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              Justificación contingencia
              <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }} />
            </label>
            <button className="btn" disabled={busy} onClick={contingencyManual}>
              Pesaje contingencia
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
