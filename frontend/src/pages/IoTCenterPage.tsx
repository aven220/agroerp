import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getIotCenter, type IotCenter } from '../api/iot';
import { LoadingState } from '../components/ux/LoadingState';

export function IoTCenterPage() {
  const [center, setCenter] = useState<IotCenter | null>(null);
  useEffect(() => { getIotCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando dispositivos conectados..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Dispositivos y sensores"
        subtitle="Telemetría, alertas y firmware de equipos en campo"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Dispositivos', to: '/iot/dispositivos' }}
            moreActions={[
              { label: 'Mapa', to: '/iot/mapa' },
              { label: 'Telemetría', to: '/iot/telemetria' },
              { label: 'Alertas', to: '/iot/alertas' },
              { label: 'Firmware', to: '/iot/firmware' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Dispositivos" value={d.totalDevices} tone="blue" />
          <MetricCard label="Activos" value={d.activeDevices} tone="green" />
          <MetricCard label="Offline" value={d.offlineDevices} />
          <MetricCard label="Lecturas 24h" value={d.readings24h} />
          <MetricCard label="Alertas abiertas" value={d.alertsOpen} />
          <MetricCard label="Gateways online" value={d.gatewaysOnline} />
        </PageSummary>
        {center.suggestions.length > 0 ? (
          <PageSection title="Análisis IA">
            <table className="data-table data-table-compact">
              <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
              <tbody>
                {center.suggestions.map((s, i) => (
                  <tr key={i}>
                    <td>{String((s as { type?: string }).type ?? '')}</td>
                    <td>{String((s as { recommendation?: string }).recommendation ?? JSON.stringify(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        ) : null}
      </PageLayout>
    </>
  );
}
