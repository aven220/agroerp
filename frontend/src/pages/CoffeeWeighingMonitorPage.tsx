import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { getWeighingMonitor, syncWeighingContingency } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';
import { useIsMounted } from '../hooks/useIsMounted';
import { useOnEntityUpdated } from '../lib/entitySync';
import { labelTicketStatus } from '../lib/productLabels';

export function CoffeeWeighingMonitorPage() {
  const mounted = useIsMounted();
  const [monitor, setMonitor] = useState<Record<string, unknown> | null>(null);

  const reload = () =>
    getWeighingMonitor().then((data) => {
      if (mounted.current) setMonitor(data);
    });

  useEffect(() => {
    reload().catch(() => undefined);
    const t = setInterval(() => reload().catch(() => undefined), 3000);
    return () => clearInterval(t);
  }, [mounted]);

  useOnEntityUpdated(() => {
    reload().catch(() => undefined);
  }, ['purchase', 'inventory']);

  if (!monitor) return <LoadingState variant="page" message="Cargando monitor de pesaje…" />;

  const summary = (monitor.summary ?? {}) as Record<string, number>;
  const scales = (monitor.scales ?? []) as Array<Record<string, unknown>>;
  const sessions = (monitor.activeSessions ?? []) as Array<Record<string, unknown>>;
  const alerts = (monitor.alerts ?? []) as Array<Record<string, unknown>>;
  const readings = (monitor.recentReadings ?? []) as Array<Record<string, unknown>>;

  const scaleData = scales.map((s) => withRowId(s, 'id', 'scaleKey'));
  const sessionData = sessions.map((s) => withRowId(s, 'id', 'sessionKey', 'weighingNumber'));
  const readingData = readings.map((r, i) =>
    withRowId({ ...r, id: String(r.id ?? `reading-${i}`) } as Record<string, unknown>, 'id'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Monitor de pesaje en tiempo real"
        subtitle="Estado de balanzas, sesiones y lecturas"
        actions={
          <PageActions>
            <button type="button" className="btn" onClick={() => syncWeighingContingency().then(reload)}>
              Sincronizar contingencias
            </button>
            <Link to="/compras/pesaje" className="btn">Panel pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      <PageSummary>
        <MetricCard label="Balanzas disponibles" value={summary.availableScales ?? 0} />
        <MetricCard label="Ocupadas" value={summary.busyScales ?? 0} />
        <MetricCard label="Sesiones abiertas" value={summary.openSessions ?? 0} />
        <MetricCard label="Alertas" value={summary.openAlerts ?? 0} />
      </PageSummary>

      <PageSection title="Balanzas">
        <SimpleRecordsTable
          gridId="coffee-weighing-monitor-scales"
          selectable={false}
          data={scaleData}
          columns={[
            { key: 'name', label: 'Balanza', getValue: (r) => String(r.name) },
            { key: 'connectionType', label: 'Conexión', getValue: (r) => String(r.connectionType) },
            { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
            {
              key: 'lastWeightKg',
              label: 'Último peso',
              getValue: (r) => (r.lastWeightKg != null ? `${r.lastWeightKg} kg` : '—'),
            },
            {
              key: 'lastSeenAt',
              label: 'Última señal',
              getValue: (r) => (r.lastSeenAt ? new Date(String(r.lastSeenAt)).toLocaleTimeString() : '—'),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Sesiones activas">
        <SimpleRecordsTable
          gridId="coffee-weighing-monitor-sessions"
          selectable={false}
          data={sessionData}
          columns={[
            { key: 'weighingNumber', label: 'Número', getValue: (r) => String(r.weighingNumber) },
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            {
              key: 'producerName',
              label: 'Productor',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.producerName ?? ''),
            },
            {
              key: 'status',
              label: 'Estado',
              getValue: (r) => labelTicketStatus(String(r.status ?? '')),
            },
            {
              key: 'netWeightKg',
              label: 'Neto',
              getValue: (r) => (r.netWeightKg != null ? `${r.netWeightKg} kg` : '—'),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Lecturas recientes">
        <SimpleRecordsTable
          gridId="coffee-weighing-monitor-readings"
          selectable={false}
          data={readingData}
          columns={[
            { key: 'weighingType', label: 'Tipo', getValue: (r) => String(r.weighingType) },
            {
              key: 'weightKg',
              label: 'Peso',
              getValue: (r) => (r.weightKg != null ? `${r.weightKg} kg` : '—'),
            },
            { key: 'source', label: 'Fuente', getValue: (r) => String(r.source) },
            { key: 'isStable', label: 'Estable', getValue: (r) => (r.isStable ? 'Sí' : 'No') },
            {
              key: 'recordedAt',
              label: 'Hora',
              getValue: (r) => (r.recordedAt ? new Date(String(r.recordedAt)).toLocaleTimeString() : '—'),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Alertas abiertas">
        <ul>
          {alerts.map((a, i) => (
            <li key={i}>[{String(a.severity)}] {String(a.code)} — {String(a.message)}</li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
