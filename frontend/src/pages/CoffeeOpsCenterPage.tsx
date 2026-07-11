import { useEffect, useState } from 'react';
import { HubToolbar } from '../components/layout/HubToolbar';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { LoadingState } from '../components/ux/LoadingState';
import {
  acknowledgeOpsAlert,
  evaluateOpsAlerts,
  getOperationalDashboard,
} from '../api/coffee';
import { useIsMounted } from '../hooks/useIsMounted';
import { useOnEntityUpdated } from '../lib/entitySync';
import { labelTicketStatus } from '../lib/productLabels';

type AlertRow = Record<string, unknown> & { id: string };

export function CoffeeOpsCenterPage() {
  const mounted = useIsMounted();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const reload = () =>
    getOperationalDashboard().then((next) => {
      if (mounted.current) setData(next);
    });

  useEffect(() => {
    reload().catch(() => undefined);
    const t = setInterval(() => reload().catch(() => undefined), 15000);
    return () => clearInterval(t);
  }, [mounted]);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase', 'inventory']);

  if (!data) return <LoadingState variant="dashboard" message="Cargando operación de compras…" />;
  const ops = (data.operations ?? {}) as Record<string, unknown>;
  const alerts = (data.alerts ?? []) as Array<Record<string, unknown>>;
  const byHour = (ops.purchasesByHour ?? []) as Array<Record<string, unknown>>;
  const stages = (ops.stages ?? {}) as Record<string, number>;
  const liveQueue = (ops.liveQueue ?? []) as Array<Record<string, unknown>>;

  const alertData = alerts.map((a) => withRowId(a, 'id', 'alertKey'));
  const queueData = liveQueue.map((q) => withRowId(q, 'id', 'ticketKey'));

  const alertActions: RowAction<AlertRow>[] = [
    {
      id: 'ack',
      label: 'Ack',
      hidden: (r) => Boolean(r.acknowledged),
      onAction: (r) => {
        acknowledgeOpsAlert(String(r.alertKey)).then(reload);
      },
    },
  ];

  return (
    <PageLayout
      toolbar={
        <HubToolbar
          primaryAction={{ label: 'Ejecutivo', to: '/compras/ops/ejecutivo' }}
          moreActions={[
            { label: 'Analítica', to: '/compras/ops/analitica' },
            { label: 'Reportes', to: '/compras/ops/reportes' },
            { label: 'Centro', to: '/compras' },
            { label: 'Evaluar alertas', onClick: () => { evaluateOpsAlerts().then(reload); } },
          ]}
        />
      }
    >
      <PageHeader
        title="Centro de operaciones — Compras de café"
        subtitle="Monitoreo en tiempo real"
      />

      <PageSummary>
        <MetricCard label="Compras hoy" value={String(ops.purchasesToday ?? 0)} />
        <MetricCard label="Productores atendidos" value={String(ops.producersAttended ?? 0)} />
        <MetricCard label="En espera" value={String(ops.producersWaiting ?? 0)} />
        <MetricCard label="Turnos activos" value={String(ops.activeTurns ?? 0)} />
        <MetricCard label="Atención prom. (min)" value={String(ops.avgAttentionMinutes ?? 0)} />
        <MetricCard label="Pesaje prom. (min)" value={String(ops.avgWeighingMinutes ?? 0)} />
        <MetricCard label="Calidad prom. (min)" value={String(ops.avgQualityMinutes ?? 0)} />
        <MetricCard label="Liquidación prom. (min)" value={String(ops.avgSettlementMinutes ?? 0)} />
        <MetricCard label="Proceso total (min)" value={String(ops.avgTotalProcessMinutes ?? 0)} />
        <MetricCard label="Kg hoy" value={Number(ops.kgToday ?? 0).toFixed(0)} />
        <MetricCard label="Valor hoy" value={Number(ops.amountToday ?? 0).toLocaleString()} />
      </PageSummary>

      <PageSection title="Compras por hora">
        <div className="spark-chart">
          {byHour.map((h) => (
            <div key={String(h.hour)} className="spark-chart-col">
              <div className="spark-bar" style={{ height: Math.max(8, Number(h.count) * 12) }} />
              <small>{String(h.hour)}</small>
              <div>{String(h.count)}</div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSummary>
        <MetricCard label="Recepción" value={stages.reception ?? 0} />
        <MetricCard label="Pesaje" value={stages.weighing ?? 0} />
        <MetricCard label="Calidad" value={stages.quality ?? 0} />
        <MetricCard label="Liquidación" value={stages.settlement ?? 0} />
        <MetricCard label="Inventario" value={stages.inventory ?? 0} />
        <MetricCard label="Rechazados" value={stages.rejected ?? 0} />
      </PageSummary>

      <PageSection title="Alertas">
        <SimpleRecordsTable
          gridId="coffee-ops-alerts"
          selectable={false}
          data={alertData}
          columns={[
            { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity) },
            { key: 'alertType', label: 'Tipo', getValue: (r) => String(r.alertType) },
            { key: 'title', label: 'Título', getValue: (r) => String(r.title) },
            { key: 'message', label: 'Mensaje', getValue: (r) => String(r.message) },
            {
              key: 'ackStatus',
              label: 'Estado',
              getValue: (r) => (r.acknowledged ? 'Atendida' : 'Pendiente'),
            },
          ]}
          rowActions={alertActions}
        />
      </PageSection>

      <PageSection title="Cola en vivo">
        <SimpleRecordsTable
          gridId="coffee-ops-live-queue"
          selectable={false}
          data={queueData}
          columns={[
            { key: 'ticketKey', label: 'Ticket', getValue: (r) => String(r.ticketKey) },
            { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName ?? '—') },
            { key: 'turnNumber', label: 'Turno', getValue: (r) => String(r.turnNumber ?? '—') },
            {
              key: 'status',
              label: 'Estado',
              getValue: (r) => labelTicketStatus(String(r.status ?? '')),
            },
            { key: 'waitMinutes', label: 'Espera (min)', getValue: (r) => String(r.waitMinutes ?? '—') },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
