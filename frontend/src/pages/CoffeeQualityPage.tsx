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
  FieldGroup,
  FormActions,
  EmptyPanel,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
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
import { labelTicketStatus } from '../lib/productLabels';
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

  const gridRows = pending.map((t) => ({ ...t, id: t.id || t.ticketKey }));

  const columns: GridColumnDef<CoffeeTicket>[] = [
    { key: 'ticketKey', label: 'Ticket', getValue: (r) => r.ticketKey },
    { key: 'producerName', label: 'Productor', getValue: (r) => r.producerName ?? '—' },
    { key: 'lotCode', label: 'Lote', getValue: (r) => r.lotCode ?? '—' },
    {
      key: 'netWeightKg',
      label: 'Neto',
      getValue: (r) => (r.netWeightKg != null ? `${r.netWeightKg} kg` : '—'),
    },
    { key: 'status', label: 'Estado', render: (r) => labelTicketStatus(r.status) },
  ];

  const rowActions: RowAction<CoffeeTicket>[] = [
    {
      id: 'evaluate',
      label: 'Evaluar',
      onAction: (r) => {
        if (busy) return;
        start(r.ticketKey);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Control de calidad operativo"
        subtitle="Evaluación rápida, reglas y decisión de compra"
        actions={
          <PageActions>
            <Link to="/compras/calidad/historial" className="btn">Historial</Link>
            <Link to="/compras/calidad/fotos" className="btn">Fotografías</Link>
            <Link to="/compras/calidad/muestras" className="btn">Muestras</Link>
            <Link to="/compras/calidad/indicadores" className="btn">Indicadores</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      {indicators ? (
        <PageSummary>
          <MetricCard label="Pendientes" value={String(indicators.pending ?? 0)} tone="coffee" />
          <MetricCard label="Aceptados" value={String(indicators.accepted ?? 0)} tone="green" />
          <MetricCard label="Rechazados" value={String(indicators.rejected ?? 0)} />
          <MetricCard label="Alertas" value={String(indicators.openAlerts ?? 0)} />
        </PageSummary>
      ) : null}

      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Cola de calidad (post-pesaje)">
        {pending.length === 0 ? (
          <EmptyPanel title="Sin tickets" description="No hay tickets pendientes de evaluación de calidad." />
        ) : (
          <EnterpriseDataGrid
            gridId="coffee-quality-queue"
            columns={columns}
            data={gridRows}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="No hay tickets pendientes de calidad."
          />
        )}
      </PageSection>

      {session ? (
        <PageSection title={`Sesión ${String(session.sessionKey)}`}>
          <p>
            Ticket <strong>{String(ticket?.ticketKey ?? '')}</strong> · Productor{' '}
            <strong>{String(ticket?.producerName ?? session.producerName ?? '')}</strong> · Lote{' '}
            <strong>{String(session.lotCode ?? ticket?.lotCode ?? '—')}</strong> · Estado{' '}
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

          <div className="form-grid">
            {Object.entries(params).map(([key, value]) => (
              <FieldGroup key={key} label={key}>
                <input
                  value={value}
                  onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                />
              </FieldGroup>
            ))}
          </div>

          <FormActions sticky={false}>
            <button className="btn" disabled={busy} onClick={captureAndEvaluate}>
              Capturar, evaluar y decidir
            </button>
          </FormActions>
          <div className="kpi-grid">
            <div><strong>Score:</strong> {session.qualityScore != null ? String(session.qualityScore) : '—'}</div>
            <div><strong>Decisión:</strong> {String(session.decision ?? '—')}</div>
            <div><strong>Bonos:</strong> {String(session.bonusesTotal ?? 0)}</div>
            <div><strong>Castigos:</strong> {String(session.penaltiesTotal ?? 0)}</div>
          </div>
          {session.decisionReason ? <p>{String(session.decisionReason)}</p> : null}
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
