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
  type SimpleColumn,
} from '../components/page';
import { getEneacDashboard, type EneacDashboard } from '../api/eneac';
import { LoadingState } from '../components/ux/LoadingState';

type CountRow = { id: string; label: string; count: number };

const countColumns: SimpleColumn<CountRow>[] = [
  { key: 'label', label: 'Clave', getValue: (r) => r.label },
  { key: 'count', label: 'Cantidad', getValue: (r) => r.count },
];

export function NotificationsDashboardPage() {
  const [dashboard, setDashboard] = useState<EneacDashboard | null>(null);

  useEffect(() => {
    getEneacDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return <LoadingState variant="dashboard" message="Cargando dashboard de notificaciones..." />;

  const bySeverity = dashboard.bySeverity.map((r) =>
    withRowId({ label: r.severity, count: r.count } as Record<string, unknown>, 'label') as CountRow,
  );
  const byChannel = dashboard.byChannel.map((r) =>
    withRowId({ label: r.channel, count: r.count } as Record<string, unknown>, 'label') as CountRow,
  );

  return (
    <PageLayout>
      <PageHeader
        title="Dashboard de notificaciones"
        subtitle="Indicadores de entrega y lectura"
        actions={
          <PageActions>
            <Link to="/notificaciones" className="btn">Bandeja</Link>
            <Link to="/notificaciones/eventos" className="btn">Timeline</Link>
            <Link to="/notificaciones/reglas" className="btn">Reglas</Link>
          </PageActions>
        }
      />

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="No leídas" value={dashboard.kpis.unread} tone="green" />
        <MetricCard label="Importantes" value={dashboard.kpis.important} />
        <MetricCard label="Entregadas (24h)" value={dashboard.kpis.deliveredLast24h} />
        <MetricCard label="Fallos entrega" value={dashboard.kpis.failedDeliveries} />
        <MetricCard label="Latencia prom. (ms)" value={Math.round(dashboard.kpis.avgDeliveryLatencyMs)} />
        <MetricCard label="Tiempo lectura (min)" value={dashboard.kpis.avgReadMinutes.toFixed(1)} />
        <MetricCard label="Tiempo atención (min)" value={dashboard.kpis.avgAttendMinutes.toFixed(1)} />
        <MetricCard label="Reglas activas" value={dashboard.kpis.activeRules} />
      </PageSummary>

      <div className="split-layout">
        <PageSection title="Por severidad (24h)">
          <SimpleRecordsTable
            gridId="notifications-by-severity"
            columns={countColumns}
            data={bySeverity}
            selectable={false}
            emptyMessage="Sin datos"
          />
        </PageSection>
        <PageSection title="Por canal (24h)">
          <SimpleRecordsTable
            gridId="notifications-by-channel"
            columns={countColumns}
            data={byChannel}
            selectable={false}
            emptyMessage="Sin datos"
          />
        </PageSection>
      </div>
    </PageLayout>
  );
}
