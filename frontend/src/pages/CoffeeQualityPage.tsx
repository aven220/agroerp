import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getQualityIndicators,
  getQualitySession,
  listQualityPending,
  qualityAddPhoto,
  qualityDecide,
  qualityEvaluate,
  qualityIdentifyLot,
  qualityRecordParameters,
  qualityRegisterSample,
  startQualitySession,
  type CoffeeTicket,
} from '../api/coffee';
import { notifyEntityUpdated, useOnEntityUpdated } from '../lib/entitySync';

const emptyParams = {
  humidityPct: '11.2',
  temperatureC: '22',
  factor: '92',
  pasillaPct: '1.1',
  brocaPct: '0.4',
  blackBeansPct: '0.3',
  vinegarBeansPct: '0.1',
  brokenBeansPct: '0.8',
  foreignMatterPct: '0.1',
  impuritiesPct: '0.2',
  color: 'verde oliva',
  odor: 'limpio',
  observations: '',
  inspectorComments: '',
};

export function CoffeeQualityPage() {
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<CoffeeTicket[]>([]);
  const [indicators, setIndicators] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [params, setParams] = useState(emptyParams);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [p, i] = await Promise.all([listQualityPending(), getQualityIndicators()]);
    setPending(p);
    setIndicators(i);
  };

  useEffect(() => {
    reload().catch(() => undefined);
    const ticket = searchParams.get('ticket');
    if (ticket) {
      startQualitySession(ticket)
        .then(async (s) => {
          const ticketData = s.ticket as Record<string, unknown> | undefined;
          await qualityIdentifyLot(String(s.sessionKey), {
            lotCode: ticketData?.lotCode,
            farmName: ticketData?.farmName,
          });
          setSession(await getQualitySession(String(s.sessionKey)));
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Error iniciando calidad'));
    }
  }, [searchParams]);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase']);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de calidad');
    } finally {
      setBusy(false);
    }
  };

  const start = (ticketKey: string) =>
    run(async () => {
      const s = await startQualitySession(ticketKey);
      const ticketData = s.ticket as Record<string, unknown> | undefined;
      await qualityIdentifyLot(String(s.sessionKey), {
        lotCode: ticketData?.lotCode,
        farmName: ticketData?.farmName,
      });
      await qualityRegisterSample(String(s.sessionKey), { weightGrams: 250, physicalLocation: 'Mesa calidad' });
      return getQualitySession(String(s.sessionKey));
    });

  const captureAndEvaluate = () =>
    run(async () => {
      const key = String(session?.sessionKey);
      await qualityAddPhoto(key, {
        photoKey: `quality-${Date.now()}`,
        storageUrl: `photo://quality-${Date.now()}`,
        caption: 'Muestra calidad',
      });
      await qualityRecordParameters(key, {
        humidityPct: Number(params.humidityPct),
        temperatureC: Number(params.temperatureC),
        factor: Number(params.factor),
        pasillaPct: Number(params.pasillaPct),
        brocaPct: Number(params.brocaPct),
        blackBeansPct: Number(params.blackBeansPct),
        vinegarBeansPct: Number(params.vinegarBeansPct),
        brokenBeansPct: Number(params.brokenBeansPct),
        foreignMatterPct: Number(params.foreignMatterPct),
        impuritiesPct: Number(params.impuritiesPct),
        color: params.color,
        odor: params.odor,
        observations: params.observations,
        inspectorComments: params.inspectorComments,
      });
      await qualityEvaluate(key);
      return qualityDecide(key);
    });

  const flow = (session?.flow ?? []) as Array<Record<string, unknown>>;
  const ticket = session?.ticket as Record<string, unknown> | undefined;

  return (
    <>
      <Header
        title="Control de calidad operativo"
        subtitle="Evaluación rápida, reglas y decisión de compra"
        actions={
          <>
            <Link to="/compras/calidad/historial" className="btn">Historial</Link>
            <Link to="/compras/calidad/fotos" className="btn">Fotografías</Link>
            <Link to="/compras/calidad/muestras" className="btn">Muestras</Link>
            <Link to="/compras/calidad/indicadores" className="btn">Indicadores</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </>
        }
      />

      {indicators ? (
        <section className="panel grid-4">
          <div><strong>Pendientes</strong><div>{String(indicators.pending ?? 0)}</div></div>
          <div><strong>Aceptados</strong><div>{String(indicators.accepted ?? 0)}</div></div>
          <div><strong>Rechazados</strong><div>{String(indicators.rejected ?? 0)}</div></div>
          <div><strong>Alertas</strong><div>{String(indicators.openAlerts ?? 0)}</div></div>
        </section>
      ) : null}

      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <h3>Cola de calidad (post-pesaje)</h3>
        <table className="data-table">
          <thead>
            <tr><th>Ticket</th><th>Productor</th><th>Lote</th><th>Neto</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {pending.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketKey}</td>
                <td>{t.producerName ?? '—'}</td>
                <td>{t.lotCode ?? '—'}</td>
                <td>{t.netWeightKg != null ? `${t.netWeightKg} kg` : '—'}</td>
                <td>{t.status}</td>
                <td><button className="btn" disabled={busy} onClick={() => start(t.ticketKey)}>Evaluar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {session ? (
        <section className="panel">
          <h3>Sesión {String(session.sessionKey)}</h3>
          <p>
            Ticket <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor{' '}
            <strong>{String(ticket?.producerName ?? session.producerName ?? '')}</strong> · Lote{' '}
            <strong>{String(session.lotCode ?? ticket?.lotCode ?? '—')}</strong> · Estado{' '}
            <strong>{String(session.status)}</strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.entries(params).map(([key, value]) => (
              <label key={key}>
                {key}
                <input
                  value={value}
                  onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                  style={{ width: '100%' }}
                />
              </label>
            ))}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" disabled={busy} onClick={captureAndEvaluate}>
              Capturar, evaluar y decidir
            </button>
            <div><strong>Score:</strong> {session.qualityScore != null ? String(session.qualityScore) : '—'}</div>
            <div><strong>Decisión:</strong> {String(session.decision ?? '—')}</div>
            <div><strong>Bonos:</strong> {String(session.bonusesTotal ?? 0)}</div>
            <div><strong>Castigos:</strong> {String(session.penaltiesTotal ?? 0)}</div>
          </div>
          {session.decisionReason ? <p>{String(session.decisionReason)}</p> : null}
        </section>
      ) : null}
    </>
  );
}
